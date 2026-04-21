# Plano de Redesign — Skin V2 (Novo Layout)

Plano de execução para migrar o 7care para o design do protótipo Claude Design
(`~/Downloads/7care-novolayount/7care-prototype.html`), alinhado às regras do
skill **Impeccable** instalado em `.claude/skills/impeccable/`.

O novo layout convive com o clássico via toggle em **Configurações → Aparência**.
O usuário pode voltar ao clássico a qualquer momento (persistido em
`localStorage['7care_skin']`).

**Referência visual:**

- Protótipo alta-fi: `client/public/7care-prototype.html` → http://localhost:3065/7care-prototype.html
- Wireframes: `client/public/7care-wireframes.html` → http://localhost:3065/7care-wireframes.html

**Referência de design:**

- Skill: `.claude/skills/impeccable/SKILL.md` (regras obrigatórias)
- Referências profundas: `.claude/skills/impeccable/reference/` (typography, color-and-contrast, spatial-design, motion-design, interaction-design, responsive-design, ux-writing)
- Context do projeto (após Onda 0): `.impeccable.md` na raiz

**Como usar este plano:**

- Marque `[x]` conforme avança.
- Cada seção pode ser pausada e retomada independente.
- Antes de retomar, leia "Estado atual" e o último commit.

---

## Estado atual

- [x] Toggle `skin: 'classic' | 'v2'` no `ThemeContext`
- [x] Tokens `:root.skin-v2` em `client/src/index.css` + camada semântica OKLCH para V2
- [x] Seletor "Design do app" em `client/src/pages/settings/AppearanceTab.tsx`
- [x] Protótipo HTML copiado para `client/public/`
- [x] Skill Impeccable instalada em `.claude/skills/`
- [x] `.impeccable.md` criado na raiz com contexto, paleta, anti-referências e tipografia
- [x] Login, Dashboard, Tasks, Calendar, Prayers e Menu ligados ao skin V2
- [x] `npm run typecheck`, `npm run lint` e `npm run build` verdes
- [ ] **Onda 0 — Context Setup (bloqueador de todas as outras)**
- [ ] Onda 1 — Fundação
- [ ] Onda 2 — Telas de alto uso
- [ ] Onda 3 — Telas administrativas
- [ ] Onda 4 — Polimento e release

---

## Regras de execução (INEGOCIÁVEIS)

### Do Impeccable

1. **Não usar fontes da `reflex_fonts_to_reject`** — Inter, Roboto, Open Sans, Fraunces, Lora, Playfair, Crimson*, Cormorant*, Syne, IBM Plex*, Space Mono/Grotesk, DM Sans/Serif*, Outfit, **Plus Jakarta Sans**, Instrument Sans/Serif. Rodar `<font_selection_procedure>` de 4 passos.
2. **OKLCH, não HSL** — perceptualmente uniforme. Reduzir chroma ao chegar em white/black.
3. **Tingir neutros para o hue da marca** — chroma 0.005-0.01 é suficiente.
4. **60-30-10** — 60% surface / 30% secondary / 10% accent.
5. **Spacing 4pt com nomes semânticos** — `--space-xs/sm/md/lg/xl/2xl/3xl/4xl`, escala 4/8/12/16/24/32/48/64/96. Usar `gap`, nunca `margin` para siblings.
6. **Container queries (`@container`) para componentes**, viewport queries para layout de página.
7. **Banned CSS (nunca usar):**
   - `border-left/right` > 1px como stripe colorida (BAN 1)
   - `background-clip: text` com gradient (BAN 2 — "gradient text")
   - Glassmorphism decorativo
   - Cards dentro de cards
   - `drop-shadow` em texto para resolver contraste
   - Hero metric layout template repetido
   - Bounce/elastic easing
   - Sparklines decorativas
8. **Motion** — exp easing (out-quart/quint/expo), `transform/opacity` only, altura via `grid-template-rows`, sempre respeitar `prefers-reduced-motion`.
9. **Empty states ensinam a interface** — nunca só "Sem registros".
10. **Progressive disclosure** — avançado atrás de expansão.
11. **Tipografia** — 5 passos com ratio ≥ 1.25, body 65-75ch max, line-height escala inversa ao line-length.
12. **AI Slop Test obrigatório** antes de cada release de onda — "alguém diria que foi IA?". Se sim, parar.

### Do projeto

13. **Nunca quebrar o skin clássico.** Tudo novo só renderiza quando `skin === 'v2'`.
14. **Zero cor hardcoded** — tudo via tokens do `:root.skin-v2`.
15. **Arquivos V2 separados** — terminam em `V2.tsx` ou ficam em `components/v2/`.
16. **Renderização condicional:** `const { skin } = useTheme(); return skin === 'v2' ? <PageV2 /> : <PageClassic />;`
17. **1 commit por componente/tela.**
18. **Validar no browser** antes de marcar concluída.

---

## Onda 0 — Context Setup (estimado: 1 dia · **BLOQUEADORA**)

Sem isso, toda a Onda 1 produz output genérico. O Impeccable recusa trabalhar sem `.impeccable.md`.

### 0.1 Design Context

- [x] Rodar `/impeccable teach` → cria `.impeccable.md` na raiz com:
  - **Users**: pastores, missionários, membros, admins; contexto = celular, dia-a-dia, cuidado pastoral
  - **Brand Personality**: 3 palavras concretas (ex: "reverente, acolhedor, confiante" — não "moderno/elegante")
  - **Aesthetic Direction**: referências e anti-referências específicas
  - **Design Principles**: 3-5 princípios acionáveis derivados
- [x] Documentar em `.impeccable.md`:
  - Decisão de tema default (light) **justificada pela audiência**
  - Regra 60-30-10 aplicada à paleta
  - Anti-references (o que o app **não** pode parecer)

### 0.2 Font Selection (obrigatório)

- [x] Passo 1: escrever 3 palavras da voz da marca (não "moderno/elegante")
- [x] Passo 2: listar 3 fontes de reflexo → **rejeitar todas as da lista banida (incluindo Plus Jakarta Sans do protótipo)**
- [x] Passo 3: procurar em Google Fonts / Pangram Pangram / Klim / Velvetyne / Dinamo por fonte que combine com as 3 palavras como "objeto físico"
- [x] Passo 4: cross-check — se bateu com reflexo, voltar ao 3
- [x] Registrar escolha em `.impeccable.md` + atualizar `:root.skin-v2` em `client/src/index.css`
- **Nota:** pode acabar sendo Plus Jakarta se passar no cross-check, mas não pode ser escolha-reflexo.

### 0.3 Migração HSL → OKLCH

- [x] Converter todos os tokens semânticos novos de V2 (`--v2-*`) para `oklch(...)`
- [x] Reduzir chroma em lightness extremas (claro/escuro)
- [x] Tingir neutros (background, surface, muted, border) para o hue do navy da marca — chroma 0.005-0.01
- [ ] Atualizar `tailwind.config.ts` se necessário (cores via CSS vars já funcionam)

### 0.4 Baseline audit

- [x] Rodar `/audit` em: Dashboard, Login, Tasks (3 telas-amostra)
- [x] Registrar scores baseline em `.impeccable.md` (para comparar depois)

### 0.5 Spacing scale semântica

- [x] Adicionar em `:root.skin-v2`:
  ```
  --space-xs: 0.25rem; /* 4 */
  --space-sm: 0.5rem;  /* 8 */
  --space-md: 0.75rem; /* 12 */
  --space-lg: 1rem;    /* 16 */
  --space-xl: 1.5rem;  /* 24 */
  --space-2xl: 2rem;   /* 32 */
  --space-3xl: 3rem;   /* 48 */
  --space-4xl: 4rem;   /* 64 */
  --space-5xl: 6rem;   /* 96 */
  ```

**Commit marker da Onda 0:** `feat(v2): context setup — .impeccable.md, fonte escolhida, OKLCH, spacing semântico`

---

## Onda 1 — Fundação (estimado: 5-7 dias)

Constrói a biblioteca base. Nenhuma tela muda visualmente ainda.

### 1.1 Tipografia

- [x] Escala modular 5 passos com ratio ≥ 1.25 em `:root.skin-v2`:
  ```
  --fs-display: ...; /* hero/big titles */
  --fs-title:   ...;
  --fs-heading: ...;
  --fs-body:    ...;
  --fs-caption: ...;
  ```
- [x] Line-height tokens: `--lh-tight`, `--lh-normal`, `--lh-relaxed`
- [x] Body texto limitado a 65-75ch em containers de conteúdo (utility `.prose-narrow`)
- [x] Usar escala fixa `rem` para app UI (não `clamp` — Impeccable: UIs de produto não usam fluid type)

### 1.2 Sombras, radii, gradientes

- [x] `--shadow-card`, `--shadow-nav`, `--shadow-hover`
- [x] `--r-sm`, `--r-md`, `--r-lg`, `--r-pill`
- [x] `--grad-h`, `--grad-gold`, `--grad-card`, `--grad-soft`

### 1.3 Motion tokens

- [x] `--ease-out-quart`, `--ease-out-quint`, `--ease-spring` (sem bounce/elastic)
- [x] Durations: `--dur-fast` (150ms), `--dur-base` (240ms), `--dur-slow` (400ms)
- [x] Classes `.fade-up.d1..d5` com `@keyframes` + `@media (prefers-reduced-motion: reduce)` zerando
- [x] Helper para altura via `grid-template-rows: 0fr/1fr`

### 1.4 Componentes base (`client/src/components/v2/`)

Todos com **container queries** onde fizer sentido, focus rings visíveis e `aria-*` corretos.

- [x] `CardV2.tsx` — wrapper (radius tokenizado, sombra sutil, **sem overlays decorativos**)
- [x] `PageHeader.tsx` — `{ title, subtitle, action?, gradient? }`
- [x] `GradHeader.tsx` — header mobile gradient navy com saudação e avatar
- [x] `StatStrip.tsx` + `StatCard.tsx` — navy/glass/gold; **avaliar se flerta com hero metric template** e ajustar
- [x] `RowItem.tsx` — `{ avatar, title, sub, right, onClick }` (substitui 10+ listas)
- [x] `Pill.tsx` — `{ tone: 'red' | 'gold' | 'blue' | 'neutral' }`
- [x] `Chip.tsx` — filtros selecionáveis
- [x] `Avatar.tsx` — iniciais com gradient hasheado do nome
- [x] `FAB.tsx` — floating action button
- [x] `EmptyState.tsx` — `{ illustration, title, copy, cta }` **que ensina** a interface
- [x] `SearchBar.tsx`
- [x] `ProgressCard.tsx`
- [x] `EventChip.tsx`
- [x] `TaskItem.tsx` — checkbox + título + meta + pill opcional
- [x] `Disclosure.tsx` — para progressive disclosure (avançado atrás de expansão, altura via grid-template-rows)
- [x] `CheckinBanner.tsx` — banner de check-in espiritual com tom soft/gold e CTA
- [x] `BirthdayRow.tsx` — linha de aniversariante com Avatar + Pill gold
- [x] `StatStrip.tsx` — co-localizado em `StatCard.tsx`

### 1.5 Layouts

- [x] `layout/v2/MobileLayoutV2.tsx` — GradHeader + `<main>` + BottomNavV2
- [x] `layout/v2/BottomNavV2.tsx` — 5 itens com `.nav-pip` no ativo
- [x] `layout/v2/DesktopLayoutV2.tsx` — sidebar navy full-height
- [x] `layout/v2/SideNav.tsx` — conforme `d-*` do protótipo
- [x] Wrapper condicional: `MobileLayout` delega para V2 quando `skin === 'v2'`

### 1.6 Storybook — **OBRIGATÓRIO**

- [x] Storybook base para componentes V2 com variantes principais criada em `V2Foundation.stories.tsx`
- [ ] Ajuda a validar container queries isoladamente

### 1.7 Gates antes de fechar Onda 1

- [ ] `/audit` dos componentes base → sem P0/P1
- [ ] **AI Slop Test** — abrir Storybook e responder: "alguém diria que foi IA?". Se sim, voltar.
- [ ] Checklist de bans do Impeccable passou (border-stripe, gradient text, glassmorphism, nested cards, drop-shadow em texto)
- [x] `npm run typecheck` e `npm run lint` verdes
- [ ] `prefers-reduced-motion` testado

**Commit marker da Onda 1:** `feat(v2): fundação — tokens, componentes base, layouts, storybook`

---

## Onda 2 — Telas de alto uso (estimado: 10-14 dias)

Portar as telas que concentram 80% do tempo de uso.
**Workflow por tela:** sketch → code → `/critique` → `/polish` → AI Slop Test → merge.

### 2.1 Login — `client/src/pages/Login.tsx`

- [x] `Login.v2.tsx` split-screen (gradient navy esquerda, form direita)
- [x] Logo 7care em branco sobre navy
- [x] CTA gradient gold
- [x] Render condicional
- [ ] Gate: `/critique` + AI Slop Test
- **Ref:** `s-login` / `d-login`

### 2.2 Dashboard Admin — `client/src/pages/Dashboard.tsx`

- [ ] `/distill` → extrair admin para `DashboardAdmin.tsx`
- [x] `DashboardAdminV2.tsx` com:
  - GradHeader com saudação dinâmica
  - StatStrip (4 cards — **validar que não é hero metric template**)
  - CheckinBanner
  - CardSection "Tarefas urgentes" com TaskItem
  - CardSection "Próximo evento" com EventChip
  - CardSection "Aniversariantes" com RowItem
  - ProgressCard "Visitômetro"
- [x] Motion `.fade-up.d1..d5` staggered
- [ ] Gate: `/critique` + AI Slop Test
- **Ref:** `s-dash-admin` (linhas 661-796 do protótipo)

### 2.3 Dashboard Membro

- [x] `DashboardMembroV2.tsx`
- [ ] Gate: `/critique` + AI Slop Test
- **Ref:** `s-dash-membro`

### 2.4 Tasks

- [x] PageHeader + Chips de filtro + lista de TaskItem agrupada + FAB
- [x] EmptyState que ensina a criar primeira tarefa
- [ ] Gate: `/critique` + AI Slop Test

### 2.5 Prayers

- [x] Cards de pedido + contador de reações + base V2 integrada
- [ ] Gate: `/critique` + AI Slop Test

### 2.6 Calendar

- [x] Header com mês navegável + grid com pip dourado + lista do dia
- [ ] Gate: `/critique` + AI Slop Test

### 2.7 Chat

- [x] Layout V2 com GradHeader + duas colunas lado a lado (sidebar + thread) usando tokens `--v2-*` e sombras V2
- [x] Empty state que ensina a iniciar conversa + CTA "Nova conversa" para admins
- [x] Removido nested card (BAN do Impeccable) — sidebar e thread são siblings, não filhos de outro card
- [ ] Lista de conversas com RowItem (pendente — ChatSidebar é compartilhado com o clássico, precisa refactor separado)
- [ ] Gate: `/critique` + AI Slop Test

### 2.8 Menu

- [x] GradHeader + seções de RowItem + Sair
- [ ] Gate: `/critique` + AI Slop Test

### 2.9 Extract cycle

- [ ] A cada 2 telas: rodar `/impeccable extract` para puxar componentes locais que viraram reutilizáveis para `components/v2/`

**Commit marker da Onda 2:** `feat(v2): telas de alto uso`

**Gate final da Onda 2:** `/audit` global, comparar com baseline da Onda 0.4, AI Slop Test em 3 telas aleatórias.

---

## Onda 3 — Telas administrativas (estimado: 8-12 dias)

Mesmo workflow por tela.

- [ ] Users (mobile + desktop, filtros em Chip, SearchBar)
- [ ] Districts (cards com gradient sutil + mini-stats)
- [ ] Pastors (grid de cards + CTA convidar)
- [ ] Interested + MyInterested (pipeline ou lista com status pill)
- [x] Reports (KPI cards + Recharts com paleta v2 + toolbar)
- [ ] Elections (5 páginas — padronizar com CardV2 + PageHeader + barras gold)
- [x] Settings + MeuCadastro (sidebar desktop / row-items mobile / tabs no profile)

Status atual:

- `Reports` ganhou leitura rápida no topo e navegação de abas mais leve no mobile.
- `Settings` recebeu resumo operacional, tabs V2 próprias e melhor hierarquia de ações.
- `MeuCadastro` agora tem resumo do perfil, campos com superfície V2 e modal de senha alinhado ao redesign.

**Gate final da Onda 3:** `/audit` global, AI Slop Test.

**Commit marker da Onda 3:** `feat(v2): telas administrativas`

---

## Onda 4 — Polimento e release (estimado: 3-5 dias)

### 4.1 Telas auxiliares

- [x] NotificationsHistory — agrupamento Hoje/Ontem/Antes
- [x] PushNotifications — herda tokens
- [x] Gamification — progress ring dourado + ranking
- [x] PastorInvites / PastorOnboarding — wizard com pip
- [x] Contact, Privacy, Terms — typography v2 + max-width 65-75ch
- [x] NotFound — ilustração + CTA voltar
- [x] **Remover** `Appearance.tsx` órfã — feito, incluindo sidebar, pageMeta e RouteAnnouncer

### 4.2 Skeletons

- [x] Repaginar `client/src/components/skeletons/` com tokens v2

### 4.3 Empty states (passagem final)

- [ ] Auditar todas as listas — `EmptyState` que ensina em todas
      Status atual: Users, MyInterested, UnifiedElection, ElectionVotingMobile, Calendar V2 e Prayers V2 já receberam revisão de copy e superfície.

### 4.4 Motion pass

- [ ] Transições de página coordenadas (view-transitions.css)
- [ ] Stagger em listas longas
- [ ] Verificar `prefers-reduced-motion` em todas as animações
      Status atual: route transitions, `animate-pulse`, `animate-spin` e smooth scroll já têm fallback de reduced motion.
      Auditoria complementar: `usePullToRefresh` foi endurecido para respeitar o scroll container real, evitando travas em páginas com shell interna (`p7-scroll`) e listas roláveis.

### 4.5 Acessibilidade (WCAG AA full)

- [x] `npm run test:e2e` com `accessibility-audit.spec.ts` — verde no ambiente atual
- [ ] Contraste 4.5:1 texto normal / 3:1 texto ≥18pt / 3:1 UI — verificar pills/chips
- [ ] Focus rings visíveis com gold
- [ ] Navegação por teclado em todas as telas
- [ ] ARIA labels em ícones interativos
      Status atual: headers V2 usam nomes acessíveis em ações reais; ícones decorativos não entram mais no tab order. Varredura V2 em 34 rotas no localhost `3066` passou sem scroll travado, overflow horizontal ou controles visíveis sem nome acessível nas rotas válidas.
      Status funcional: Prayers V2 recuperou busca e filtros do fluxo clássico.
      Correção de fluxo: `/my-reports` agora tem página própria para missionários em vez de cair em `Tasks`.
      Bateria final: `typecheck`, `lint`, `test` (`465 passed`) e `test:e2e` (`106 passed`, `14 skipped`) verdes após os ajustes.

### 4.6 Release

- [ ] Feature flag: liberar v2 para subset de usuários
- [ ] Atualizar screenshots (app store / landing)
- [ ] Decidir se v2 vira padrão — baseado em `.impeccable.md` e métricas
- [ ] Se vira padrão: mudar default em `getStoredSkin()` do `ThemeContext`

**Gate final:** AI Slop Test em 10 telas aleatórias por terceiro (não quem fez).

**Commit marker da Onda 4:** `feat(v2): polimento e release`

---

## Checklist global antes de considerar "pronto"

- [ ] Todas as páginas renderizam em ambos os skins sem erro
      Status atual: auditoria automatizada de rotas registradas em `App.tsx` ficou verde após os fixes de `/districts` e `/pastors`; exceção conhecida no ambiente local é `:configId=1` em eleições, que redireciona por `404` de dado inexistente.
- [ ] Todas as páginas renderizam em light e dark × classic e v2 (4 combos)
- [x] `npm run lint` sem warnings
- [x] `npm run typecheck` sem erros
- [x] `npm run test` verde
- [x] `npm run test:e2e` verde (incluindo accessibility-audit)
- [ ] Testado em iPhone SE (375px), iPad (768px), desktop (1280px+)
      Status atual: auditorias automatizadas de scroll em mobile e desktop voltaram sem páginas travadas nas rotas auditadas.
- [ ] Toggle clássico/v2 funciona sem refresh em todas as telas principais
- [ ] AI Slop Test passado em ≥ 3 telas aleatórias por terceiro
- [ ] Scores de `/audit` ≥ 16/20 em telas-amostra (vs baseline da Onda 0)
- [ ] `.impeccable.md` reflete o estado final

---

## Componentes novos que vou criar — resumo rápido

```
client/src/components/v2/
├── Avatar.tsx
├── BirthdayRow.tsx
├── CardV2.tsx
├── CheckinBanner.tsx
├── Chip.tsx
├── Disclosure.tsx
├── EmptyState.tsx
├── EventChip.tsx
├── FAB.tsx
├── GradHeader.tsx
├── PageHeader.tsx
├── Pill.tsx
├── ProgressCard.tsx
├── RowItem.tsx
├── SearchBar.tsx
├── StatCard.tsx
├── StatStrip.tsx
└── TaskItem.tsx

client/src/components/layout/v2/
├── BottomNavV2.tsx
├── DesktopLayoutV2.tsx
├── MobileLayoutV2.tsx
└── SideNav.tsx
```

---

## Ban-list técnica (lembrete rápido — do SKILL.md:206-221)

**Nunca usar em código v2:**

- ❌ `border-left/right` > 1px como stripe colorida (BAN 1)
- ❌ `background-clip: text` com gradient (BAN 2 — "gradient text")
- ❌ Glassmorphism decorativo (blur, glass cards, glow borders)
- ❌ Cards dentro de cards
- ❌ `drop-shadow` em texto para resolver contraste
- ❌ Hero metric layout template repetido
- ❌ Bounce/elastic easing
- ❌ Sparklines decorativas
- ❌ Fontes da lista `reflex_fonts_to_reject` (Plus Jakarta Sans está lá!)
- ❌ Pure `#000` / `#fff`
- ❌ Gray text sobre colored background
- ❌ Modals quando existe alternativa melhor
- ❌ Big icons com rounded corners acima de cada heading
- ❌ Animar `width/height/top/left` (use `transform/opacity` ou `grid-template-rows`)

---

## Se for pausar

1. Confirme que o último commit está pushed.
2. Anote aqui (abaixo) o que ficou em andamento:

### Notas de pausa

_(atualizar ao pausar)_

- **Última tarefa ativa:**
- **Bloqueador:**
- **Próximo passo ao retomar:**

---

## Referências

- Skill Impeccable: `.claude/skills/impeccable/SKILL.md`
- Referências profundas: `.claude/skills/impeccable/reference/{typography,color-and-contrast,spatial-design,motion-design,interaction-design,responsive-design,ux-writing}.md`
- Context do projeto (após Onda 0): `.impeccable.md`
- Princípios Steve Krug: `principios-steve-krug.md`
- Comandos disponíveis: `/audit`, `/critique`, `/polish`, `/distill`, `/colorize`, `/animate`, `/typeset`, `/layout`, `/impeccable teach`, `/impeccable extract`, `/impeccable craft`
