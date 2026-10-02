# GUIA_SUPABASE_SETUP.md

Guia de referência para Login + dados de usuário usando Supabase, mantendo o
padrão arquitetural do projeto (ES modules puros, sem build tools).

Este documento complementa `docs/ARQUITETURA.md` e `docs/DECISOES_DE_ARQUITETURA.md`.
A camada de catálogo (Eventos/Marcas/Locais) continua em JSON — Supabase entra
apenas para dados de usuário.

**Status atual:** Login (Google + Magic Link) e Perfil — **implementados e em
produção**. Interações (favoritar/seguir) — desenhadas abaixo, mas a tabela
**ainda não foi criada** no Supabase; existe só como código em
`services/interacaoService.js`, não conectado a nenhuma página ainda.

---

## 1. Setup do projeto (via dashboard, sem código)

1. Criar conta em supabase.com (gratuito, sem cartão)
2. Criar um novo projeto (região `sa-east-1` / São Paulo)
3. Guardar dois valores do painel (Settings → API): `Project URL` e chave `anon public`
   - A chave `anon` é segura para expor no frontend — a segurança real vem das políticas de RLS (seção 3), não do sigilo da chave
4. Em Authentication → Providers, ativar Google (e Email, para Magic Link)

## 1.1. Site URL / Redirect URLs — **PASSO OBRIGATÓRIO, fácil de esquecer**

Em Authentication → URL Configuration:

- **Site URL**: a URL de produção do site (ex: `https://usuario.github.io/repo`)
- **Redirect URLs** (lista de padrões permitidos): precisa incluir TODO ambiente
  onde o login vai ser testado, com `/**` no final:
  - `https://usuario.github.io/repo/**` (produção)
  - `http://localhost:8000/**` (dev local — ajuste a porta pro seu ambiente)

**Por que isso importa tanto:** se a URL de retorno que o app pede
(`redirectTo` em `authService.js`) não bater com nenhum padrão dessa lista, o
Supabase **ignora silenciosamente** o valor pedido e usa o Site URL — sem
erro nenhum, sem aviso. Isso causou, numa sessão real deste projeto, três
sintomas que pareciam bugs completamente diferentes (foto não subia, dados
não persistiam entre logins, login quebrava em produção) quando a causa era
essa única configuração nunca ajustada do valor padrão de fábrica
(`http://localhost:3000`). Ver `docs/DECISOES_DE_ARQUITETURA.md` (2026-09-29).

## 2. Schema SQL — Perfis (✅ implementado)

O SQL completo e atualizado está em `sql/perfis.sql` — rode esse arquivo, não
o resumo abaixo (ele cresceu bastante: Nome, Sobrenome, apelido, avatar_url,
Cidade/Estado/País, Instagram, telefone, bio, data de nascimento, gênero, mais
um gatilho que cria a linha automaticamente no primeiro login com os dados do
Google, e um bucket de Storage pra foto de perfil).

Resumo conceitual:
```sql
create table perfis (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text, sobrenome text, apelido text, avatar_url text,
  cidade text, estado text, pais text, instagram text, telefone text, bio text,
  data_nascimento date, genero text,
  criado_em timestamptz default now(), atualizado_em timestamptz default now()
);
```

Note que **não há coluna de e-mail** em `perfis` — ele é sempre lido de
`auth.users` (a sessão), nunca duplicado (ver `docs/MODELO_DE_DADOS.md`).

## 2.1. Schema SQL — Interações (⏳ desenhado, NÃO implementado ainda)

```sql
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

Isso ainda não foi rodado no Supabase. É o item 1 dos "Próximos passos" do
`ROADMAP.md` — primeira coisa a fazer quando for implementar favoritar/seguir.

## 3. Row Level Security (RLS)

**Perfis (✅ já aplicado, está em `sql/perfis.sql`):** só `select`/`update` do
próprio dono (`auth.uid() = id`). Sem política de `insert`: a linha só nasce
pelo gatilho de auto-criação, nunca diretamente via API — evita perfis
duplicados ou "órfãos".

**Interações (⏳ ainda por rodar, quando a tabela for criada):**
```sql
alter table interacoes enable row level security;

create policy "Interacoes sao publicas para leitura"
  on interacoes for select using (true);

create policy "Usuario so insere sua propria interacao"
  on interacoes for insert with check (auth.uid() = usuario_id);

create policy "Usuario so atualiza sua propria interacao"
  on interacoes for update using (auth.uid() = usuario_id);
```

**Atenção ao criar funções de gatilho (como a de auto-criação de perfil):** o
Postgres concede `EXECUTE` a `PUBLIC` por padrão na criação de qualquer
função — incluindo funções de gatilho, que não deveriam ser chamáveis
diretamente via API por ninguém. Revogue explicitamente:
```sql
revoke execute on function nome_da_funcao() from public, anon, authenticated;
```
(Achado pelo linter de segurança do próprio Supabase — `sql/perfis.sql` já
aplica isso nas suas funções.)

## 4. Client no frontend

`data/supabaseClient.js` (não `services/` — convenção real do projeto):
```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co'
const SUPABASE_ANON_KEY = 'sua-chave-anon-publica'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

## 5. Serviço de autenticação (✅ implementado, API real)

`services/authService.js` exporta funções soltas, não um objeto:
```js
import { supabase } from '../data/supabaseClient.js'

export async function loginComMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href } // .href, não .origin — ver seção 1.1
  })
  if (error) throw error
}

export async function loginComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  })
  if (error) throw error
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function obterUsuarioAtual() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function aoMudarAutenticacao(callback) {
  const { data: subscription } = supabase.auth.onAuthStateChange((_evento, sessao) => {
    callback(sessao?.user ?? null)
  })
  return subscription
}
```

Modal de login pronto em `components/loginModal.js` (Google + Magic Link),
com estilo em `components/modal-login.css`. UI de "logado ou não" (o painel
"Bem vindo," do menu lateral) fica em `components/painelUsuario.js`,
carregado automaticamente por `js/pwa.js` em toda página.

## 6. Serviço de Perfil (✅ implementado)

`services/perfilService.js` — sem camada de Repository (ver `docs/ARQUITETURA.md`,
seção "Dados de usuário"). Funções: `obterPerfil(usuarioId)`,
`salvarPerfil(usuarioId, dados)`, `enviarAvatar(usuarioId, arquivo)` (upload
pro bucket `avatares` do Supabase Storage).

## 6.1. Serviço de interações (⏳ código existe, não conectado, tabela não existe)

`services/interacaoService.js` já tem a forma abaixo escrita, mas **vai
falhar em runtime** até a tabela `interacoes` ser criada (seção 2.1):
```js
import { supabase } from '../data/supabaseClient.js'
import { obterUsuarioAtual } from './authService.js'

export async function favoritarEvento(eventoId) { /* ... */ }
export async function seguirMarca(marcaId) { /* ... */ }
```
Confira o arquivo real antes de usar — pode já ter evoluído desde este guia.

## 7. Limites do plano gratuito a ter em mente

- 500 MB de banco de dados, 1 GB de armazenamento de arquivos, 5 GB de egress, 50.000 usuários ativos mensais, até 2 projetos ativos
- Sem backups automáticos nem SLA no plano free
- Projeto pausa automaticamente após 7 dias sem requisições de API — reativa manualmente pelo dashboard quando isso acontecer

## 8. Quando for implementar Interações (próximo passo real)

1. Rodar o SQL da seção 2.1 e as políticas da seção 3
2. Lembrar do `revoke execute` se criar alguma função de gatilho nova
3. Conferir `services/interacaoService.js` contra o padrão real de `perfilService.js`
4. Testar RLS direto no SQL Editor antes de confiar no client (inserir com
   `usuario_id` de outro usuário deve falhar)
5. Conectar à UI: botão de favoritar em `evento.html`, de seguir em `marca.html`
