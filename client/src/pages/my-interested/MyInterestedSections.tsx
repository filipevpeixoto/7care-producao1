import { startTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Heart,
  Search,
  CheckCircle,
  Users,
  AlertCircle,
  XCircle,
  RefreshCw,
  BookOpen,
  Mail,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DiscipleshipRequest } from './myInterestedTypes';
export { InterestedList } from './InterestedList';
export { AuthorizationModal, DiscipleDialog, InviteModal } from './MyInterestedModals';

type StatsSummary = {
  totalMy: number;
  totalChurch: number;
  pendingRequests: number;
  approvedRequests: number;
};

type LoggedOutProps = {
  message: string;
};

export const LoggedOutState = ({ message }: LoggedOutProps) => (
  <MobileLayout>
    <div className="container mx-auto p-4 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium">{message}</h3>
    </div>
  </MobileLayout>
);

type PageHeaderProps = {
  onRefresh: () => void;
};

export const PageHeader = ({ onRefresh }: PageHeaderProps) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold">Meus Amigos</h1>
      <p className="text-muted-foreground">Gerencie seus relacionamentos de discipulado</p>
    </div>
    <Button variant="outline" size="sm" onClick={onRefresh} className="flex items-center gap-2">
      <RefreshCw className="h-4 w-4" />
      Atualizar
    </Button>
  </div>
);

export const StatsCards = ({ stats }: { stats: StatsSummary }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalMy}</div>
        <div className="text-sm text-muted-foreground">Meus</div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {stats.totalChurch}
        </div>
        <div className="text-sm text-muted-foreground">Da Igreja</div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
          {stats.pendingRequests}
        </div>
        <div className="text-sm text-muted-foreground">Pendentes</div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {stats.approvedRequests}
        </div>
        <div className="text-sm text-muted-foreground">Aprovados</div>
      </CardContent>
    </Card>
  </div>
);

type TabsProps = {
  selectedTab: string;
  setSelectedTab: (value: 'my' | 'church') => void;
  stats: StatsSummary;
};

export const Tabs = ({ selectedTab, setSelectedTab, stats }: TabsProps) => (
  <div className="flex gap-2 border-b">
    <Button
      variant={selectedTab === 'my' ? 'default' : 'ghost'}
      onClick={() => startTransition(() => setSelectedTab('my'))}
      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
    >
      <Users className="h-4 w-4 mr-2" />
      Meus Amigos ({stats.totalMy})
    </Button>
    <Button
      variant={selectedTab === 'church' ? 'default' : 'ghost'}
      onClick={() => startTransition(() => setSelectedTab('church'))}
      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
    >
      <BookOpen className="h-4 w-4 mr-2" />
      Da Igreja ({stats.totalChurch})
    </Button>
  </div>
);

type SearchBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

export const SearchBar = ({ searchTerm, setSearchTerm }: SearchBarProps) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
    <Input
      aria-label="Buscar amigos"
      placeholder="Buscar amigos..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10"
    />
  </div>
);

type StatusFiltersProps = {
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
};

export const StatusFilters = ({ selectedStatus, setSelectedStatus }: StatusFiltersProps) => (
  <div className="flex gap-2 overflow-x-auto pb-2">
    <Button
      variant={selectedStatus === 'all' ? 'default' : 'outline'}
      size="sm"
      onClick={() => startTransition(() => setSelectedStatus('all'))}
    >
      Todos
    </Button>
    <Button
      variant={selectedStatus === 'novo' ? 'default' : 'outline'}
      size="sm"
      onClick={() => startTransition(() => setSelectedStatus('novo'))}
    >
      Novos
    </Button>
    <Button
      variant={selectedStatus === 'estudando' ? 'default' : 'outline'}
      size="sm"
      onClick={() => startTransition(() => setSelectedStatus('estudando'))}
    >
      Estudando
    </Button>
    <Button
      variant={selectedStatus === 'batizado' ? 'default' : 'outline'}
      size="sm"
      onClick={() => startTransition(() => setSelectedStatus('batizado'))}
    >
      Batizados
    </Button>
  </div>
);

type ChurchFilterProps = {
  isAdmin: boolean;
  selectedChurch: string;
  setSelectedChurch: (value: string) => void;
  availableChurches: string[];
};

export const ChurchFilter = ({
  isAdmin,
  selectedChurch,
  setSelectedChurch,
  availableChurches,
}: ChurchFilterProps) =>
  isAdmin ? (
    <div className="w-full md:w-80">
      <Select
        aria-label="Filtrar por igreja"
        value={selectedChurch}
        onValueChange={setSelectedChurch}
      >
        <SelectTrigger>
          <SelectValue placeholder="Filtrar por igreja" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as igrejas</SelectItem>
          {availableChurches.map((church) => (
            <SelectItem key={church} value={church}>
              {church}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

type PendingInvitesProps = {
  invites: DiscipleshipRequest[];
  isPastorUser: boolean;
  formatDate: (value: string) => string;
  getUserInfo: (userId: number) => string;
  handleRespondInvite: (inviteId: number, status: 'approved' | 'rejected') => void;
  isUpdating: boolean;
};

export const PendingInvites = ({
  invites,
  isPastorUser,
  formatDate,
  getUserInfo,
  handleRespondInvite,
  isUpdating,
}: PendingInvitesProps) =>
  invites.length > 0 && !isPastorUser ? (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
        <Mail className="h-4 w-4" />
        Convites do Pastor ({invites.length})
      </h3>
      {invites.map((invite: DiscipleshipRequest) => (
        <Card
          key={invite.id}
          className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  O pastor convidou você para discipular{' '}
                  <strong>{invite.interestedName || getUserInfo(invite.interestedId)}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recebido em {formatDate(invite.requestedAt || invite.createdAt || '')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespondInvite(invite.id, 'rejected')}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
                  disabled={isUpdating}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Recusar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRespondInvite(invite.id, 'approved')}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isUpdating}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aceitar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ) : null;

export const LoadingState = () => (
  <div className="text-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
    <p className="mt-2 text-muted-foreground">Carregando...</p>
  </div>
);

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalCount: number;
  setCurrentPage: (page: number) => void;
};

export const PaginationControls = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalCount,
  setCurrentPage,
}: PaginationProps) =>
  totalPages > 1 ? (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-muted-foreground">
        Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
        {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Anterior
        </Button>
        <span className="text-sm px-3">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  ) : null;

type EmptyStateProps = {
  isVisible: boolean;
  selectedTab: string;
};

export const EmptyState = ({ isVisible, selectedTab }: EmptyStateProps) =>
  isVisible ? (
    <div className="mx-auto max-w-xl rounded-[1.5rem] border border-border/70 bg-card/90 px-6 py-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Heart className="h-7 w-7" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-foreground">
        {selectedTab === 'my' ? 'Nenhum amigo vinculado' : 'Nenhum amigo encontrado'}
      </h3>
      <p className="text-sm leading-6 text-muted-foreground">
        {selectedTab === 'my'
          ? 'Você ainda não tem vínculos ativos. Aceite convites pendentes ou peça ao pastor para conectar você a alguém da igreja.'
          : 'Não encontramos amigos com os filtros atuais. Tente limpar a busca ou selecionar outro status para ampliar a lista.'}
      </p>
    </div>
  ) : null;
