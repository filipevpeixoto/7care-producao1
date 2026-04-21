import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Vote,
  Settings,
  BarChart3,
  Users,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Plus,
  ArrowRight,
  Church,
  Calendar,
  Play,
} from 'lucide-react';

interface ElectionConfig {
  id: number;
  church_name: string;
  title?: string;
  status: string;
  election_status?: string;
  created_at: string;
  election_created_at?: string;
  voters: number[];
  positions: string[];
  criteria: Record<string, unknown>;
}

interface ActiveElection {
  election_id: number;
  config_id: number;
  church_name: string;
  title?: string;
  status: string;
  current_position: number;
  positions: string[];
  voters: number[];
  created_at: string;
}

type ElectionHeaderProps = {
  autoRefresh: boolean;
  onToggleRefresh: () => void;
};

export const ElectionHeader = ({ autoRefresh, onToggleRefresh }: ElectionHeaderProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Vote className="h-8 w-8 text-blue-600" />
      <div>
        <h1 className="text-2xl font-bold">Sistema de Nomeações</h1>
        <p className="text-muted-foreground">Gerencie e participe das eleições de liderança</p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onToggleRefresh}>
        <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
        {autoRefresh ? 'Pausar' : 'Atualizar'}
      </Button>
    </div>
  </div>
);

type DashboardTabProps = {
  configs: ElectionConfig[];
  navigate: (path: string) => void;
  getStatusBadge: (config: ElectionConfig) => JSX.Element;
  handleStartElection: (configId: number) => void;
  handleDeleteConfig: (configId: number) => void;
};

export const DashboardTab = ({
  configs,
  navigate,
  getStatusBadge,
  handleStartElection,
  handleDeleteConfig,
}: DashboardTabProps) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold">Configurações de Nomeação</h2>
      <Button
        onClick={() => navigate('/election-config')}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nova Nomeação
      </Button>
    </div>

    {configs.length === 0 ? (
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-primary/10 text-primary">
            <Vote className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Nenhuma nomeação configurada</h3>
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            Crie a primeira configuração para definir cargos, votantes e regras antes de abrir a
            próxima eleição da liderança.
          </p>
          <Button onClick={() => navigate('/election-config')}>
            <Plus className="h-4 w-4 mr-2" />
            Configurar Nomeação
          </Button>
        </CardContent>
      </Card>
    ) : (
      <div className="grid gap-4">
        {configs.map((config) => (
          <Card key={config.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{config.title || config.church_name}</CardTitle>
                  <CardDescription>
                    {config.church_name} • {config.positions.length} cargos • {config.voters.length}{' '}
                    votantes
                  </CardDescription>
                </div>
                {getStatusBadge(config)}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {config.voters.length} votantes
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Vote className="w-3 h-3 mr-1" />
                    {config.positions.length} cargos
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(config.created_at).toLocaleDateString('pt-BR')}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {config.status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          window.open(`/election-manage/${config.id}`, '_blank');
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Gerenciar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(`/election-dashboard/${config.id}`, '_blank');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Acompanhar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/election-config?id=${config.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </>
                  )}

                  {config.status === 'paused' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(`/election-manage/${config.id}`, '_blank');
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Gerenciar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/election-config?id=${config.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </>
                  )}

                  {config.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleStartElection(config.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/election-config?id=${config.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteConfig(config.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
);

type VotingTabProps = {
  activeElections: ActiveElection[];
  user: { id?: number | string } | null;
  formatDate: (dateString: string) => string;
  handleAccessElection: (election: ActiveElection) => void;
};

export const VotingTab = ({
  activeElections,
  user,
  formatDate,
  handleAccessElection,
}: VotingTabProps) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold">Nomeações Ativas</h2>

    {activeElections.length === 0 ? (
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-primary/10 text-primary">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Nenhuma nomeação disponível</h2>
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            {!user?.id
              ? 'Faça login para ver as nomeações ativas vinculadas ao seu cadastro e à sua igreja.'
              : 'No momento você não está incluído em uma votação ativa. Quando a próxima rodada começar, ela aparecerá aqui automaticamente.'}
          </p>
          {!user?.id && (
            <Button
              onClick={() => (window.location.href = '/login')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Fazer Login
            </Button>
          )}
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        {activeElections.map((election) => (
          <Card key={election.election_id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Church className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">
                      {election.title || election.church_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {election.church_name} • Iniciada em {formatDate(election.created_at)}
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Nomeação Ativa</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Cargo Atual</span>
                  <span>
                    {election.current_position + 1} de {election.positions.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${((election.current_position + 1) / election.positions.length) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {election.positions[election.current_position] || 'Aguardando início'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{election.voters.length}</div>
                  <div className="text-sm text-muted-foreground">Votantes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {election.positions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Cargos</div>
                </div>
              </div>

              <Button
                onClick={() => handleAccessElection(election)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                Acessar Nomeação
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    )}

    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-800 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Como Participar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-blue-700 space-y-2">
          <p>
            <strong>1.</strong> Clique em "Acessar Nomeação" na eleição da sua igreja
          </p>
          <p>
            <strong>2.</strong> Siga as instruções na tela do seu celular
          </p>
          <p>
            <strong>3.</strong> Indique ou vote conforme solicitado
          </p>
          <p>
            <strong>4.</strong> Acompanhe os resultados em tempo real
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

type ConfigTabProps = {
  navigate: (path: string) => void;
};

export const ConfigTab = ({ navigate }: ConfigTabProps) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold">Configurações</h2>
      <Button
        onClick={() => navigate('/election-config')}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nova Configuração
      </Button>
    </div>

    <Alert>
      <Settings className="h-4 w-4" />
      <AlertDescription>
        <strong>Configuração de Nomeações:</strong> Acesse a página de configuração para criar e
        gerenciar os parâmetros das eleições de liderança da sua igreja.
      </AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Acesso Rápido
        </CardTitle>
        <CardDescription>Gerencie as configurações de nomeação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={() => navigate('/election-config')} className="w-full" variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Configurar Nomeação
        </Button>

        <Button
          onClick={() => navigate('/election-dashboard')}
          className="w-full"
          variant="outline"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Dashboard Completo
        </Button>
      </CardContent>
    </Card>
  </div>
);
