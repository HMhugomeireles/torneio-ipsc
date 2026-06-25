# Torneio IPSC — Site de Resultados

App de resultados para um torneio de tiro airsoft estilo IPSC (4 estágios, Hit Factor).

## Setup

1. Cria um projeto Supabase. No SQL Editor, corre `supabase/schema.sql`.
2. Em Authentication → Users, cria um utilizador (email + password) — é o login partilhado dos juízes.
3. Copia `.env.example` para `.env` e preenche `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
   (Project Settings → API Keys → **Publishable key**, formato `sb_publishable_...`; substitui a antiga `anon` key,
   já em descontinuação). Tem os mesmos privilégios baixos, por isso as policies RLS comportam-se igual.
4. `npm install`
5. `npm run dev` para desenvolvimento; `npm run build` para produção.

## Testes

`npm test` — testa a lógica de pontuação (Hit Factor, ranking por estágio e geral).

## Deploy (Vercel)

1. Faz push do repositório para o GitHub.
2. Importa o repo na Vercel (framework: Vite).
3. Em Settings → Environment Variables, adiciona `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy. O ficheiro `vercel.json` (incluído) reescreve todas as rotas para `index.html` (necessário para o routing client-side da SPA).

## Páginas

- `/` Ranking geral — `/estagios` Ranking por estágio — `/regras` Regras
- `/registo` (login) Registo de pontos — `/gestao` (login) Jogadores, juízes, definições
