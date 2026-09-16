# GUIA_SUPABASE_SETUP.md

Guia de referência para implementar Login + Interações (Seguir, Favoritar, "Eu vou") usando Supabase gratuito, mantendo o padrão arquitetural atual do projeto (ES modules puros, sem build tools).

Este documento complementa `ARQUITETURA.md` e `DECISOES_DE_ARQUITETURA.md`. A camada de catálogo (Eventos/Marcas/Locais) continua em JSON — Supabase entra apenas para dados de usuário.

---

## 1. Setup do projeto (via dashboard, sem código)

1. Criar conta em supabase.com (gratuito, sem cartão)
2. Criar um novo projeto (escolher região mais próxima do público — provavelmente São Paulo)
3. Guardar dois valores do painel (Settings → API): `Project URL` e chave `anon public`
   - A chave `anon` é segura para expor no frontend — a segurança real vem das políticas de RLS (seção 3), não do sigilo da chave
4. Em Authentication → Providers, ativar o provider desejado (Google é o mais simples para o público-alvo)

## 2. Schema SQL (rodar no SQL Editor do dashboard)

```sql
-- Perfis: dados extras do usuário, além do que o Supabase Auth já guarda em auth.users
create table perfis (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text,
  avatar_url text,
  criado_em timestamptz default now()
);

-- Interações: tabela única e polimórfica (segue, favorito, vou, talvez)
create table interacoes (
  id uuid default gen_random_uuid() primary key,
  usuario_id uuid references auth.users(id) on delete cascade not null,
  entidade_tipo text not null check (entidade_tipo in ('marca', 'evento')),
  entidade_id text not null,
  tipo text not null check (tipo in ('segue', 'favorito', 'vou', 'talvez')),
  criado_em timestamptz default now(),
  ativo boolean default true,
  unique (usuario_id, entidade_tipo, entidade_id, tipo)
);
```

## 3. Row Level Security (RLS) — a segurança real do sistema

```sql
alter table perfis enable row level security;
alter table interacoes enable row level security;

-- Perfis
create policy "Usuario ve seu proprio perfil"
  on perfis for select using (auth.uid() = id);

create policy "Usuario edita seu proprio perfil"
  on perfis for update using (auth.uid() = id);

create policy "Usuario cria seu proprio perfil"
  on perfis for insert with check (auth.uid() = id);

-- Interações: leitura pública (necessária para contar "vou" e exibir em alta)
create policy "Interacoes sao publicas para leitura"
  on interacoes for select using (true);

create policy "Usuario so insere sua propria interacao"
  on interacoes for insert with check (auth.uid() = usuario_id);

create policy "Usuario so atualiza sua propria interacao"
  on interacoes for update using (auth.uid() = usuario_id);
```

Sem essas políticas, por padrão o Supabase bloqueia tudo. Com elas: qualquer visitante pode *ler* contagens de interação (necessário para mostrar "32 pessoas vão"), mas só o dono da linha pode criar ou alterar sua própria interação.

## 4. Client no frontend (padrão ES modules, sem npm)

`services/supabaseClient.js`
```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co'
const SUPABASE_ANON_KEY = 'sua-chave-anon-publica'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

## 5. Serviço de autenticação

`services/authService.js`
```js
import { supabase } from './supabaseClient.js'

export const authService = {
  async loginComGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) throw error
  },

  async logout() {
    await supabase.auth.signOut()
  },

  async usuarioAtual() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  onMudancaDeSessao(callback) {
    supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null)
    })
  }
}
```

## 6. Serviço de interações

`services/interacaoService.js`
```js
import { supabase } from './supabaseClient.js'
import { authService } from './authService.js'

export const interacaoService = {
  async seguirMarca(marcaId) {
    return this._criar('marca', marcaId, 'segue')
  },

  async favoritarEvento(eventoId) {
    return this._criar('evento', eventoId, 'favorito')
  },

  async marcarVou(eventoId) {
    return this._criar('evento', eventoId, 'vou')
  },

  async _criar(entidadeTipo, entidadeId, tipo) {
    const usuario = await authService.usuarioAtual()
    if (!usuario) throw new Error('LOGIN_NECESSARIO')

    const { error } = await supabase.from('interacoes').insert({
      usuario_id: usuario.id,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      tipo
    })
    if (error) throw error
  },

  async remover(entidadeTipo, entidadeId, tipo) {
    const usuario = await authService.usuarioAtual()
    if (!usuario) throw new Error('LOGIN_NECESSARIO')

    const { error } = await supabase
      .from('interacoes')
      .update({ ativo: false })
      .match({ usuario_id: usuario.id, entidade_tipo: entidadeTipo, entidade_id: entidadeId, tipo })
    if (error) throw error
  },

  async contar(entidadeTipo, entidadeId, tipo) {
    const { count, error } = await supabase
      .from('interacoes')
      .select('*', { count: 'exact', head: true })
      .match({ entidade_tipo: entidadeTipo, entidade_id: entidadeId, tipo, ativo: true })
    if (error) throw error
    return count
  }
}
```

## 7. Exemplo de uso numa página

```js
import { interacaoService } from '../services/interacaoService.js'

botaoVou.addEventListener('click', async () => {
  try {
    await interacaoService.marcarVou(eventoId)
    botaoVou.textContent = 'Você vai! 🎉'
  } catch (erro) {
    if (erro.message === 'LOGIN_NECESSARIO') {
      abrirModalLogin()
    }
  }
})
```

## 8. Limites do plano gratuito a ter em mente

- 500 MB de banco de dados, 1 GB de armazenamento de arquivos, 5 GB de egress, 50.000 usuários ativos mensais, até 2 projetos ativos
- Sem backups automáticos nem SLA no plano free
- Projeto pausa automaticamente após 7 dias sem requisições de API — reativa manualmente pelo dashboard quando isso acontecer (deixa de ser um risco assim que houver tráfego real diário)

## 9. Próximos passos (quando for implementar)

1. Criar o projeto e rodar o SQL das seções 2 e 3
2. Adicionar os três arquivos de service (seções 4–6) seguindo o padrão de camadas já usado no projeto
3. Criar um `AuthContext`/estado simples para refletir login/logout na UI (ex: mostrar avatar vs botão "Entrar" no topo)
4. Adicionar contagem de "vou"/"favoritos" na página de evento, usando `interacaoService.contar()`
5. Testar RLS diretamente no SQL Editor antes de confiar no client (tentar inserir com `usuario_id` de outro usuário deve falhar)
