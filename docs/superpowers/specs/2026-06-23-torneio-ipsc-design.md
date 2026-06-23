# Torneio IPSC (Airsoft) — Site de Resultados — Design

**Data:** 2026-06-23
**Evento alvo:** Torneio de Tiro ao Alvo Airsoft — 4 estágios — pontuação por Hit Factor
**Regulamento de referência:** Google Doc "Regulamento Oficial — Torneio de Tiro ao Alvo Airsoft"

## 1. Objetivo

Site para registar e mostrar os resultados de um torneio de tiro estilo IPSC, com 4 estágios
pontuados por Hit Factor. Tem uma parte pública (rankings) e uma parte protegida por password
(registo de pontos e gestão), pensada para uso prático no telemóvel no dia da prova.

## 2. Utilizadores e acesso

- **Público:** vê os rankings (geral e por estágio). Sem login.
- **Juízes / Organização:** registam pontos e gerem jogadores/juízes. Acesso protegido por
  **password partilhada** (login único via Supabase Auth — ver §7).

## 3. Stack tecnológica

- **Frontend:** Vite + React + TypeScript + Tailwind CSS.
- **Design system:** Airsoft Book / Bullet UI (skill `brand-guidelines` deste projeto).
- **Backend / dados:** Supabase (Postgres + Auth).
- **Deploy:** estático na Vercel (ou Netlify). O Supabase é acedido pelo cliente via `@supabase/supabase-js`.
- **Sem servidor próprio** — toda a lógica de cálculo corre no cliente; a base de dados guarda os dados brutos.

## 4. Páginas

1. **Ranking Geral** (`/`, pública) — tabela ordenada por pontos totais:
   posição, jogador, soma dos pontos dos 4 estágios (máx. 400), % vs líder, e breakdown por estágio.
2. **Ranking por Estágio** (`/estagios` ou `/estagio/:n`, pública) — para cada estágio:
   posição, jogador, fator usado, pontos, tempo final, Hit Factor, pontos do estágio (1º = 100).
3. **Registo de Pontos** (`/registo`, protegida) — formulário "Layout B" (ver §6).
4. **Gestão** (`/gestao`, protegida) — gerir jogadores, juízes e definições do torneio.
5. **Regras** (`/regras`, pública) — página informativa: tabela de pontuação por zona/fator e
   lista de penalizações (transparência no dia). Conteúdo estático derivado do regulamento.

## 5. Modelo de dados (Supabase / Postgres)

### `players`
- `id` (uuid, pk)
- `name` (text, not null)
- `created_at` (timestamptz)

### `judges`
- `id` (uuid, pk)
- `name` (text, not null)
- `created_at` (timestamptz)

### `tournament_settings` (linha única)
- `id` (int, pk = 1)
- `stage_names` (jsonb) — nomes/etiquetas dos 4 estágios, ex: `["Estágio 1", ...]`
- `default_single_weapon_seconds` (numeric, default 10) — valor sugerido para arma única

### `stage_results`
- `id` (uuid, pk)
- `player_id` (uuid, fk → players)
- `judge_id` (uuid, fk → judges)
- `stage` (int, 1–4)
- `factor` (text: `maior` | `menor`)
- `alpha` (int, default 0)
- `charlie` (int, default 0)
- `delta` (int, default 0)
- `metal` (int, default 0)
- `pen_miss` (int, default 0) — Miss / Falha
- `pen_no_shoot` (int, default 0) — alvo proibido
- `pen_safety` (int, default 0) — segurança / procedimento
- `pen_out_of_zone` (int, default 0) — fora da zona de disparo
- `time_seconds` (numeric, not null)
- `single_weapon` (bool, default false)
- `single_weapon_seconds` (numeric, default 0)
- `created_at`, `updated_at` (timestamptz)
- **Constraint única:** `(player_id, stage)` — registar de novo o mesmo jogador/estágio faz **upsert** (atualiza).

> Penalizações guardadas detalhadas por tipo (transparência); todas valem −10 no cálculo.

## 6. Página de Registo de Pontos (Layout B aprovado)

Topo (seleção):
- **Jogador** (dropdown, da lista pré-registada)
- **Juiz** (dropdown, da lista pré-registada)
- **Estágio** (1–4)
- **Fator** (Maior / Menor) — escolhido por registo (pode variar por estágio)

Acumuladores de **Pontos** (cada um com contador grande + botões `−` / `+`):
- ALPHA, CHARLIE, DELTA, METAL

Acumuladores de **Penalizações** (−10 cada, contador + `−` / `+`):
- Miss / Falha, No-shoot, Segurança / Procedimento, Fora da zona de disparo

**Tempo:**
- Campo numérico de segundos (ex: `34.20`)
- Checkbox **Arma única** + campo de segundos editável (default vindo das definições; o juiz pode pôr +10, +20, +30…)

**Resumo ao vivo** (recalcula a cada toque): Pontos · Tempo final · Hit Factor.

**Guardar estágio** → upsert em `stage_results`. Se já existir registo para esse (jogador, estágio),
o formulário carrega os valores atuais para edição.

## 7. Segurança / password

- **Leitura pública:** RLS no Supabase permite `SELECT` ao papel anónimo em todas as tabelas.
- **Escrita protegida:** RLS exige utilizador autenticado para `INSERT/UPDATE/DELETE`.
- **Login único partilhado:** uma conta Supabase Auth (email + password) usada por todos os juízes.
  As páginas protegidas pedem login; a "password simples" é a password dessa conta.
- Esta abordagem dá proteção real às escritas (não só esconder a UI) mantendo a simplicidade de uma password única.

## 8. Cálculo da pontuação (lógica no cliente)

Para cada `stage_result`:

```
pontosBrutos = alpha*5
             + charlie*(factor === 'maior' ? 4 : 3)
             + delta*(factor === 'maior' ? 2 : 1)
             + metal*5
penalizacoes = (pen_miss + pen_no_shoot + pen_safety + pen_out_of_zone) * 10
pontos       = max(0, pontosBrutos - penalizacoes)        // mínimo 0
tempoFinal   = time_seconds + (single_weapon ? single_weapon_seconds : 0)
hitFactor    = tempoFinal > 0 ? pontos / tempoFinal : 0
```

Por estágio (sobre todos os resultados desse estágio):

```
melhorHF        = max(hitFactor de todos os resultados do estágio)
pontosDoEstagio = melhorHF > 0 ? 100 * (hitFactor / melhorHF) : 0   // 1º = 100; div/0 → 0
```

Geral (por jogador):

```
totalGeral = soma dos pontosDoEstagio dos 4 estágios          // máx 400
percentLider = (totalGeral / maiorTotalGeral) * 100
```

Ordenação: ranking por estágio por `pontosDoEstagio` desc (empate: HF desc, depois tempo asc);
ranking geral por `totalGeral` desc.

## 9. Tabela de pontuação por zona/fator (do regulamento)

| Zona  | Fator Maior (GBBR) | Fator Menor (AEG/HPA) |
|-------|--------------------|------------------------|
| Alpha | 5                  | 5                      |
| Charlie | 4                | 3                      |
| Delta | 2                  | 1                      |
| Metal | 5                  | 5                      |

Penalizações: −10 pontos cada (subtraídas antes do Hit Factor).
Arma única: penalização de **tempo** somada ao tempo do estágio (valor definido pela organização).

## 10. Simplificações deliberadas (YAGNI)

- O juiz decide a zona final contada de cada alvo; o app **não** modela "2 hits / melhor agrupamento"
  nem hits em bruto — só regista as contagens finais por zona, como o juiz as conta.
- Sem contas individuais por juiz — apenas o nome para registo + uma password partilhada.
- Pontos por registo nunca ficam negativos (mínimo 0).
- Se todos os resultados de um estágio tiverem HF 0, todos recebem 0 pontos nesse estágio.
- A página de Regras é conteúdo estático (não editável pela app neste âmbito).

## 11. Fora de âmbito (futuro)

- Histórico de múltiplos torneios / épocas.
- Edição do regulamento/penalizações pela própria app.
- Exportação PDF / impressão de classificações.
- Squads / horários / heats.
