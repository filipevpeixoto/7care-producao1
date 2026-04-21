import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Clock, HeartHandshake, TrendingUp } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchWithAuth } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { V2PageStack, V2SectionCard } from '@/components/v2/V2Scaffold';
import { PrototypeShell } from './v2/PrototypeShell';
import type { DiscipleshipRequest, Relationship } from './my-interested/myInterestedTypes';

type ApiListResponse<T> =
  | T[]
  | {
      data?: T[] | { data?: T[] };
    };

const extractList = <T,>(payload: ApiListResponse<T>): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && Array.isArray((payload.data as { data?: T[] }).data)) {
    return (payload.data as { data?: T[] }).data ?? [];
  }
  return [];
};

const StatTile = ({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: typeof BarChart3;
}) => (
  <div className="rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-card)] p-4 shadow-[var(--shadow-card)]">
    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--p7-surface-2)] text-[var(--v2-blue)]">
      <Icon className="h-5 w-5" />
    </div>
    <div className="text-2xl font-semibold text-[var(--p7-text)]">{value}</div>
    <div className="mt-1 text-sm font-medium text-[var(--p7-text)]">{label}</div>
    <p className="mt-2 text-xs leading-[1.45] text-[var(--p7-text-3)]">{helper}</p>
  </div>
);

export default function MyReports() {
  const { user } = useAuth();
  const { skin } = useTheme();

  const { data: relationships = [], isLoading: loadingRelationships } = useQuery<Relationship[]>({
    queryKey: ['my-reports-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth(`/api/relationships?missionaryId=${user.id}`);
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      return extractList<Relationship>((await response.json()) as ApiListResponse<Relationship>);
    },
    enabled: !!user?.id,
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery<DiscipleshipRequest[]>({
    queryKey: ['my-reports-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth(`/api/discipleship-requests?missionaryId=${user.id}`);
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      return extractList<DiscipleshipRequest>(
        (await response.json()) as ApiListResponse<DiscipleshipRequest>
      );
    },
    enabled: !!user?.id,
  });

  const stats = useMemo(() => {
    const active = relationships.filter((relationship) => relationship.status === 'active').length;
    const completed = relationships.filter(
      (relationship) => relationship.status === 'completed'
    ).length;
    const pending = requests.filter((request) => request.status === 'pending').length;
    const approved = requests.filter((request) => request.status === 'approved').length;
    const totalRequests = requests.length;
    const approvalRate = totalRequests > 0 ? Math.round((approved / totalRequests) * 100) : 0;

    return { active, completed, pending, approvalRate };
  }, [relationships, requests]);

  const isLoading = loadingRelationships || loadingRequests;

  const tiles = [
    {
      icon: HeartHandshake,
      label: 'Acompanhamentos ativos',
      value: isLoading ? '...' : stats.active,
      helper: 'Pessoas atualmente vinculadas ao seu cuidado.',
    },
    {
      icon: CheckCircle2,
      label: 'Concluídos',
      value: isLoading ? '...' : stats.completed,
      helper: 'Relacionamentos finalizados ou ciclos encerrados.',
    },
    {
      icon: Clock,
      label: 'Solicitações pendentes',
      value: isLoading ? '...' : stats.pending,
      helper: 'Pedidos aguardando aprovação ou encaminhamento.',
    },
    {
      icon: TrendingUp,
      label: 'Taxa de aprovação',
      value: isLoading ? '...' : `${stats.approvalRate}%`,
      helper: 'Proporção de solicitações aprovadas no histórico disponível.',
    },
  ];

  const v2Content = (
    <V2PageStack>
      <V2SectionCard
        title="Resumo da minha atuação"
        subtitle="Acompanhe seus vínculos, solicitações e avanço no discipulado."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {tiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </div>
      </V2SectionCard>

      <V2SectionCard
        title="Leitura pastoral"
        subtitle="Um resumo rápido para orientar o próximo passo."
      >
        <div className="space-y-3 text-sm leading-[1.6] text-[var(--p7-text-2)]">
          <p>
            Use estes indicadores junto da página <strong>Meu Discipulado</strong> para priorizar
            contatos, acompanhar pendências e manter o cuidado pastoral em movimento.
          </p>
          {stats.pending > 0 ? (
            <p className="rounded-[14px] bg-[var(--p7-surface-2)] p-3 text-[var(--p7-text)]">
              Existem solicitações pendentes. Vale revisar aprovações antes de iniciar novos
              acompanhamentos.
            </p>
          ) : (
            <p className="rounded-[14px] bg-[var(--p7-surface-2)] p-3 text-[var(--p7-text)]">
              Nenhuma solicitação pendente no momento. Bom ponto para revisar acompanhamentos
              ativos.
            </p>
          )}
        </div>
      </V2SectionCard>
    </V2PageStack>
  );

  const classicContent = (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Meus relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seus vínculos, solicitações e avanço no discipulado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map(({ icon: Icon, label, value, helper }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-semibold">{value}</div>
              <div className="mt-1 text-sm font-medium">{label}</div>
              <p className="mt-2 text-xs leading-[1.45] text-muted-foreground">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leitura pastoral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use estes indicadores junto da página <strong>Meu Discipulado</strong> para priorizar
            contatos, acompanhar pendências e manter o cuidado pastoral em movimento.
          </p>
          <p className="rounded-xl bg-muted p-3 text-foreground">
            {stats.pending > 0
              ? 'Existem solicitações pendentes. Vale revisar aprovações antes de iniciar novos acompanhamentos.'
              : 'Nenhuma solicitação pendente no momento. Bom ponto para revisar acompanhamentos ativos.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  if (skin === 'v2') {
    return (
      <PrototypeShell label="Análises" title="Meus relatórios" userName={user?.name}>
        <div className="p7-section">{v2Content}</div>
      </PrototypeShell>
    );
  }

  return (
    <MobileLayout title="Meus relatórios">
      <div className="p-4 pb-24">{classicContent}</div>
    </MobileLayout>
  );
}
