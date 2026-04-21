# Plano Redesign V2 — Pendências

Checklist do redesign V2 (`p7-shell` + `PrototypeShell` + `p7-grad-header`) com suporte ao modo dark.

## Contexto rápido

- Wrapper padrão: `client/src/pages/v2/PrototypeShell.tsx` — encapsula `MobileLayout variant="prototype"` + `p7-shell > p7-screen > PrototypeStatusBar + p7-grad-header + p7-scroll`.
- Tokens dark: `.dark.skin-v2` mapeia `--p7-*` → `--v2-*`; `--v2-*` tem valores light em `:root` (index.css linhas 240-248) e dark em `.dark` (linhas 305-313).
- Padrão de conversão: substituir `{skin === 'v2' ? (<V2PageStack>...) : (legacy)}` por `if (skin === 'v2') { return <PrototypeShell ...>; }` + retorno legacy.
- Regra de ouro: **nunca usar `bg-white`, `bg-gray-*`, `bg-slate-*`, `text-white`, `text-slate-*` hardcoded no branch V2**. Usar `var(--p7-card)`, `var(--p7-bg)`, `var(--p7-text)`, `var(--p7-text-2)`, `var(--p7-text-3)`, `var(--p7-border)`.

---

## ✅ Já concluído

Páginas convertidas para `PrototypeShell` + dark mode verificado:

1. `client/src/pages/Pastors.tsx`
2. `client/src/pages/PastorInvites.tsx`
3. `client/src/pages/Districts.tsx`
4. `client/src/pages/Interested.tsx`
5. `client/src/pages/MyInterested.tsx`
6. `client/src/pages/MeuCadastro.tsx`
7. `client/src/pages/Settings.tsx` + `client/src/pages/settings/AppearanceTab.tsx`
8. `client/src/pages/Chat.tsx`
9. `client/src/pages/UnifiedElection.tsx`
10. `client/src/pages/ElectionConfig.tsx`
11. `client/src/pages/ElectionDashboard.tsx`
12. `client/src/pages/ElectionManage.tsx`
13. `client/src/pages/ElectionResults.tsx`
14. `client/src/pages/ElectionVoting.tsx`
15. `client/src/pages/ElectionVotingMobile.tsx`

Páginas V2 nativas já existentes (não precisam de conversão):

- `client/src/pages/v2/MenuV2.tsx`, `CalendarV2.tsx`, `PrayersV2.tsx`, `TasksV2.tsx`, `DashboardV2.tsx`
- `client/src/pages/login/LoginV2.tsx` (delegada por `Login.tsx`)

Outras páginas com shell V2 próprio (PublicPageV2 / bridge shell):

- `client/src/pages/Terms.tsx`, `Privacy.tsx`, `NotFound.tsx`, `Contact.tsx`, `Users.tsx`, `Reports.tsx`, `Gamification.tsx`, `NotificationsHistory.tsx`, `PushNotifications.tsx`

Verificações automatizadas atuais:

- `npx tsc --noEmit` passando
- `npm run lint` passando
- `npm run test` passando
- `npm run test:e2e` passando

---

## ✅ PastorOnboarding endurecido para dark mode

O wizard `client/src/pages/PastorOnboarding.tsx` manteve a estrutura `p7-bridge-shell`, mas os hardcodes que quebravam no dark mode foram tratados no shell, nos estados públicos e nos step components.

### Arquivo: `client/src/pages/PastorOnboarding.tsx`

Concluído:

- Container de loading, step indicator, glass card e wrapper do conteúdo migrados para `var(--p7-card)`.
- Alertas de erro receberam variantes dark (`dark:border-red-900`, `dark:bg-red-950/40`, `dark:text-red-*`).

### Arquivo: `client/src/pages/pastor-onboarding/PastorOnboardingSections.tsx`

Concluído:

- `StateShellV2Aware` agora usa `bg-[var(--p7-card)]`.
- `SuccessState` foi mantido, mas continua pedindo conferência visual de contraste em dark.

### Arquivos: `client/src/components/pastor-onboarding/steps/*.tsx`

Concluído:

- `Step1Personal.tsx`
- `Step2District.tsx`
- `Step3Churches.tsx`
- `Step4ExcelImport.tsx`
- `Step5Validation.tsx`
- `Step7Password.tsx`
- `Step8GamificationConfig.tsx`
- `StepSituationLevels.tsx`

Limpeza feita:

- `Step6Password.tsx` removido do projeto por não ter referências no fluxo atual.

---

## 🧪 QA visual pendente

Ativar `.dark` no `<html>` + skin `v2` e percorrer cada página já convertida conferindo:

1. **Contraste de texto** nos `var(--p7-text-*)` sobre `var(--p7-card)`.
2. **Estados hover/focus** dos botões — alguns ainda usam `hover:bg-blue-50` / `hover:bg-gray-100` fixos.
3. **Badges coloridos** de eleições já receberam variantes dark em:
   - `ElectionVoting.tsx`
   - `ElectionResults.tsx`
   - `ElectionVotingMobileSections.tsx`
4. **Progress bars** de `ElectionVoting.tsx` já usam `bg-[var(--p7-border)]`; ainda vale conferência visual.
5. **Ícones coloridos fixos** (`text-blue-600`, `text-green-600`, `text-orange-600`, `text-yellow-500`) — geralmente OK em dark, mas conferir contraste.

---

## 🧹 Limpeza concluída

- `client/src/pages/Appearance.tsx` continua removido e sem import residual.
- `Step6Password.tsx` foi removido.
- `client/src/pages/v2/PrototypeShell.tsx` segue como contrato único do shell V2.

---

## ✨ Polimento automatizado concluído

Passe adicional já aplicado em componentes compartilhados do redesign:

- `client/src/components/ui/skeleton.tsx` e `client/src/components/skeletons/*` agora usam superfícies e preenchimentos compatíveis com tokens V2.
- `client/src/components/ui/page-skeleton.tsx` foi alinhado ao mesmo tratamento visual.
- Empty states de maior tráfego foram reescritos com orientação mais acionável em:
  - `client/src/pages/users/sections/UsersSectionsStates.tsx`
  - `client/src/pages/my-interested/MyInterestedSections.tsx`
  - `client/src/pages/unified-election/UnifiedElectionSections.tsx`
  - `client/src/pages/election-voting/ElectionVotingMobileSections.tsx`
- `client/src/styles/view-transitions.css` e `client/src/index.css` receberam salvaguardas extras para `prefers-reduced-motion` em route transitions, `animate-pulse`, `animate-spin` e smooth scroll de containers.

---

## 🔎 Auditoria técnica concluída

Validação adicional feita após o passe principal do redesign:

- Cobertura de rotas confirmada em `client/src/App.tsx`: todas as páginas públicas e protegidas registradas têm branch `v2` ou wrapper compatível (`PrototypeShell`, `PublicPageV2`, bridge/prototype shell).
- Regressão de dados corrigida em `client/src/pages/Districts.tsx`: endpoints com envelope `{ success, data }` agora são desempacotados antes de renderizar listas e diálogos.
- Regressão equivalente corrigida em `client/src/pages/Pastors.tsx`: `/api/pastors` e `/api/districts` agora aceitam array puro e resposta envelopada.
- Shell V2 endurecido em `client/src/styles/prototype-v2.css`: `p7-screen` e `p7-scroll` receberam `flex`, `min-height: 0`, `overscroll-behavior-y`, `-webkit-overflow-scrolling` e `touch-action`.
- `client/src/hooks/usePullToRefresh.ts` agora respeita o container rolável real da interação; o gesto não sequestra mais scroll interno só porque `window.scrollY === 0`.
- Auditorias automatizadas registradas em `artifacts/scroll-audit-mobile.json` e `artifacts/scroll-audit-desktop.json` voltaram sem páginas com scroll travado nas rotas auditadas (`classic` e `v2`).
- As rotas dinâmicas de eleição com `:configId=1` continuam redirecionando no ambiente local atual por `404` do backend (`/api/elections/dashboard/1`), o que indica ausência de dado de exemplo e não quebra do redesign.
- Acessibilidade V2 reforçada em headers e fluxos principais: `PrototypeHeaderIconButton` agora só é focável quando tem ação real, botões de ícone receberam nomes acessíveis e o tab order foi validado em Dashboard, Calendar, Prayers, Districts, Pastors e Reports.
- `PrayersV2` recuperou busca e filtros do fluxo clássico para não perder funcionalidade durante o redesign.
- Empty states V2 de Calendar e Prayers agora explicam o próximo passo em vez de apenas indicar ausência de dados.
- Varredura V2 em localhost (`http://127.0.0.1:3066`) cobriu 34 rotas públicas/protegidas/dinâmicas: não houve scroll travado, overflow horizontal ou controles visíveis sem nome acessível nas rotas válidas.
- `PastorInvites` e `NotificationsHistory` agora toleram resposta envelopada `{ success, data }`, evitando regressões iguais às encontradas em Districts/Pastors.
- `/my-reports` deixou de apontar para `Tasks` e ganhou página própria de "Meus relatórios" para missionários, preservando o fluxo do menu lateral e do anunciante de rotas.
- Bateria final pós-ajustes: `npm run typecheck`, `npm run lint`, `npm run test` (`465 passed`) e `npm run test:e2e` (`106 passed`, `14 skipped`) verdes.

---

## 🎯 Definição de pronto

Uma página está "redesign V2 completo" quando:

- [ ] Branch `skin === 'v2'` usa `PrototypeShell` (ou `PublicPageV2` / bridge para páginas públicas).
- [ ] Nenhum `bg-white` / `bg-gray-*` / `bg-slate-*` / `text-white` hardcoded no branch V2.
- [ ] Todos os tokens de cor são `var(--p7-*)` ou têm variantes `dark:`.
- [ ] `npx tsc --noEmit` passa.
- [ ] QA visual em `.dark` + `.light` no skin `v2` conferido.

---

## 📎 Referências de arquivos

- Shell wrapper: `client/src/pages/v2/PrototypeShell.tsx`
- CSS prototype: `client/src/styles/prototype-v2.css`
- Tokens light/dark: `client/src/index.css` (linhas 240-248 light, 305-313 dark)
- Primitives: `client/src/pages/v2/prototypeShared.tsx`
- Theme toggle: `client/src/components/v2/ThemeToggle.tsx`
- MobileLayout variant: `client/src/components/layout/MobileLayout.tsx`
- Contexto de skin: `client/src/contexts/ThemeContext.tsx`
