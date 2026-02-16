import {
  Search,
  ArrowUp,
  ArrowDown,
  Star,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Heart,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserMember } from '@/types/domain';
import { ResponsiveStatsBadges } from '@/components/users/ResponsiveStatsBadges';
import type { Church } from '@shared/schema';

type UsersStatsProps = {
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  users: UserMember[];
  userRole?: string;
};

export const UsersStats = ({ roleFilter, setRoleFilter, users, userRole }: UsersStatsProps) => (
  <div className="flex flex-wrap gap-1 sm:gap-4 mt-3 sm:mt-6 p-1.5 sm:p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-lg sm:rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
    <ResponsiveStatsBadges
      roleFilter={roleFilter}
      setRoleFilter={setRoleFilter}
      users={users}
      userRole={userRole}
    />
  </div>
);

type SituationCardLevel = {
  value: string;
  label: string;
  color: string;
};

type UsersSituationProps = {
  situationLevels: SituationCardLevel[];
  interestedSituationFilter: string;
  getInterestedSituationCount: (value: string) => number;
  handleInterestedSituationClick: (value: string) => void;
};

export const UsersSituation = ({
  situationLevels,
  interestedSituationFilter,
  getInterestedSituationCount,
  handleInterestedSituationClick,
}: UsersSituationProps) => (
  <div className="space-y-4 mt-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Heart className="h-5 w-5 text-red-500 drop-shadow-sm" />
        Situação dos Amigos
      </h3>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
      {situationLevels.map((level) => {
        const isActive = interestedSituationFilter === level.value;
        const count = getInterestedSituationCount(level.value);
        return (
          <Card
            key={level.value}
            className="group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg border"
            style={{
              backgroundColor: isActive ? level.color : `${level.color}10`,
              borderColor: isActive ? level.color : `${level.color}30`,
              color: isActive ? '#fff' : level.color,
            }}
            onClick={() => handleInterestedSituationClick(isActive ? 'all' : level.value)}
            title={`Clique para filtrar amigos ${level.label}`}
          >
            <CardContent className="p-3 text-center relative z-10">
              <div className="text-xl font-bold mb-1">{count}</div>
              <div className="text-sm font-semibold mb-1" style={{ opacity: isActive ? 1 : 0.85 }}>
                {level.label}
              </div>
              <div className="text-xs" style={{ opacity: isActive ? 0.9 : 0.7 }}>
                Tipo {level.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
      <Card
        className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
          interestedSituationFilter === 'no-situation'
            ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/25 border-0'
            : 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-300/50 dark:border-yellow-700/50 hover:bg-yellow-100 dark:hover:bg-yellow-900'
        }`}
        onClick={() =>
          handleInterestedSituationClick(
            interestedSituationFilter === 'no-situation' ? 'all' : 'no-situation'
          )
        }
        title="Clique para filtrar amigos sem situação definida"
      >
        <CardContent className="p-3 text-center relative z-10">
          <div className="text-xl font-bold mb-1">
            {getInterestedSituationCount('no-situation')}
          </div>
          <div className="text-sm font-semibold mb-1">Sem Situação Definida</div>
          <div className="text-xs" style={{ opacity: 0.8 }}>
            Precisa de Acompanhamento
          </div>
        </CardContent>
      </Card>

      <Card
        className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
          interestedSituationFilter === 'total'
            ? 'bg-red-600 text-white shadow-lg shadow-red-500/25 border-0'
            : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300/50 dark:border-red-700/50 hover:bg-red-100 dark:hover:bg-red-900'
        }`}
        onClick={() =>
          handleInterestedSituationClick(interestedSituationFilter === 'total' ? 'all' : 'total')
        }
        title="Clique para filtrar todos os amigos"
      >
        <CardContent className="p-3 text-center relative z-10">
          <div className="text-xl font-bold mb-1">{getInterestedSituationCount('total')}</div>
          <div className="text-sm font-semibold mb-1">Total de Amigos</div>
          <div className="text-xs" style={{ opacity: 0.8 }}>
            Todos os Tipos
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

type UsersFiltersProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  churchFilter: string;
  setChurchFilter: (value: string) => void;
  missionaryProfileFilter: string;
  setMissionaryProfileFilter: (value: string) => void;
  mountainFilter: string;
  handleMountainClick: (value: string) => void;
  interestedSituationFilter: string;
  handleInterestedSituationClick: (value: string) => void;
  churches: Church[];
  situationLevels: SituationCardLevel[];
  getMountainCount: (value: string) => number;
  getInterestedSituationCount: (value: string) => number;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
};

export const UsersFilters = ({
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  churchFilter,
  setChurchFilter,
  missionaryProfileFilter,
  setMissionaryProfileFilter,
  mountainFilter,
  handleMountainClick,
  interestedSituationFilter,
  handleInterestedSituationClick,
  churches,
  situationLevels,
  getMountainCount,
  getInterestedSituationCount,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
}: UsersFiltersProps) => (
  <div className="space-y-2 sm:space-y-3">
    <div className="relative">
      <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <Input
        placeholder="Buscar por nome ou email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-8 sm:pl-10 text-xs sm:text-base h-8 sm:h-10"
        data-testid="input-search"
        aria-label="Buscar usuários por nome ou email"
      />
    </div>

    <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
      <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger data-testid="select-role-filter" className="text-xs sm:text-sm h-7 sm:h-10">
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="missionary">Missionário</SelectItem>
            <SelectItem value="member">Membro</SelectItem>
            <SelectItem value="interested">Amigo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="select-status-filter" className="text-xs sm:text-sm h-7 sm:h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
        <Select value={churchFilter} onValueChange={setChurchFilter}>
          <SelectTrigger data-testid="select-church-filter" className="text-xs sm:text-sm h-7 sm:h-10">
            <SelectValue placeholder="Igreja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as igrejas</SelectItem>
            {churches.map((church: Church) => (
              <SelectItem key={church.id} value={church.name}>
                {church.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
        <Select value={missionaryProfileFilter} onValueChange={setMissionaryProfileFilter}>
          <SelectTrigger data-testid="select-missionary-profile-filter" className="text-xs sm:text-sm h-7 sm:h-10">
            <SelectValue placeholder="Filtrar por role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os roles</SelectItem>
            <SelectItem value="missionary">Missionários</SelectItem>
            <SelectItem value="non-missionary">Não missionários</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
        <Select value={mountainFilter} onValueChange={handleMountainClick}>
          <SelectTrigger className="text-xs sm:text-sm h-7 sm:h-10">
            <SelectValue placeholder="Montes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Montes ({getMountainCount('all')})</SelectItem>
            <SelectItem value="vale">Vale (0-299 pts) ({getMountainCount('vale')})</SelectItem>
            <SelectItem value="sinai">Sinai (300-399 pts) ({getMountainCount('sinai')})</SelectItem>
            <SelectItem value="nebo">Nebo (400-499 pts) ({getMountainCount('nebo')})</SelectItem>
            <SelectItem value="moria">Moriá (500-599 pts) ({getMountainCount('moria')})</SelectItem>
            <SelectItem value="carmelo">Carmelo (600-699 pts) ({getMountainCount('carmelo')})</SelectItem>
            <SelectItem value="hermon">Hermon (700-799 pts) ({getMountainCount('hermon')})</SelectItem>
            <SelectItem value="siao">Sião (800-899 pts) ({getMountainCount('siao')})</SelectItem>
            <SelectItem value="oliveiras">Oliveiras (900-999 pts) ({getMountainCount('oliveiras')})</SelectItem>
            <SelectItem value="topo">Topo (1000+ pts) ({getMountainCount('topo')})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
        <Select value={interestedSituationFilter} onValueChange={handleInterestedSituationClick}>
          <SelectTrigger className="text-xs sm:text-sm h-7 sm:h-10">
            <SelectValue placeholder="Situação Amigos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todas as Situações ({getInterestedSituationCount('all')})
            </SelectItem>
            {situationLevels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label} ({level.value}) ({getInterestedSituationCount(level.value)})
              </SelectItem>
            ))}
            <SelectItem value="no-situation">
              Sem Situação ({getInterestedSituationCount('no-situation')})
            </SelectItem>
            <SelectItem value="total">
              Todos Amigos ({getInterestedSituationCount('total')})
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-[80px] sm:min-w-[140px] text-xs sm:text-sm h-7 sm:h-10 px-2 sm:px-3"
          >
            {sortOrder === 'asc' ? (
              <ArrowUp className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
            ) : (
              <ArrowDown className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
            )}
            <span className="hidden sm:inline">
              {sortBy === 'name' && 'Nome'}
              {sortBy === 'points' && 'Pontos'}
              {sortBy === 'attendance' && 'Frequência'}
              {sortBy === 'createdAt' && 'Data Cadastro'}
              {sortBy === 'priority' && 'Prioridade'}
            </span>
            <span className="sm:hidden text-[10px]">
              {sortBy === 'name' && 'Nome'}
              {sortBy === 'points' && 'Pts'}
              {sortBy === 'attendance' && 'Freq'}
              {sortBy === 'createdAt' && 'Data'}
              {sortBy === 'priority' && 'Pri'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setSortBy('name');
              setSortOrder('asc');
            }}
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            Nome A-Z
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy('name');
              setSortOrder('desc');
            }}
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Nome Z-A
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy('points');
              setSortOrder('desc');
            }}
          >
            <Star className="h-4 w-4 mr-2" />
            Maior Pontuação
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy('points');
              setSortOrder('asc');
            }}
          >
            <Star className="h-4 w-4 mr-2" />
            Menor Pontuação
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy('attendance');
              setSortOrder('desc');
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Maior Frequência
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy('attendance');
              setSortOrder('asc');
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Menor Frequência
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy('createdAt');
              setSortOrder('desc');
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Mais Recentes
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy('createdAt');
              setSortOrder('asc');
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Mais Antigos
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy('priority');
              setSortOrder('asc');
            }}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Prioridade (Alta → Baixa)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);

type UsersMountainStatsProps = {
  userRole?: string;
  mountainFilter: string;
  handleMountainClick: (value: string) => void;
  getUsersCountByMountain: (value: string) => number;
};

type MountainCardConfig = {
  value: string;
  label: string;
  range: string;
  activeClassName: string;
  inactiveClassName: string;
  overlayClassName: string;
  title?: string;
};

export const UsersMountainStats = ({
  userRole,
  mountainFilter,
  handleMountainClick,
  getUsersCountByMountain,
}: UsersMountainStatsProps) => {
  const mountainCards: MountainCardConfig[] = [
    {
      value: 'vale',
      label: 'Vale',
      range: '0-299 pts',
      activeClassName:
        'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 border-gray-300/50 dark:border-gray-600 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 hover:border-gray-400',
      overlayClassName: 'from-gray-400/20',
      title: 'Clique para filtrar usuários deste monte',
    },
    {
      value: 'sinai',
      label: 'Sinai',
      range: '300-399 pts',
      activeClassName:
        'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-300/50 hover:from-orange-100 hover:to-orange-200 hover:border-orange-400',
      overlayClassName: 'from-orange-400/20',
    },
    {
      value: 'nebo',
      label: 'Nebo',
      range: '400-499 pts',
      activeClassName:
        'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-300/50 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400',
      overlayClassName: 'from-blue-400/20',
    },
    {
      value: 'moria',
      label: 'Moriá',
      range: '500-599 pts',
      activeClassName:
        'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-300/50 hover:from-purple-100 hover:to-purple-200 hover:border-purple-400',
      overlayClassName: 'from-purple-400/20',
    },
    {
      value: 'carmelo',
      label: 'Carmelo',
      range: '600-699 pts',
      activeClassName:
        'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-300/50 hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-400',
      overlayClassName: 'from-emerald-400/20',
    },
    {
      value: 'hermon',
      label: 'Hermon',
      range: '700-799 pts',
      activeClassName:
        'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-300/50 hover:from-indigo-100 hover:to-indigo-200 hover:border-indigo-400',
      overlayClassName: 'from-indigo-400/20',
    },
    {
      value: 'siao',
      label: 'Sião',
      range: '800-899 pts',
      activeClassName:
        'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-300/50 hover:from-red-100 hover:to-red-200 hover:border-red-400',
      overlayClassName: 'from-red-400/20',
    },
    {
      value: 'oliveiras',
      label: 'Oliveiras',
      range: '900-999 pts',
      activeClassName:
        'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-lg shadow-yellow-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-300/50 hover:from-yellow-100 hover:to-yellow-200 hover:border-yellow-400',
      overlayClassName: 'from-yellow-400/20',
    },
    {
      value: 'topo',
      label: 'O Topo',
      range: '1000+ pts',
      activeClassName:
        'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-500/25 border-0',
      inactiveClassName:
        'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-300/50 hover:from-amber-100 hover:to-amber-200 hover:border-amber-400',
      overlayClassName: 'from-amber-400/20',
    },
  ];

  return (
    <div
      className="space-y-3 sm:space-y-4 mt-4 sm:mt-6 p-2 sm:p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg sm:rounded-xl border border-slate-200/50 shadow-sm"
      style={{ display: 'none' }}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-1.5 sm:gap-2">
          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 drop-shadow-sm" />
          <span className="hidden sm:inline">
            {userRole === 'missionary'
              ? 'Meus Amigos por Montes e Estatísticas'
              : 'Usuários por Montes e Estatísticas'}
          </span>
          <span className="sm:hidden">
            {userRole === 'missionary' ? 'Amigos por Montes' : 'Usuários por Montes'}
          </span>
        </h3>
      </div>
      <div
        className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 sm:gap-3"
        style={{ display: 'none' }}
      >
        {mountainCards.map((card) => {
          const isActive = mountainFilter === card.value;
          return (
            <Card
              key={card.value}
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                isActive ? card.activeClassName : card.inactiveClassName
              }`}
              onClick={() => handleMountainClick(isActive ? 'all' : card.value)}
              title={card.title}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-r ${card.overlayClassName} to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              ></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain(card.value)}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">{card.label}</div>
                <div className="text-xs opacity-80">{card.range}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export type { SituationCardLevel };
