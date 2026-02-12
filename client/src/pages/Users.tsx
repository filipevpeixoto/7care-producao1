import {
  User as UserIcon,
  Search,
  UserPlus,
  ArrowUp,
  ArrowDown,
  Star,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Heart,
  Mountain,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { hasAdminAccess } from '@/lib/permissions';
import { UserCardResponsive as UserCard } from '@/components/users/UserCardResponsive';
import { UserDetailModal } from '@/components/users/UserDetailModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { ScheduleVisitModal } from '@/components/users/ScheduleVisitModal';
import { ResponsiveStatsBadges } from '@/components/users/ResponsiveStatsBadges';
import { ExportMenu } from '@/components/users/ExportMenu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Church } from '@shared/schema';
import { useUsersState, type UserWithDiscipleRequest } from './users/useUsersState';


export default function Users() {
  const {
    user,
    isLoading,
    error,
    users,
    churches,
    safeRelationshipsData,
    usersWithDiscipleRequests,
    filteredAndSortedUsers,
    situationLevels,
    pendingCount,
    searchTerm, setSearchTerm,
    roleFilter, setRoleFilter,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    churchFilter, setChurchFilter,
    mountainFilter,
    interestedSituationFilter,
    missionaryProfileFilter, setMissionaryProfileFilter,
    selectedUser,
    showUserModal, setShowUserModal,
    showEditModal, setShowEditModal,
    showCreateModal, setShowCreateModal,
    showScheduleModal, setShowScheduleModal,
    showDeleteDialog, setShowDeleteDialog,
    userToDelete,
    showDiscipleDialog, setShowDiscipleDialog,
    userToDisciple,
    discipleMessage, setDiscipleMessage,
    showAuthorizationModal, setShowAuthorizationModal,
    selectedRequest,
    adminNotes, setAdminNotes,
    createFormData,
    isRecalculating,
    recalculationProgress,
    recalculationMessage,
    handleMountainClick,
    handleInterestedSituationClick,
    getMountainFilterName,
    getMountainCount,
    getInterestedSituationCount,
    getUsersCountByMountain,
    handleApproveUser,
    handleRejectUser,
    handleUpdateUser,
    openCreateModal,
    handleCreateFormChange,
    handleCreateUserSubmit,
    handleDeleteUser,
    confirmDeleteUser,
    handleEditUser,
    handleViewUser,
    handleScheduleVisit,
    handleDiscipleRequest,
    handleProcessDiscipleRequest,
    handleRemoveActiveDisciple,
    createUserMutation,
    discipleUserMutation,
    queryClient,
  } = useUsersState();

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando usuários...</p>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (error) {
    return (
      <MobileLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-destructive">Erro ao carregar usuários</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/users'] })}
                className="mt-2"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-1 sm:p-4 space-y-2 sm:space-y-4">
        {/* Header - Ultra Minimalista Mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <UserIcon className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            <h1 className="text-base sm:text-2xl font-bold text-foreground">
              {user?.role === 'missionary' ? 'Amigos' : 'Usuários'}
            </h1>
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-1.5 py-0.5"
                data-testid="badge-pending-count"
              >
                {pendingCount}
              </Badge>
            )}
            {user?.role === 'missionary' && (
              <Badge
                variant="secondary"
                className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-1.5 py-0.5"
              >
                0
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ExportMenu data={filteredAndSortedUsers} />
            {hasAdminAccess(user) && (
              <>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary-dark text-[10px] sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  data-testid="button-new-user"
                  onClick={openCreateModal}
                  aria-label="Adicionar novo usuário"
                >
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Novo</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Barra de progresso de recálculo de pontos */}
        {isRecalculating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-md animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-sm font-medium text-blue-900">{recalculationMessage}</p>
              </div>
              <p className="text-sm font-bold text-blue-900">
                {Math.round(recalculationProgress)}%
              </p>
            </div>

            {/* Barra de progresso */}
            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                style={{ width: `${recalculationProgress}%` }}
              >
                {recalculationProgress > 10 && (
                  <span className="text-[10px] font-bold text-white drop-shadow">
                    {Math.round(recalculationProgress)}%
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-blue-700 mt-2">
              Aguarde enquanto os pontos são recalculados. A página será atualizada automaticamente.
            </p>
          </div>
        )}

        {/* Stats como Badges Filtros Elegantes - Ultra Minimalista Mobile */}
        <div className="flex flex-wrap gap-1 sm:gap-4 mt-3 sm:mt-6 p-1.5 sm:p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-lg sm:rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <ResponsiveStatsBadges
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            users={users}
            userRole={user?.role}
          />
        </div>

        {/* Mountain Stats - Ultra Minimalista Mobile - COMENTADO PARA SIMPLIFICAR */}
        <div
          className="space-y-3 sm:space-y-4 mt-4 sm:mt-6 p-2 sm:p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg sm:rounded-xl border border-slate-200/50 shadow-sm"
          style={{ display: 'none' }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-1.5 sm:gap-2">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 drop-shadow-sm" />
              <span className="hidden sm:inline">
                {user?.role === 'missionary'
                  ? 'Meus Amigos por Montes e Estatísticas'
                  : 'Usuários por Montes e Estatísticas'}
              </span>
              <span className="sm:hidden">
                {user?.role === 'missionary' ? 'Amigos por Montes' : 'Usuários por Montes'}
              </span>
            </h3>
          </div>
          {/* 
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 sm:gap-3">
            <Card 
          */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 sm:gap-3"
            style={{ display: 'none' }}
          >
            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'vale'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-500/25 border-0'
                  : 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 border-gray-300/50 dark:border-gray-600 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 hover:border-gray-400'
              }`}
              onClick={() => handleMountainClick(mountainFilter === 'vale' ? 'all' : 'vale')}
              title="Clique para filtrar usuários deste monte"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('vale')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">Vale</div>
                <div className="text-xs opacity-80">0-299 pts</div>
              </CardContent>
            </Card>

            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'sinai'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/25 border-0'
                  : 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-300/50 hover:from-orange-100 hover:to-orange-200 hover:border-orange-400'
              }`}
              onClick={() => handleMountainClick(mountainFilter === 'sinai' ? 'all' : 'sinai')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('sinai')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">Sinai</div>
                <div className="text-xs opacity-80">300-399 pts</div>
              </CardContent>
            </Card>

            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'nebo'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 border-0'
                  : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-300/50 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400'
              }`}
              onClick={() => handleMountainClick(mountainFilter === 'nebo' ? 'all' : 'nebo')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('nebo')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">Nebo</div>
                <div className="text-xs opacity-80">400-499 pts</div>
              </CardContent>
            </Card>

            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'moria'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25 border-0'
                  : 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-300/50 hover:from-purple-100 hover:to-purple-200 hover:border-purple-400'
              }`}
              onClick={() => handleMountainClick(mountainFilter === 'moria' ? 'all' : 'moria')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('moria')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">Moriá</div>
                <div className="text-xs opacity-80">500-599 pts</div>
              </CardContent>
            </Card>

            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'carmelo'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 border-0'
                  : 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-300/50 hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-400'
              }`}
              onClick={() => handleMountainClick(mountainFilter === 'carmelo' ? 'all' : 'carmelo')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('carmelo')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">Carmelo</div>
                <div className="text-xs opacity-80">600-699 pts</div>
              </CardContent>
            </Card>

            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'hermon'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25 border-0'
                  : 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-300/50 hover:from-indigo-100 hover:to-indigo-200 hover:border-indigo-400'
              }`}
              onClick={() => handleMountainClick(mountainFilter === 'hermon' ? 'all' : 'hermon')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('hermon')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">Hermon</div>
                <div className="text-xs opacity-80">700-799 pts</div>
              </CardContent>
            </Card>

            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'siao'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25 border-0'
                  : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-300/50 hover:from-red-100 hover:to-red-200 hover:border-red-400'
              }`}
              onClick={() => handleMountainClick(mountainFilter === 'siao' ? 'all' : 'siao')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('siao')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">Sião</div>
                <div className="text-xs opacity-80">800-899 pts</div>
              </CardContent>
            </Card>

            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'oliveiras'
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-lg shadow-yellow-500/25 border-0'
                  : 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-300/50 hover:from-yellow-100 hover:to-yellow-200 hover:border-yellow-400'
              }`}
              onClick={() =>
                handleMountainClick(mountainFilter === 'oliveiras' ? 'all' : 'oliveiras')
              }
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('oliveiras')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">Oliveiras</div>
                <div className="text-xs opacity-80">900-999 pts</div>
              </CardContent>
            </Card>

            <Card
              className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg ${
                mountainFilter === 'topo'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-500/25 border-0'
                  : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-300/50 hover:from-amber-100 hover:to-amber-200 hover:border-amber-400'
              }`}
              onClick={() => handleMountainClick(mountainFilter === 'topo' ? 'all' : 'topo')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-2 sm:p-3 text-center relative z-10">
                <div className="text-lg sm:text-xl font-bold mb-1">
                  {getUsersCountByMountain('topo')}
                </div>
                <div className="text-xs sm:text-sm font-semibold mb-1">O Topo</div>
                <div className="text-xs opacity-80">1000+ pts</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Situação dos Amigos */}
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
                    <div
                      className="text-sm font-semibold mb-1"
                      style={{ opacity: isActive ? 1 : 0.85 }}
                    >
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

          {/* Cards adicionais para amigos sem situação definida e total */}
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
                handleInterestedSituationClick(
                  interestedSituationFilter === 'total' ? 'all' : 'total'
                )
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

        {/* Search and Filters - Ultra Minimalista Mobile */}
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
            {/* Filtros - Ultra Minimalista Mobile */}
            <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger
                  data-testid="select-role-filter"
                  className="text-xs sm:text-sm h-7 sm:h-10"
                >
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
                <SelectTrigger
                  data-testid="select-status-filter"
                  className="text-xs sm:text-sm h-7 sm:h-10"
                >
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
                <SelectTrigger
                  data-testid="select-church-filter"
                  className="text-xs sm:text-sm h-7 sm:h-10"
                >
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
                <SelectTrigger
                  data-testid="select-missionary-profile-filter"
                  className="text-xs sm:text-sm h-7 sm:h-10"
                >
                  <SelectValue placeholder="Filtrar por role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os roles</SelectItem>
                  <SelectItem value="missionary">Missionários</SelectItem>
                  <SelectItem value="non-missionary">Não missionários</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Montes */}
            <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
              <Select value={mountainFilter} onValueChange={handleMountainClick}>
                <SelectTrigger className="text-xs sm:text-sm h-7 sm:h-10">
                  <SelectValue placeholder="Montes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Montes ({getMountainCount('all')})</SelectItem>
                  <SelectItem value="vale">
                    Vale (0-299 pts) ({getMountainCount('vale')})
                  </SelectItem>
                  <SelectItem value="sinai">
                    Sinai (300-399 pts) ({getMountainCount('sinai')})
                  </SelectItem>
                  <SelectItem value="nebo">
                    Nebo (400-499 pts) ({getMountainCount('nebo')})
                  </SelectItem>
                  <SelectItem value="moria">
                    Moriá (500-599 pts) ({getMountainCount('moria')})
                  </SelectItem>
                  <SelectItem value="carmelo">
                    Carmelo (600-699 pts) ({getMountainCount('carmelo')})
                  </SelectItem>
                  <SelectItem value="hermon">
                    Hermon (700-799 pts) ({getMountainCount('hermon')})
                  </SelectItem>
                  <SelectItem value="siao">
                    Sião (800-899 pts) ({getMountainCount('siao')})
                  </SelectItem>
                  <SelectItem value="oliveiras">
                    Oliveiras (900-999 pts) ({getMountainCount('oliveiras')})
                  </SelectItem>
                  <SelectItem value="topo">
                    Topo (1000+ pts) ({getMountainCount('topo')})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Situação dos Amigos */}
            <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
              <Select
                value={interestedSituationFilter}
                onValueChange={handleInterestedSituationClick}
              >
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

            {/* Ordenação - Ultra Minimalista Mobile */}
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

        {/* Users List - Ultra Minimalista Mobile */}
        <div className="space-y-1.5 sm:space-y-3">
          {/* Mensagem informativa para missionários */}
          {user?.role === 'missionary' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-md sm:rounded-lg border border-purple-200">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                <span className="text-[10px] sm:text-sm font-medium text-purple-800">
                  Seus amigos vinculados
                </span>
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5">
                  0
                </Badge>
              </div>
              <div className="text-[10px] sm:text-xs text-purple-600">
                Solicite acesso ao admin para ver todos
              </div>
            </div>
          )}

          {/* Indicador de filtro ativo - Ultra Minimalista Mobile */}
          {mountainFilter !== 'all' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-md sm:rounded-lg border border-blue-200">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Mountain className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <span className="text-[10px] sm:text-sm font-medium text-blue-800">
                  {getMountainFilterName()}
                </span>
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5">
                  {filteredAndSortedUsers.length}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMountainClick('all')}
                className="h-6 sm:h-7 px-1.5 sm:px-3 text-[10px] sm:text-xs self-start sm:self-auto"
              >
                Ver Todos
              </Button>
            </div>
          )}

          {filteredAndSortedUsers.map((u: UserWithDiscipleRequest) => (
            <UserCard
              key={u.id}
              user={u}
              onApprove={() => handleApproveUser(u.id)}
              onReject={() => handleRejectUser(u.id)}
              onEdit={() => handleEditUser(u)}
              onDelete={() => handleDeleteUser(u)}
              onView={() => handleViewUser(u)}
              onScheduleVisit={() => handleScheduleVisit(u)}
              onDiscipleRequest={() => handleDiscipleRequest(u)}
              showActions={hasAdminAccess(user)}
              relationshipsData={safeRelationshipsData}
              hasPendingDiscipleRequest={u.hasPendingDiscipleRequest}
            />
          ))}
        </div>

        {filteredAndSortedUsers.length === 0 && (
          <div className="text-center py-8" data-testid="empty-state">
            <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar os filtros de busca.</p>
          </div>
        )}

        {/* User Detail Modal */}
        <UserDetailModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          onUpdate={handleUpdateUser}
        />

        {/* Edit User Modal */}
        <EditUserModal
          user={selectedUser}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateUser}
        />

        <DialogWithModalTracking
          modalId="create-user-modal"
          open={showCreateModal}
          onOpenChange={(open) => !open && setShowCreateModal(false)}
        >
          <DialogContent
            className="max-w-lg w-[95vw]"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
            aria-describedby="create-user-modal-description"
          >
            <div id="create-user-modal-description" className="sr-only">
              Formulário para criar novo usuário
            </div>
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Nome Completo *</Label>
                  <Input
                    id="create-name"
                    value={createFormData.name}
                    onChange={(e) => handleCreateFormChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email *</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => handleCreateFormChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-phone">Telefone</Label>
                  <Input
                    id="create-phone"
                    value={createFormData.phone}
                    onChange={(e) => handleCreateFormChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-church">Igreja</Label>
                  <Input
                    id="create-church"
                    value={createFormData.church}
                    onChange={(e) => handleCreateFormChange('church', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">Perfil</Label>
                  <Select
                    value={createFormData.role}
                    onValueChange={(value) => handleCreateFormChange('role', value)}
                  >
                    <SelectTrigger id="create-role">
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {user?.role === 'superadmin' ? (
                        <>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                          <SelectItem value="pastor">Pastor</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="missionary">Missionário</SelectItem>
                          <SelectItem value="interested">Amigo</SelectItem>
                          <SelectItem value="admin_readonly">Admin Leitura</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="missionary">Missionário</SelectItem>
                          <SelectItem value="interested">Amigo</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">Senha (opcional)</Label>
                  <Input
                    id="create-password"
                    type="password"
                    minLength={6}
                    value={createFormData.password}
                    onChange={(e) => handleCreateFormChange('password', e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogWithModalTracking>

        {/* Schedule Visit Modal */}
        <ScheduleVisitModal
          user={selectedUser}
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
        />

        {/* Delete User Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o usuário "{userToDelete?.name}"? Esta ação não pode
                ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Disciple User Dialog */}
        <AlertDialog open={showDiscipleDialog} onOpenChange={setShowDiscipleDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Solicitar Discipulado</AlertDialogTitle>
              <AlertDialogDescription>
                Digite uma mensagem para solicitar o discipulado de "{userToDisciple?.name}". Esta
                solicitação será enviada para aprovação do administrador.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="disciple-message" className="text-right text-sm font-medium">
                  Mensagem:
                </label>
                <textarea
                  id="disciple-message"
                  value={discipleMessage}
                  onChange={(e) => setDiscipleMessage(e.target.value)}
                  className="col-span-3 min-h-[100px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite sua mensagem de solicitação..."
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (userToDisciple && discipleMessage.trim()) {
                    discipleUserMutation.mutate({
                      userId: userToDisciple.id,
                      message: discipleMessage.trim(),
                    });
                  }
                }}
                disabled={!discipleMessage.trim() || discipleUserMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {discipleUserMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Authorization Modal */}
        {showAuthorizationModal && selectedRequest && (
          <AlertDialog open={showAuthorizationModal} onOpenChange={setShowAuthorizationModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Autorizar Discipulado</AlertDialogTitle>
                <AlertDialogDescription>
                  Aprove ou rejeite a solicitação de discipulado
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Missionário:</span>
                      <div className="font-medium">
                        {usersWithDiscipleRequests.find(
                          (u) => u.id === selectedRequest.missionaryId
                        )?.name || `Usuário ${selectedRequest.missionaryId}`}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Amigo:</span>
                      <div className="font-medium">
                        {usersWithDiscipleRequests.find(
                          (u) => u.id === selectedRequest.interestedId
                        )?.name || `Usuário ${selectedRequest.interestedId}`}
                      </div>
                    </div>
                  </div>

                  {selectedRequest.notes && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Observações do Missionário:
                      </span>
                      <div className="text-sm bg-muted/50 p-2 rounded mt-1">
                        {selectedRequest.notes}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Notas do Administrador:</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                      rows={3}
                      placeholder="Adicione observações sobre sua decisão..."
                    />
                  </div>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowAuthorizationModal(false)}>
                  Cancelar
                </AlertDialogCancel>

                {/* Botão para remover discipulado ativo (se houver) */}
                {selectedRequest.status === 'approved' && (
                  <AlertDialogAction
                    onClick={() => {
                      if (
                        selectedRequest.interestedId !== null &&
                        selectedRequest.interestedId !== undefined
                      ) {
                        handleRemoveActiveDisciple(selectedRequest.interestedId);
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Remover Discipulado
                  </AlertDialogAction>
                )}

                <AlertDialogAction
                  onClick={() => handleProcessDiscipleRequest('rejected')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Rejeitar
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => handleProcessDiscipleRequest('approved')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Aprovar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </MobileLayout>
  );
}
