# 🎯 Melhorias de UX/UI para o 7Care

**Data:** 28 de janeiro de 2026  
**Projeto:** 7Care - Church Plus Manager  
**Foco:** Experiência do Admin e Usuários

---

## 📋 Índice

### Prioridade Alta

1. [Loading States com Skeletons](#1--loading-states-com-skeletons)
2. [Busca com Debounce](#2--busca-com-debounce)
3. [Página de Relatórios Funcional](#3--página-de-relatórios-funcional)
4. [Empty States Melhores](#4--empty-states-melhores)

### Prioridade Média

5. [Feedback Visual de Ações](#5--feedback-visual-de-ações)
6. [Shortcuts de Teclado (Admin)](#6--shortcuts-de-teclado-admin)
7. [Dashboard Personalizável](#7--dashboard-personalizável)
8. [Notificações In-App](#8--notificações-in-app)
9. [Tour de Onboarding](#9--tour-de-onboarding)
10. [Modo Offline Melhorado](#10--modo-offline-melhorado)

### Prioridade Baixa

11. [Dark Mode Consistente](#11--dark-mode-consistente)
12. [Acessibilidade (a11y)](#12--acessibilidade-a11y)
13. [Performance](#13--performance)
14. [Internacionalização (i18n)](#14--internacionalização-i18n)

### Features Específicas

15. [Melhorias para Admin](#15--melhorias-para-admin)
16. [Melhorias para Usuários](#16--melhorias-para-usuários)

### Design Inclusivo

17. [Design Multi-Geracional (20-60+ anos)](#17--design-multi-geracional-20-60-anos)
18. [Sistema de Convite Self-Service para Pastores](#18--sistema-de-convite-self-service-para-pastores)

---

# 🔴 PRIORIDADE ALTA

> Impacto imediato na experiência do usuário

---

## 1. 🦴 Loading States com Skeletons

### Problema

Muitas páginas usam simples texto "Carregando..." que não transmite profissionalismo e causa percepção de lentidão.

### Páginas Afetadas

- `Pastors.tsx` - linha 270: "Carregando..."
- `Users.tsx` - loading básico
- `ElectionVoting.tsx` - linha 99: "Carregando nomeações..."
- `UnifiedElection.tsx` - linha 268: "Carregando..."
- `ElectionResults.tsx` - loading state básico
- `ElectionManage.tsx` - loading state básico

### Solução Proposta

Implementar skeleton loaders que imitam a estrutura do conteúdo:

```tsx
// Exemplo de Skeleton para lista de usuários
const UserListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);
```

### Componentes Existentes

O projeto já possui `client/src/components/skeletons/` e `client/src/components/ui/skeleton.tsx`

### Esforço: Baixo (1-2 dias)

### Impacto: Alto

---

## 2. 🔍 Busca com Debounce

### Problema

A busca em `Users.tsx` e outras páginas dispara a cada tecla digitada, causando:

- Muitas re-renderizações
- Possíveis chamadas excessivas à API
- Lag na digitação

### Páginas Afetadas

- `Users.tsx` - busca por nome
- `Calendar.tsx` - filtro de eventos
- `Chat.tsx` - busca de conversas
- `ElectionConfig.tsx` - filtro de candidatos

### Solução Proposta

```tsx
// Hook useDebounce
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Uso
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

// Filtrar usando debouncedSearch
const filteredUsers = users.filter(u =>
  u.name.toLowerCase().includes(debouncedSearch.toLowerCase())
);
```

### Esforço: Baixo (0.5 dia)

### Impacto: Médio-Alto

---

## 3. 📊 Página de Relatórios Funcional

### Problema

`Reports.tsx` está em modo "desenvolvimento" com placeholders vazios, não oferecendo valor ao admin.

### Estado Atual

- Banner "Página em Desenvolvimento"
- Cards vazios com "Implementar aqui"
- Nenhuma funcionalidade real

### Solução Proposta

Implementar relatórios úteis:

#### Relatório 1: Frequência de Membros

```tsx
// Gráfico de presença nos cultos/eventos
<Card>
  <CardTitle>Frequência nos Últimos 30 Dias</CardTitle>
  <BarChart data={frequencyData} />
</Card>
```

#### Relatório 2: Crescimento da Igreja

```tsx
// Novos membros vs saídas
<Card>
  <CardTitle>Crescimento Mensal</CardTitle>
  <LineChart data={growthData} />
</Card>
```

#### Relatório 3: Metas de Batismo

```tsx
// Progresso vs Meta
<Card>
  <CardTitle>Batismos 2026</CardTitle>
  <Progress value={(batismos / meta) * 100} />
  <span>
    {batismos} de {meta} ({((batismos / meta) * 100).toFixed(0)}%)
  </span>
</Card>
```

#### Relatório 4: Atividades por Missionário

```tsx
// Ranking de engajamento
<Card>
  <CardTitle>Top 10 Missionários</CardTitle>
  <Table>
    {missionaries.map(m => (
      <TableRow>
        <TableCell>{m.name}</TableCell>
        <TableCell>{m.visits}</TableCell>
        <TableCell>{m.estudos}</TableCell>
      </TableRow>
    ))}
  </Table>
</Card>
```

#### Relatório 5: Gamificação

```tsx
// Distribuição por Monte
<Card>
  <CardTitle>Distribuição por Monte</CardTitle>
  <PieChart data={mountainDistribution} />
</Card>
```

### Esforço: Médio (3-5 dias)

### Impacto: Alto

---

## 4. 🫙 Empty States Melhores

### Problema

Quando não há dados, a UI fica confusa ou vazia sem orientação.

### Exemplos de Situações

- Lista de usuários vazia após filtro
- Nenhum evento no calendário
- Chat sem conversas
- Sem pedidos de oração

### Solução Proposta

```tsx
// Componente reutilizável
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-sm mb-4">{description}</p>
    {action && (
      <Button onClick={action.onClick}>
        <Plus className="w-4 h-4 mr-2" />
        {action.label}
      </Button>
    )}
  </div>
);

// Uso
<EmptyState
  icon={Users}
  title="Nenhum usuário encontrado"
  description="Não encontramos usuários com esses filtros. Tente ajustar a busca ou cadastre um novo usuário."
  action={{
    label: 'Cadastrar Usuário',
    onClick: () => setShowNewUserModal(true),
  }}
/>;
```

### Esforço: Baixo (1 dia)

### Impacto: Médio

---

# 🟡 PRIORIDADE MÉDIA

> Melhoria significativa de experiência

---

## 5. ✨ Feedback Visual de Ações

### Problema

Usuários não têm certeza se ações foram concluídas com sucesso.

### Solução Proposta

#### Animações de Sucesso

```tsx
// Componente de feedback
const SuccessFeedback = () => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
  >
    <motion.div
      initial={{ scale: 0.5 }}
      animate={{ scale: 1 }}
      className="bg-green-500 text-white rounded-full p-6"
    >
      <Check className="w-12 h-12" />
    </motion.div>
  </motion.div>
);
```

#### Confirmação de Ações Destrutivas

```tsx
// Dialog de confirmação aprimorado
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="w-5 h-5" />
        Tem certeza?
      </AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. O usuário será removido permanentemente.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction className="bg-red-600 hover:bg-red-700">Sim, remover</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Progress Indicators para Uploads

```tsx
// Upload com progresso
<div className="relative">
  <Progress value={uploadProgress} className="h-2" />
  <span className="text-xs text-muted-foreground">
    {uploadProgress}% - {fileName}
  </span>
</div>
```

### Esforço: Médio (2-3 dias)

### Impacto: Médio

---

## 6. ⌨️ Shortcuts de Teclado (Admin)

### Problema

Admins precisam navegar muito com mouse, perdendo produtividade.

### Solução Proposta

#### Shortcuts Sugeridos

| Atalho         | Ação                           |
| -------------- | ------------------------------ |
| `Ctrl/Cmd + K` | Busca global (command palette) |
| `Ctrl/Cmd + N` | Novo (usuário/evento/etc)      |
| `Esc`          | Fechar modal atual             |
| `Ctrl/Cmd + S` | Salvar formulário              |
| `Ctrl/Cmd + /` | Ver todos os atalhos           |

#### Implementação

```tsx
// Hook useKeyboardShortcut
import { useEffect } from 'react';

export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === !!modifiers.ctrl &&
        e.shiftKey === !!modifiers.shift &&
        e.altKey === !!modifiers.alt
      ) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, modifiers]);
};

// Uso
useKeyboardShortcut('k', () => setSearchOpen(true), { ctrl: true });
```

#### Command Palette (Ctrl+K)

```tsx
// Componente de busca global
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Buscar..." />
  <CommandList>
    <CommandGroup heading="Navegação">
      <CommandItem onSelect={() => navigate('/dashboard')}>
        <LayoutDashboard className="mr-2" />
        Dashboard
      </CommandItem>
      <CommandItem onSelect={() => navigate('/users')}>
        <Users className="mr-2" />
        Usuários
      </CommandItem>
    </CommandGroup>
    <CommandGroup heading="Ações">
      <CommandItem onSelect={() => setShowNewUser(true)}>
        <UserPlus className="mr-2" />
        Novo Usuário
      </CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

### Esforço: Médio (2-3 dias)

### Impacto: Alto (para admins)

---

## 7. 📊 Dashboard Personalizável

### Problema

Dashboard mostra mesma informação para todos, sem personalização.

### Solução Proposta

#### Widgets Configuráveis

```tsx
// Configuração de widgets
interface DashboardWidget {
  id: string;
  type: 'stats' | 'chart' | 'list' | 'calendar';
  title: string;
  size: 'sm' | 'md' | 'lg';
  visible: boolean;
  position: number;
}

// Widget selector
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" size="sm">
      <Settings className="w-4 h-4 mr-2" />
      Personalizar
    </Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Configurar Dashboard</SheetTitle>
    </SheetHeader>
    <div className="space-y-4 mt-4">
      {widgets.map(widget => (
        <div key={widget.id} className="flex items-center justify-between">
          <span>{widget.title}</span>
          <Switch checked={widget.visible} onCheckedChange={v => toggleWidget(widget.id, v)} />
        </div>
      ))}
    </div>
  </SheetContent>
</Sheet>;
```

#### Modo Compacto/Expandido

```tsx
// Toggle de visualização
<ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
  <ToggleGroupItem value="compact">
    <LayoutList className="w-4 h-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="expanded">
    <LayoutGrid className="w-4 h-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

### Esforço: Alto (5-7 dias)

### Impacto: Médio

---

## 8. 🔔 Notificações In-App

### Problema

Notificações dependem apenas de push, sem histórico ou visualização in-app.

### Solução Proposta

#### Badge de Notificações

```tsx
// No header/navbar
<Button variant="ghost" className="relative">
  <Bell className="w-5 h-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</Button>
```

#### Centro de Notificações

```tsx
// Dropdown/Sheet com notificações
<Sheet>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Notificações</SheetTitle>
      <Button variant="ghost" size="sm">
        Marcar todas como lidas
      </Button>
    </SheetHeader>
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">Todas</TabsTrigger>
        <TabsTrigger value="unread">Não lidas</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        {notifications.map(n => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </TabsContent>
    </Tabs>
  </SheetContent>
</Sheet>
```

### Esforço: Médio (3-4 dias)

### Impacto: Médio

---

## 9. 🎓 Tour de Onboarding

### Problema

Novos usuários não sabem usar o sistema, precisam de ajuda.

### Solução Proposta

#### Biblioteca Recomendada

- `react-joyride` ou `driver.js`

#### Implementação

```tsx
import Joyride, { Step } from 'react-joyride';

const steps: Step[] = [
  {
    target: '.dashboard-stats',
    content: 'Aqui você vê suas estatísticas principais',
    disableBeacon: true,
  },
  {
    target: '.bottom-nav',
    content: 'Use a barra inferior para navegar',
  },
  {
    target: '.gamification-card',
    content: 'Acompanhe seu progresso na jornada 7Mount',
  },
];

// No componente
<Joyride
  steps={steps}
  run={isFirstAccess}
  continuous
  showProgress
  showSkipButton
  styles={{
    options: {
      primaryColor: '#3b82f6',
    },
  }}
/>;
```

### Esforço: Médio (2-3 dias)

### Impacto: Médio (novos usuários)

---

## 10. 📴 Modo Offline Melhorado

### Problema

Pull to refresh está desabilitado e indicação de offline é fraca.

### Solução Proposta

#### Indicador Visual Claro

```tsx
// Banner de status offline
const OfflineBanner = () => {
  const { isOnline } = useOffline();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-50">
      <WifiOff className="w-4 h-4 inline mr-2" />
      Você está offline. Algumas funcionalidades podem estar limitadas.
    </div>
  );
};
```

#### Fila de Sincronização Visível

```tsx
// Indicador de pendências
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Cloud className="w-4 h-4" />
  <span>{pendingSync} ações aguardando sincronização</span>
</div>
```

### Esforço: Médio (2-3 dias)

### Impacto: Médio

---

# 🟢 PRIORIDADE BAIXA

> Nice to have - melhorias incrementais

---

## 11. 🌙 Dark Mode Consistente

### Problema

Algumas páginas/componentes podem não estar adaptados ao dark mode.

### Verificar

- [ ] Gráficos (Chart.tsx)
- [ ] Cards de estatísticas
- [ ] Modais
- [ ] Toasts
- [ ] Bordas e sombras

### Esforço: Baixo (1 dia)

### Impacto: Baixo

---

## 12. ♿ Acessibilidade (a11y)

### Itens a Verificar

- [ ] Labels para screen readers (`aria-label`)
- [ ] Contraste adequado (WCAG AA)
- [ ] Navegação por teclado
- [ ] Focus visible
- [ ] Alt text em imagens
- [ ] Hierarquia de headings

### Ferramentas

- Lighthouse (Chrome DevTools)
- axe DevTools
- WAVE

### Esforço: Médio (3-4 dias)

### Impacto: Baixo-Médio

---

## 13. ⚡ Performance

### Melhorias Sugeridas

#### Lazy Loading de Páginas

```tsx
// Já implementado parcialmente
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
```

#### Virtualização de Listas Longas

```tsx
// Para listas com muitos itens
import { VirtualList } from '@/components/ui/virtual-list';

<VirtualList
  items={users}
  height={500}
  itemHeight={72}
  renderItem={user => <UserCard user={user} />}
/>;
```

#### Cache de Imagens

```tsx
// Usar React Query para cache de dados
// Implementar service worker para cache de assets
```

### Esforço: Médio (3-5 dias)

### Impacto: Médio

---

## 14. 🌍 Internacionalização (i18n)

### Estado Atual

- Pasta `client/src/i18n/` existe
- Verificar cobertura de textos

### A Fazer

- [ ] Mapear todos os textos hardcoded
- [ ] Criar arquivos de tradução (pt, en, es)
- [ ] Implementar seletor de idioma
- [ ] Formatar datas/números por locale

### Esforço: Alto (5-7 dias)

### Impacto: Baixo (a menos que tenha usuários internacionais)

---

# 👔 MELHORIAS PARA ADMIN

## 15. 📈 Features Específicas para Administradores

| Feature                          | Benefício                  | Esforço | Prioridade |
| -------------------------------- | -------------------------- | ------- | ---------- |
| Dashboard com métricas reais     | Decisões baseadas em dados | Médio   | Alta       |
| Bulk actions (selecionar vários) | Economia de tempo          | Médio   | Alta       |
| Exportação para Excel            | Relatórios externos        | Baixo   | Média      |
| Logs de auditoria                | Rastreabilidade            | Alto    | Média      |
| Filtros salvos/favoritos         | Produtividade              | Médio   | Baixa      |
| Comparativo período anterior     | Análise de tendências      | Médio   | Baixa      |

### Dashboard com Métricas Reais

```tsx
// Cards com dados reais da API
<Card>
  <CardHeader>
    <CardTitle>Membros Ativos</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">{activeMembers}</div>
    <div className="text-sm text-muted-foreground flex items-center">
      {trend > 0 ? (
        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
      ) : (
        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
      )}
      {Math.abs(trend)}% vs mês anterior
    </div>
  </CardContent>
</Card>
```

### Bulk Actions

```tsx
// Seleção múltipla
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>
        <Checkbox checked={selectedAll} onCheckedChange={toggleSelectAll} />
      </TableHead>
      <TableHead>Nome</TableHead>
      ...
    </TableRow>
  </TableHeader>
</Table>;

{
  selectedUsers.length > 0 && (
    <div className="fixed bottom-20 left-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
      <span>{selectedUsers.length} selecionados</span>
      <div className="flex gap-2">
        <Button variant="outline">Exportar</Button>
        <Button variant="destructive">Remover</Button>
      </div>
    </div>
  );
}
```

---

# 👤 MELHORIAS PARA USUÁRIOS

## 16. 📱 Features Específicas para Usuários Comuns

| Feature                   | Benefício     | Esforço | Prioridade |
| ------------------------- | ------------- | ------- | ---------- |
| Check-in rápido (1 toque) | Engajamento   | Baixo   | Alta       |
| Meu progresso visual      | Motivação     | Baixo   | Alta       |
| Lembretes personalizados  | Engajamento   | Médio   | Média      |
| Histórico de atividades   | Transparência | Baixo   | Média      |
| Compartilhar conquistas   | Social        | Médio   | Baixa      |

### Check-in Rápido

```tsx
// Botão flutuante de check-in
<Button
  className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg"
  onClick={handleQuickCheckIn}
>
  <Check className="w-6 h-6" />
</Button>

// Ou no header do dashboard
<Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
  <CardContent className="flex items-center justify-between py-4">
    <div>
      <h3 className="font-semibold">Bom dia, {user.name}!</h3>
      <p className="text-sm opacity-90">Já fez seu devocional hoje?</p>
    </div>
    <Button variant="secondary" onClick={handleCheckIn}>
      <Check className="w-4 h-4 mr-2" />
      Check-in
    </Button>
  </CardContent>
</Card>
```

### Progresso Visual

```tsx
// Card de resumo semanal
<Card>
  <CardHeader>
    <CardTitle>Sua Semana</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-7 gap-1">
      {weekDays.map((day, i) => (
        <div
          key={i}
          className={cn(
            'aspect-square rounded flex items-center justify-center text-xs',
            day.completed ? 'bg-green-500 text-white' : 'bg-muted'
          )}
        >
          {day.initial}
        </div>
      ))}
    </div>
    <p className="text-sm text-muted-foreground mt-2">{completedDays} de 7 dias esta semana</p>
  </CardContent>
</Card>
```

---

# 🌈 DESIGN INCLUSIVO

> Garantir usabilidade para todas as faixas etárias

---

## 17. 👨‍👨‍👧‍👦 Design Multi-Geracional (20-60+ anos)

### Desafio

O app precisa ser usado por pastores e membros de diferentes gerações:

- **20-35 anos:** Nativos digitais, preferem rapidez e atalhos
- **35-50 anos:** Familiarizados com tecnologia, valorizam eficiência
- **50-60+ anos:** Podem ter dificuldades visuais/cognitivas, preferem clareza

### Princípios de Design Universal

#### 1. 📏 Tamanho de Texto e Elementos

```tsx
// Sistema de tamanho configurável
const textSizes = {
  sm: {
    base: 'text-sm', // 14px
    lg: 'text-base', // 16px
    xl: 'text-lg', // 18px
  },
  md: {
    base: 'text-base', // 16px (padrão)
    lg: 'text-lg', // 18px
    xl: 'text-xl', // 20px
  },
  lg: {
    base: 'text-lg', // 18px
    lg: 'text-xl', // 20px
    xl: 'text-2xl', // 24px
  },
};

// Settings
<Card>
  <CardHeader>
    <CardTitle>Tamanho do Texto</CardTitle>
  </CardHeader>
  <CardContent>
    <RadioGroup value={textSize} onValueChange={setTextSize}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="sm" id="sm" />
        <Label htmlFor="sm" className="text-sm">
          Pequeno
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="md" id="md" />
        <Label htmlFor="md" className="text-base">
          Médio (Recomendado)
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="lg" id="lg" />
        <Label htmlFor="lg" className="text-lg">
          Grande
        </Label>
      </div>
    </RadioGroup>
  </CardContent>
</Card>;
```

**Recomendações:**

- **Botões:** Mínimo 44x44px (Apple) ou 48x48px (Material)
- **Texto corpo:** 16px ou maior (18px para 50+)
- **Títulos:** 20-24px
- **Ícones:** Mínimo 24x24px

#### 2. 🎨 Contraste e Cores

```tsx
// Verificação de contraste WCAG AAA
const contrastRatios = {
  normal: 4.5,    // WCAG AA
  large: 3,       // WCAG AA (18pt+)
  enhanced: 7,    // WCAG AAA (recomendado 50+)
};

// Modo de alto contraste
<Switch
  checked={highContrast}
  onCheckedChange={setHighContrast}
  aria-label="Ativar alto contraste"
/>

// CSS aplicado
.high-contrast {
  --primary: hsl(210, 100%, 30%);      /* Azul mais escuro */
  --background: hsl(0, 0%, 100%);      /* Branco puro */
  --foreground: hsl(0, 0%, 0%);        /* Preto puro */
  --border: hsl(0, 0%, 20%);           /* Cinza escuro */
}
```

**Evitar:**

- ❌ Cinza claro em fundo branco
- ❌ Azul claro em fundo branco
- ❌ Informação apenas em cores (usar ícones também)

#### 3. 🔤 Tipografia Clara

```tsx
// Fonte system com fallbacks legíveis
const fontFamily = {
  sans: [
    'Inter',                    // Fonte principal
    '-apple-system',            // iOS/macOS
    'BlinkMacSystemFont',       // macOS
    'Segoe UI',                 // Windows
    'Roboto',                   // Android
    'Arial',                    // Fallback universal
    'sans-serif'
  ].join(', '),

  // Para números (melhor legibilidade)
  mono: [
    'SF Mono',
    'Consolas',
    'monospace'
  ].join(', ')
};

// Configuração de line-height generosa
.text-body {
  line-height: 1.6;           /* Espaçamento entre linhas */
  letter-spacing: 0.01em;     /* Leve espaçamento entre letras */
}
```

**Boas práticas:**

- ✅ Fonte sans-serif (sem serifa) para telas
- ✅ Line-height 1.5-1.6
- ✅ Evitar itálico em textos longos
- ✅ Negrito para destaque (não apenas cor)

#### 4. 📱 Layout Simplificado

```tsx
// Princípio: Uma ação principal por tela
<Card>
  <CardHeader>
    <CardTitle className="text-2xl">Cadastrar Igreja</CardTitle>
    <CardDescription className="text-base">
      Preencha os dados da igreja abaixo
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Espaçamento generoso entre campos */}
    <div className="space-y-2">
      <Label htmlFor="name" className="text-base font-medium">
        Nome da Igreja *
      </Label>
      <Input
        id="name"
        placeholder="Ex: Igreja Central"
        className="h-12 text-base"  {/* Input maior */}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="address" className="text-base font-medium">
        Endereço Completo
      </Label>
      <Textarea
        id="address"
        placeholder="Rua, número, bairro, cidade"
        className="min-h-[100px] text-base"
        rows={4}
      />
    </div>
  </CardContent>

  <CardFooter className="flex gap-3">
    {/* Botões com texto claro, sem ícones ambíguos */}
    <Button variant="outline" size="lg" className="flex-1">
      Cancelar
    </Button>
    <Button size="lg" className="flex-1">
      Salvar Igreja
    </Button>
  </CardFooter>
</Card>
```

**Princípios:**

- ✅ 1 objetivo por página
- ✅ Espaçamento generoso (padding/margin)
- ✅ Hierarquia visual clara
- ✅ Evitar múltiplas colunas em mobile

#### 5. 💬 Linguagem Clara e Direta

```tsx
// ❌ Evitar jargões técnicos
<Button>Sincronizar dados via WebSocket</Button>

// ✅ Linguagem simples
<Button>
  <RefreshCw className="w-5 h-5 mr-2" />
  Atualizar informações
</Button>

// ✅ Mensagens de erro úteis
<Alert variant="destructive">
  <AlertTriangle className="h-5 w-5" />
  <AlertTitle>Não foi possível salvar</AlertTitle>
  <AlertDescription className="text-base">
    Verifique se todos os campos obrigatórios (*) foram preenchidos.
  </AlertDescription>
</Alert>

// ❌ Mensagem técnica
"Error: Validation failed at field 'name' - required constraint violated"

// ✅ Mensagem clara
"Por favor, preencha o nome da igreja antes de continuar."
```

#### 6. 🎯 Navegação Consistente

```tsx
// Breadcrumbs sempre visíveis
<nav className="mb-4">
  <ol className="flex items-center space-x-2 text-sm">
    <li>
      <Link to="/dashboard" className="text-blue-600 hover:underline">
        Início
      </Link>
    </li>
    <ChevronRight className="w-4 h-4 text-gray-400" />
    <li>
      <Link to="/settings" className="text-blue-600 hover:underline">
        Configurações
      </Link>
    </li>
    <ChevronRight className="w-4 h-4 text-gray-400" />
    <li className="text-gray-600 font-medium">
      Distrito
    </li>
  </ol>
</nav>

// Botão voltar sempre presente
<Button variant="ghost" onClick={() => navigate(-1)}>
  <ArrowLeft className="w-5 h-5 mr-2" />
  Voltar
</Button>
```

#### 7. ⏱️ Feedback Imediato

```tsx
// Loading com mensagem clara
<div className="flex flex-col items-center justify-center py-8">
  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
  <p className="text-lg font-medium">Salvando suas informações...</p>
  <p className="text-sm text-gray-500">Aguarde um momento</p>
</div>

// Sucesso com confirmação visual
<Alert variant="success" className="border-green-500 bg-green-50">
  <CheckCircle2 className="h-5 w-5 text-green-600" />
  <AlertTitle>Igreja cadastrada com sucesso!</AlertTitle>
  <AlertDescription>
    Você pode visualizar todas as igrejas na página de Igrejas.
  </AlertDescription>
</Alert>

// Progresso com etapas claras
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Importando membros...</span>
    <span className="font-medium">{progress}%</span>
  </div>
  <Progress value={progress} className="h-3" />
  <p className="text-xs text-gray-500">
    {current} de {total} membros processados
  </p>
</div>
```

#### 8. 🎓 Ajuda Contextual

```tsx
// Tooltips com explicações
<div className="flex items-center gap-2">
  <Label htmlFor="code">Código do Distrito</Label>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">
          Código único de 3-6 letras para identificar seu distrito.
          Exemplo: "SPCEN" para São Paulo Central.
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>

// Link para ajuda sempre visível
<Button variant="link" onClick={() => setShowHelp(true)}>
  <HelpCircle className="w-4 h-4 mr-2" />
  Precisa de ajuda?
</Button>
```

### Configurações de Acessibilidade

```tsx
// Painel de preferências
<Card>
  <CardHeader>
    <CardTitle>Preferências de Visualização</CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Tamanho do texto */}
    <div>
      <Label className="text-base font-medium">Tamanho do Texto</Label>
      <Slider
        value={[fontSize]}
        onValueChange={([value]) => setFontSize(value)}
        min={14}
        max={20}
        step={2}
        className="mt-2"
      />
      <div className="flex justify-between text-sm text-gray-500 mt-1">
        <span>Pequeno</span>
        <span>Grande</span>
      </div>
    </div>

    {/* Alto contraste */}
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-base font-medium">Alto Contraste</Label>
        <p className="text-sm text-gray-500">Aumenta o contraste para melhor visualização</p>
      </div>
      <Switch checked={highContrast} onCheckedChange={setHighContrast} />
    </div>

    {/* Reduzir animações */}
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-base font-medium">Reduzir Animações</Label>
        <p className="text-sm text-gray-500">Remove efeitos de movimento</p>
      </div>
      <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
    </div>

    {/* Modo escuro */}
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-base font-medium">Tema Escuro</Label>
        <p className="text-sm text-gray-500">Reduz o brilho da tela</p>
      </div>
      <Switch checked={darkMode} onCheckedChange={setDarkMode} />
    </div>
  </CardContent>
</Card>
```

### Esforço: Alto (5-7 dias)

### Impacto: Muito Alto (essencial para inclusão)

---

## 18. 🔗 Sistema de Convite Self-Service para Pastores

### Visão Geral

Sistema de onboarding completo para que pastores possam configurar seu distrito e começar a usar o app sem depender do superadmin.

### Fluxo do Processo

```
SUPERADMIN                          PASTOR
─────────                           ──────
    │                                  │
    ├─► Gera link de convite           │
    │   (token único + expiração)      │
    │                                  │
    │────── Envia link ───────────────►│
    │                                  │
    │                                  ├─► Acessa link
    │                                  │
    │                                  ├─► WIZARD 5 PASSOS
    │                                  │
    │                                  │   ╔════════════════════╗
    │                                  │   ║ 1. Dados Pessoais  ║
    │                                  │   ╚════════════════════╝
    │                                  │   ╔════════════════════╗
    │                                  │   ║ 2. Criar Distrito  ║
    │                                  │   ╚════════════════════╝
    │                                  │   ╔════════════════════╗
    │                                  │   ║ 3. Cad. Igrejas    ║
    │                                  │   ╚════════════════════╝
    │                                  │   ╔════════════════════╗
    │                                  │   ║ 4. Import. Excel   ║
    │                                  │   ╚════════════════════╝
    │                                  │   ╔════════════════════╗
    │                                  │   ║ 5. Definir Senha   ║
    │                                  │   ╚════════════════════╝
    │                                  │
    │                                  ├─► Tudo pronto! 🎉
    │                                  │
    │                                  └─► Redirect /dashboard
```

### Wizard - Design Inclusivo

#### Estrutura do Stepper

```tsx
// Stepper com progresso visual claro
<div className="max-w-4xl mx-auto p-6">
  {/* Header com progresso */}
  <div className="mb-8">
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-3xl font-bold">Bem-vindo ao 7Care!</h1>
      <Badge variant="outline" className="text-base px-4 py-2">
        Passo {currentStep} de 5
      </Badge>
    </div>

    {/* Progress bar */}
    <Progress value={(currentStep / 5) * 100} className="h-3" />

    {/* Steps indicator */}
    <div className="flex items-center justify-between mt-6">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            'flex flex-col items-center gap-2',
            index + 1 === currentStep && 'text-blue-600',
            index + 1 < currentStep && 'text-green-600',
            index + 1 > currentStep && 'text-gray-400'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold border-2',
              index + 1 === currentStep && 'bg-blue-600 text-white border-blue-600',
              index + 1 < currentStep && 'bg-green-600 text-white border-green-600',
              index + 1 > currentStep && 'bg-gray-100 border-gray-300'
            )}
          >
            {index + 1 < currentStep ? <Check className="w-6 h-6" /> : index + 1}
          </div>
          <span className="text-sm font-medium text-center max-w-[100px]">{step.label}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Conteúdo do passo atual */}
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-2xl">{steps[currentStep - 1].title}</CardTitle>
      <CardDescription className="text-base">{steps[currentStep - 1].description}</CardDescription>
    </CardHeader>
    <CardContent>{renderStep(currentStep)}</CardContent>
  </Card>

  {/* Navegação */}
  <div className="flex justify-between gap-4">
    <Button
      variant="outline"
      size="lg"
      onClick={handleBack}
      disabled={currentStep === 1}
      className="min-w-[120px]"
    >
      <ArrowLeft className="w-5 h-5 mr-2" />
      Voltar
    </Button>

    <Button size="lg" onClick={handleNext} disabled={!isStepValid} className="min-w-[120px]">
      {currentStep === 5 ? (
        <>Finalizar</>
      ) : (
        <>
          Próximo
          <ArrowRight className="w-5 h-5 ml-2" />
        </>
      )}
    </Button>
  </div>
</div>
```

#### Passo 1: Dados Pessoais (Design Acessível)

```tsx
<div className="space-y-8 max-w-2xl">
  {/* Foto com preview grande */}
  <div className="flex flex-col items-center gap-4">
    <Avatar className="w-32 h-32">
      <AvatarImage src={photo} />
      <AvatarFallback className="text-3xl">
        {name
          .split(' ')
          .map(n => n[0])
          .join('')}
      </AvatarFallback>
    </Avatar>
    <Button variant="outline" size="lg" onClick={handlePhotoClick}>
      <Camera className="w-5 h-5 mr-2" />
      Adicionar Foto (opcional)
    </Button>
  </div>

  {/* Campos com espaçamento generoso */}
  <div className="space-y-6">
    <div className="space-y-3">
      <Label htmlFor="name" className="text-lg font-medium">
        Nome Completo *
      </Label>
      <Input
        id="name"
        placeholder="Ex: João da Silva"
        value={name}
        onChange={e => setName(e.target.value)}
        className="h-14 text-lg"
        required
      />
    </div>

    <div className="space-y-3">
      <Label htmlFor="email" className="text-lg font-medium">
        Email *
      </Label>
      <Input
        id="email"
        type="email"
        placeholder="Ex: joao.silva@igreja.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="h-14 text-lg"
        required
      />
      <p className="text-sm text-gray-500">Você usará este email para fazer login no sistema</p>
    </div>

    <div className="space-y-3">
      <Label htmlFor="phone" className="text-lg font-medium">
        Telefone
      </Label>
      <Input
        id="phone"
        type="tel"
        placeholder="(11) 99999-9999"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="h-14 text-lg"
      />
    </div>
  </div>
</div>
```

#### Passo 2: Criar Distrito

```tsx
<div className="space-y-8 max-w-2xl">
  <Alert className="border-blue-500 bg-blue-50">
    <Info className="h-5 w-5 text-blue-600" />
    <AlertTitle className="text-lg">O que é um Distrito?</AlertTitle>
    <AlertDescription className="text-base">
      Um distrito é um conjunto de igrejas sob sua supervisão pastoral. Você poderá gerenciar todas
      as igrejas do seu distrito através do app.
    </AlertDescription>
  </Alert>

  <div className="space-y-6">
    <div className="space-y-3">
      <Label htmlFor="districtName" className="text-lg font-medium">
        Nome do Distrito *
      </Label>
      <Input
        id="districtName"
        placeholder="Ex: Distrito Central de São Paulo"
        value={districtName}
        onChange={e => setDistrictName(e.target.value)}
        className="h-14 text-lg"
        required
      />
    </div>

    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="districtCode" className="text-lg font-medium">
          Código do Distrito
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-5 h-5 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm text-base p-4">
              <p>
                Código único de 3-6 letras. Exemplo: "SPCEN" para São Paulo Central. Deixe em branco
                para gerar automaticamente.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        id="districtCode"
        placeholder="Ex: SPCEN (ou deixe vazio)"
        value={districtCode}
        onChange={e => setDistrictCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="h-14 text-lg uppercase"
      />
      {districtCode === '' && (
        <p className="text-sm text-gray-500">Será gerado automaticamente baseado no nome</p>
      )}
    </div>

    <div className="space-y-3">
      <Label htmlFor="description" className="text-lg font-medium">
        Descrição (opcional)
      </Label>
      <Textarea
        id="description"
        placeholder="Ex: Distrito localizado na região central de SP, composto por 5 igrejas"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="min-h-[120px] text-lg"
        rows={4}
      />
    </div>
  </div>
</div>
```

#### Passo 3: Cadastrar Igrejas

```tsx
<div className="space-y-8 max-w-3xl">
  <Alert className="border-green-500 bg-green-50">
    <CheckCircle2 className="h-5 w-5 text-green-600" />
    <AlertTitle className="text-lg">Cadastre suas igrejas</AlertTitle>
    <AlertDescription className="text-base">
      Você pode cadastrar quantas igrejas quiser agora, ou adicionar mais depois através do menu
      Configurações.
    </AlertDescription>
  </Alert>

  {/* Lista de igrejas */}
  <div className="space-y-4">
    {churches.map((church, index) => (
      <Card key={index} className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Igreja {index + 1}</CardTitle>
            {churches.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeChurch(index)}>
                <Trash2 className="w-5 h-5 text-red-500" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Nome da Igreja *</Label>
            <Input
              placeholder="Ex: Igreja Central"
              value={church.name}
              onChange={e => updateChurch(index, 'name', e.target.value)}
              className="h-12 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Endereço</Label>
            <Textarea
              placeholder="Rua, número, bairro, cidade - UF"
              value={church.address}
              onChange={e => updateChurch(index, 'address', e.target.value)}
              className="min-h-[80px] text-base"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Email</Label>
              <Input
                type="email"
                placeholder="contato@igreja.com"
                value={church.email}
                onChange={e => updateChurch(index, 'email', e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Telefone</Label>
              <Input
                type="tel"
                placeholder="(11) 9999-9999"
                value={church.phone}
                onChange={e => updateChurch(index, 'phone', e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>

  {/* Botão adicionar igreja */}
  <Button variant="outline" size="lg" onClick={addChurch} className="w-full h-14 text-base">
    <Plus className="w-5 h-5 mr-2" />
    Adicionar Outra Igreja
  </Button>
</div>
```

#### Passo 4: Importar Membros (Excel)

```tsx
<div className="space-y-8 max-w-3xl">
  <Alert className="border-blue-500 bg-blue-50">
    <Info className="h-5 w-5 text-blue-600" />
    <AlertTitle className="text-lg">Importe sua base de membros</AlertTitle>
    <AlertDescription className="text-base">
      Se você já tem uma planilha com os dados dos membros, pode importá-la agora. Ou pode pular
      este passo e adicionar membros depois manualmente.
    </AlertDescription>
  </Alert>

  {!file ? (
    <>
      {/* Área de upload */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold mb-2">Arraste seu arquivo Excel aqui</h3>
        <p className="text-base text-gray-500 mb-4">ou clique para selecionar do computador</p>
        <p className="text-sm text-gray-400">Formatos aceitos: .xlsx, .xls (máx 10MB)</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botão baixar modelo */}
      <Card className="bg-gray-50">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="text-lg font-semibold mb-2">Não tem uma planilha?</h4>
              <p className="text-base text-gray-600 mb-4">
                Baixe nosso modelo de Excel com as colunas corretas e exemplos de como preencher.
              </p>
              <Button variant="outline" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Baixar Modelo de Planilha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão pular */}
      <div className="text-center">
        <Button variant="ghost" size="lg" onClick={handleSkip} className="text-base">
          Pular este passo (adicionar membros depois)
        </Button>
      </div>
    </>
  ) : (
    <>
      {/* Preview da importação */}
      <Card className="border-green-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <CardTitle className="text-xl">{file.name}</CardTitle>
                <CardDescription className="text-base">
                  {fileSize} • {membersCount} membros encontrados
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress bar durante import */}
          {isImporting && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Importando membros...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-3" />
              <p className="text-sm text-gray-500 mt-2">
                {importedCount} de {membersCount} membros processados
              </p>
            </div>
          )}

          {/* Preview dos dados */}
          <div className="bg-gray-50 rounded-lg p-4 max-h-[300px] overflow-auto">
            <h4 className="text-base font-semibold mb-3">Prévia dos primeiros 5 membros:</h4>
            <div className="space-y-2 text-sm">
              {previewMembers.map((member, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>
                    {member.name} • {member.email} • {member.church}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Erros se houver */}
          {errors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>
                {errors.length} {errors.length === 1 ? 'erro encontrado' : 'erros encontrados'}
              </AlertTitle>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside">
                  {errors.slice(0, 3).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
                {errors.length > 3 && <p className="mt-2">+ {errors.length - 3} outros erros</p>}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </>
  )}
</div>
```

#### Passo 5: Definir Senha

```tsx
<div className="space-y-8 max-w-xl mx-auto">
  <div className="text-center">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Shield className="w-10 h-10 text-green-600" />
    </div>
    <h2 className="text-2xl font-bold mb-2">Quase pronto!</h2>
    <p className="text-base text-gray-600">Crie uma senha segura para proteger sua conta</p>
  </div>

  <div className="space-y-6">
    <div className="space-y-3">
      <Label htmlFor="password" className="text-lg font-medium">
        Nova Senha *
      </Label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="h-14 text-lg pr-12"
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </Button>
      </div>

      {/* Força da senha */}
      <div className="space-y-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(level => (
            <div
              key={level}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                passwordStrength >= level
                  ? passwordStrength === 1
                    ? 'bg-red-500'
                    : passwordStrength === 2
                      ? 'bg-yellow-500'
                      : passwordStrength === 3
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                  : 'bg-gray-200'
              )}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600">
          {passwordStrength === 0 && ''}
          {passwordStrength === 1 && '⚠️ Senha fraca'}
          {passwordStrength === 2 && '⚠️ Senha média'}
          {passwordStrength === 3 && '✅ Senha boa'}
          {passwordStrength === 4 && '✅ Senha forte'}
        </p>
      </div>

      {/* Requisitos */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        <p className="font-medium mb-2">Sua senha deve ter:</p>
        <div className="flex items-center gap-2">
          {password.length >= 8 ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <X className="w-4 h-4 text-gray-400" />
          )}
          <span>Mínimo 8 caracteres</span>
        </div>
        <div className="flex items-center gap-2">
          {/[A-Z]/.test(password) ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <X className="w-4 h-4 text-gray-400" />
          )}
          <span>Uma letra maiúscula</span>
        </div>
        <div className="flex items-center gap-2">
          {/[0-9]/.test(password) ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <X className="w-4 h-4 text-gray-400" />
          )}
          <span>Um número</span>
        </div>
      </div>
    </div>

    <div className="space-y-3">
      <Label htmlFor="confirmPassword" className="text-lg font-medium">
        Confirmar Senha *
      </Label>
      <Input
        id="confirmPassword"
        type={showPassword ? 'text' : 'password'}
        placeholder="Digite a senha novamente"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        className="h-14 text-lg"
        required
      />
      {confirmPassword && password !== confirmPassword && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X className="w-4 h-4" />
          As senhas não coincidem
        </p>
      )}
    </div>
  </div>

  {/* Resumo final */}
  <Card className="bg-blue-50 border-blue-200">
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-600" />
        Resumo da Configuração
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-base">
      <div className="flex justify-between">
        <span className="text-gray-600">Distrito:</span>
        <span className="font-medium">{districtName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Igrejas:</span>
        <span className="font-medium">{churches.length}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Membros:</span>
        <span className="font-medium">
          {importedMembers > 0 ? importedMembers : 'Nenhum (pode adicionar depois)'}
        </span>
      </div>
    </CardContent>
  </Card>
</div>
```

### Tela de Sucesso

```tsx
<div className="max-w-2xl mx-auto text-center py-12">
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', duration: 0.6 }}
  >
    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <CheckCircle2 className="w-16 h-16 text-green-600" />
    </div>
  </motion.div>

  <h1 className="text-4xl font-bold mb-4">Configuração Concluída!</h1>

  <p className="text-xl text-gray-600 mb-8">
    Seu distrito foi configurado com sucesso e está pronto para uso.
  </p>

  {/* Resumo */}
  <Card className="text-left mb-8">
    <CardHeader>
      <CardTitle className="text-xl">O que foi configurado:</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-start gap-3">
        <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
        <div>
          <p className="font-medium text-lg">Distrito criado</p>
          <p className="text-gray-600">
            {districtName} ({districtCode})
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
        <div>
          <p className="font-medium text-lg">
            {churches.length} {churches.length === 1 ? 'igreja cadastrada' : 'igrejas cadastradas'}
          </p>
          <ul className="text-gray-600 list-disc list-inside">
            {churches.slice(0, 3).map(church => (
              <li key={church.id}>{church.name}</li>
            ))}
            {churches.length > 3 && <li>+ {churches.length - 3} outras</li>}
          </ul>
        </div>
      </div>

      {importedMembers > 0 && (
        <div className="flex items-start gap-3">
          <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <p className="font-medium text-lg">{importedMembers} membros importados</p>
            <p className="text-gray-600">Todos os membros foram adicionados com sucesso</p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>

  {/* Próximos passos */}
  <Card className="text-left mb-8">
    <CardHeader>
      <CardTitle className="text-xl">Próximos passos:</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-start gap-3 text-base">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-blue-600">1</span>
        </div>
        <p>Explore o Dashboard e conheça as funcionalidades</p>
      </div>
      <div className="flex items-start gap-3 text-base">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-blue-600">2</span>
        </div>
        <p>Configure os pontos de gamificação em Configurações</p>
      </div>
      <div className="flex items-start gap-3 text-base">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-blue-600">3</span>
        </div>
        <p>Adicione eventos no Calendário para engajar os membros</p>
      </div>
    </CardContent>
  </Card>

  {/* Botão ir para dashboard */}
  <Button size="lg" className="h-14 text-lg px-12" onClick={handleGoToDashboard}>
    Ir para o Dashboard
    <ArrowRight className="w-5 h-5 ml-2" />
  </Button>

  {/* Ajuda */}
  <p className="text-sm text-gray-500 mt-6">
    Precisa de ajuda?{' '}
    <Button variant="link" className="text-sm p-0 h-auto">
      Acesse nosso guia de primeiros passos
    </Button>
  </p>
</div>
```

### Interface para Superadmin Gerar Link

```tsx
// Em Pastors.tsx - botão adicional
<Card>
  <CardHeader>
    <CardTitle>Convidar Novo Pastor</CardTitle>
    <CardDescription>
      Gere um link de convite para que o pastor configure seu próprio distrito
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Opção 1: Email pré-preenchido */}
    <div className="space-y-2">
      <Label>Email do Pastor (opcional)</Label>
      <Input
        type="email"
        placeholder="pastor@email.com"
        value={inviteEmail}
        onChange={e => setInviteEmail(e.target.value)}
      />
      <p className="text-sm text-gray-500">
        Se preenchido, o email será pré-preenchido no cadastro
      </p>
    </div>

    {/* Opção 2: Validade */}
    <div className="space-y-2">
      <Label>Validade do Link</Label>
      <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="24h">24 horas</SelectItem>
          <SelectItem value="7d">7 dias</SelectItem>
          <SelectItem value="30d">30 dias</SelectItem>
          <SelectItem value="never">Sem expiração</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <Button onClick={handleGenerateInvite} size="lg" className="w-full">
      <Link className="w-5 h-5 mr-2" />
      Gerar Link de Convite
    </Button>
  </CardContent>
</Card>;

{
  /* Modal com link gerado */
}
<Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle className="text-2xl">Link de Convite Gerado</DialogTitle>
    </DialogHeader>

    <div className="space-y-6">
      {/* QR Code */}
      <div className="flex justify-center py-4">
        <QRCodeSVG value={inviteLink} size={200} />
      </div>

      {/* Link copiável */}
      <div className="space-y-2">
        <Label>Link de Convite</Label>
        <div className="flex gap-2">
          <Input value={inviteLink} readOnly className="font-mono text-sm" />
          <Button onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Informações */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como usar</AlertTitle>
        <AlertDescription>
          Envie este link para o pastor. Ao acessar, ele será guiado por um processo simples de 5
          passos para configurar seu distrito e começar a usar o app.
        </AlertDescription>
      </Alert>

      {/* Detalhes */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Validade:</span>
          <span className="font-medium">{expiryText}</span>
        </div>
        {inviteEmail && (
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{inviteEmail}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Gerado em:</span>
          <span className="font-medium">{new Date().toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleSendEmail}>
          <Mail className="w-4 h-4 mr-2" />
          Enviar por Email
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShareWhatsApp}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Compartilhar no WhatsApp
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>;
```

### Esforço: Alto (7-10 dias)

### Impacto: Muito Alto (autonomia para pastores)

---

## 🏆 Resumo de Priorização

### Fase 1 - Quick Wins (1 semana)

| #   | Feature           | Esforço  | Impacto |
| --- | ----------------- | -------- | ------- |
| 1   | Skeleton Loaders  | 1-2 dias | Alto    |
| 2   | Debounce na Busca | 0.5 dia  | Médio   |
| 3   | Empty States      | 1 dia    | Médio   |
| 4   | Check-in Rápido   | 0.5 dia  | Alto    |

### Fase 2 - Funcionalidades (2 semanas)

| #   | Feature              | Esforço  | Impacto |
| --- | -------------------- | -------- | ------- |
| 5   | Página de Relatórios | 3-5 dias | Alto    |
| 6   | Feedback Visual      | 2-3 dias | Médio   |
| 7   | Shortcuts de Teclado | 2-3 dias | Alto    |
| 8   | Notificações In-App  | 3-4 dias | Médio   |

### Fase 3 - Aprimoramento (3+ semanas)

| #   | Feature                  | Esforço  | Impacto     |
| --- | ------------------------ | -------- | ----------- |
| 9   | Tour de Onboarding       | 2-3 dias | Médio       |
| 10  | Dashboard Personalizável | 5-7 dias | Médio       |
| 11  | Modo Offline             | 2-3 dias | Médio       |
| 12  | Acessibilidade           | 3-4 dias | Baixo-Médio |

---

## 📝 Notas Técnicas

### Bibliotecas Recomendadas

- **Animações:** `framer-motion` (já no projeto?)
- **Onboarding:** `react-joyride` ou `driver.js`
- **Gráficos:** `recharts` (já no projeto)
- **Command Palette:** `cmdk` (já tem `command.tsx`)
- **Virtualização:** `@tanstack/react-virtual`

### Componentes Existentes para Reutilizar

- `client/src/components/ui/skeleton.tsx`
- `client/src/components/ui/command.tsx`
- `client/src/components/skeletons/`
- `client/src/components/ui/virtual-list.tsx`

---

**Documento criado em:** 28 de janeiro de 2026  
**Última atualização:** 28 de janeiro de 2026  
**Autor:** GitHub Copilot + Equipe 7Care
