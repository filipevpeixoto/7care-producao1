import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Search, Sparkles } from 'lucide-react';
import { Avatar } from './Avatar';
import { CardV2 } from './CardV2';
import { Chip } from './Chip';
import { Disclosure } from './Disclosure';
import { EmptyState } from './EmptyState';
import { EventChip } from './EventChip';
import { FAB } from './FAB';
import { GradHeader } from './GradHeader';
import { PageHeader } from './PageHeader';
import { Pill } from './Pill';
import { ProgressCard } from './ProgressCard';
import { RowItem } from './RowItem';
import { SearchBar } from './SearchBar';
import { StatCard, StatStrip } from './StatCard';
import { TaskItem } from './TaskItem';

const meta = {
  title: 'V2/Foundation',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children }: { children: ReactNode }) => (
  <div className="skin-v2 min-h-screen bg-[var(--v2-surface)] p-6 text-[var(--v2-text)]">
    <div className="mx-auto flex max-w-5xl flex-col gap-5">{children}</div>
  </div>
);

export const Headers: Story = {
  render: () => (
    <Frame>
      <PageHeader
        title="Dashboard pastoral"
        subtitle="Visao rapida da semana, dos cuidados e dos proximos passos."
      />
      <GradHeader
        eyebrow="Cuidado"
        title="Bom dia, Filipe"
        subtitle="Agenda, relacionamento e acompanhamento espiritual em uma leitura so."
        name="Filipe Vito"
      />
    </Frame>
  ),
};

export const StatsAndRows: Story = {
  render: () => (
    <Frame>
      <StatStrip>
        <StatCard value="124" label="Usuarios" tone="navy" />
        <StatCard value="18" label="Tarefas" tone="soft" />
        <StatCard value="9" label="Check-ins" tone="gold" />
      </StatStrip>
      <RowItem
        avatar={<Avatar name="Ana Paula" />}
        title="Ana Paula"
        sub="Visitante acompanhada esta semana"
        right={<Pill tone="gold">Novo</Pill>}
      />
      <RowItem
        avatar={<Avatar name="Carlos Lima" />}
        title="Carlos Lima"
        sub="Pedido de oracao compartilhado hoje"
      />
    </Frame>
  ),
};

export const InputsAndFeedback: Story = {
  render: () => (
    <Frame>
      <SearchBar value="" onChange={() => undefined} placeholder="Buscar tarefas ou pessoas" />
      <div className="flex flex-wrap gap-2">
        <Chip selected>Todas</Chip>
        <Chip>Discipulado</Chip>
        <Chip>Agenda</Chip>
      </div>
      <CardV2>
        <div className="flex flex-wrap gap-2">
          <Pill tone="blue">Acompanhamento</Pill>
          <Pill tone="gold">Urgente</Pill>
          <Pill tone="green">Concluida</Pill>
          <Pill tone="red">Atrasada</Pill>
        </div>
      </CardV2>
      <ProgressCard
        title="Visitometro"
        valueLabel="12 / 20"
        helper="Progresso mensal de acompanhamento pastoral."
        progress={60}
      />
    </Frame>
  ),
};

export const ContentPatterns: Story = {
  render: () => (
    <Frame>
      <TaskItem title="Ligar para visitantes da semana" meta="Discipulado · 24/04" tone="gold" />
      <TaskItem
        title="Atualizar escala do culto"
        meta="Administracao · 25/04"
        checked
        tone="blue"
      />
      <EventChip
        title="Reuniao de lideranca"
        date={new Date('2026-04-24T19:30:00')}
        meta="19:30 · Sala principal"
      />
      <Disclosure title="Acoes avancadas" subtitle="Mostrar opcoes menos frequentes">
        <p className="text-sm text-[var(--v2-text-2)]">
          Configuracoes detalhadas, automacoes e preferencias entram aqui por progressive
          disclosure.
        </p>
      </Disclosure>
      <EmptyState
        illustration={<Search className="h-6 w-6" />}
        title="Nenhuma tarefa encontrada"
        copy="Ajuste os filtros ou crie sua primeira tarefa para comecar a acompanhar a semana do time."
        cta={{ label: 'Criar tarefa', onClick: () => undefined }}
      />
    </Frame>
  ),
};

export const FloatingAction: Story = {
  render: () => (
    <Frame>
      <CardV2>
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[1rem] text-[var(--v2-blue)]"
            style={{ background: 'color-mix(in oklab, var(--v2-blue) 14%, transparent)' }}
          >
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="v2-heading text-lg">Acao principal persistente</div>
            <div className="text-sm text-[var(--v2-text-2)]">
              O FAB fica reservado para a acao dominante da tela.
            </div>
          </div>
        </div>
      </CardV2>
      <FAB>Novo item</FAB>
    </Frame>
  ),
};
