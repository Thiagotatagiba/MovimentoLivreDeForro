# GUIA_SUPABASE_SETUP.md

Guia de referência para Login + dados de usuário usando Supabase, mantendo o
padrão arquitetural do projeto (ES modules puros, sem build tools).

Este documento complementa `docs/ARQUITETURA.md` e `docs/DECISOES_DE_ARQUITETURA.md`.
A camada de catálogo (Eventos/Marcas/Locais) continua em JSON — Supabase entra
apenas para dados de usuário.

**Status atual:** Login (Google + Magic Link), Perfil e **Interações**
(favoritar evento / seguir marca) — implementados e em produção. As migrações
estão em `sql/perfis.sql` e `sql/interacoes.sql`; ambas já foram executadas no
projeto. O que ficou pendente é a revisão de privacidade da policy de leitura
(ver seção 8).

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

## 2.1. Schema SQL — Interações (✅ implementado)

O SQL completo e atualizado está em `sql/interacoes.sql` — rode esse arquivo,
não o resumo abaixo. Resumo conceitual:

```sql
create table interacoes (
  id uuid default gen_random_uuid() primary key,
  usuario_id uuid references auth.users(id) on delete cascade not null,
  entidade_tipo text not null check (entidade_tipo in ('marca', 'evento')),
  entidade_id text not null,
  tipo text not null check (tipo in ('favorito', 'seguindo')),
  criado_em timestamptz not null default now(),
  unique (usuario_id, entidade_tipo, entidade_id, tipo),
  constraint interacao_tipo_entidade_valida check (
    (tipo = 'favorito' and entidade_tipo = 'evento') or
    (tipo = 'seguindo' and entidade_tipo = 'marca')
  )
);
```

Repare que `tipo` só aceita `favorito`/`seguindo` (o desenho antigo previa
`segue`/`vou`/`talvez`, que não foram adotados) e que favorito só existe em
evento, seguindo só em marca.

## 3. Row Level Security (RLS)

**Perfis (✅ já aplicado, está em `sql/perfis.sql`):** só `select`/`update` do
próprio dono (`auth.uid() = id`). Sem política de `insert`: a linha só nasce
pelo gatilho de auto-criação, nunca diretamente via API — evita perfis
duplicados ou "órfãos".

**Interações (✅ aplicado em `sql/interacoes.sql`):** leitura pública
(`using (true)`, necessária pra contagem agregada futura), insert/delete só do
próprio `usuario_id`, sem policy de update (alternar = inserir ou remover).

> ⚠️ Revisão pendente: a leitura pública também permite listar quem favoritou
> o quê. Se a intenção for só número agregado, trocar por view/RPC — ver
> `MELHORIAS.md` (SEC-02).

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

## 6.1. Serviço de interações (✅ implementado)

`services/interacaoService.js` exporta `verificarInteracao`,
`alternarInteracao`, `listarFavoritos` e `listarSeguindo`. A UI usa em
`components/botaoInteracao.js` (evento.html e marca.html) e em
`js/pages/favoritos.js`.

## 7. Limites do plano gratuito a ter em mente

- 500 MB de banco de dados, 1 GB de armazenamento de arquivos, 5 GB de egress, 50.000 usuários ativos mensais, até 2 projetos ativos
- Sem backups automáticos nem SLA no plano free
- Projeto pausa automaticamente após 7 dias sem requisições de API — reativa manualmente pelo dashboard quando isso acontecer

## 8. Pendências de Interações

1. Revisar a policy de leitura pública (SEC-02 do `MELHORIAS.md`): expor só
   contagem agregada ou documentar a decisão de expor as linhas.
2. Se for criar função de gatilho nova, lembrar do `revoke execute`.
3. Testar RLS no SQL Editor ao mudar qualquer policy (inserir com
   `usuario_id` de outro usuário deve falhar).
4. Contagem social ("X pessoas vão") depende do item 1.
