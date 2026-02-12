import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Heart,
  Search,
  Phone,
  MessageCircle,
  MessageSquare,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  Target,
  AlertCircle,
  X,
  XCircle,
  RefreshCw,
  BookOpen,
  UserPlus,
  Send,
  Mail,
} from 'lucide-react';
import { hasAdminAccess } from '@/lib/permissions';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { getMountName } from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMyInterestedState, type InterestedPerson, type DiscipleshipRequest } from './my-interested/useMyInterestedState';
import type { UserMember } from '@/types/domain';

export default function MyInterested() {
  const {
    user, isPastorUser, isAdmin,
    searchTerm, setSearchTerm,
    selectedStatus, setSelectedStatus,
    selectedTab, setSelectedTab,
    showDiscipleDialog, setShowDiscipleDialog,
    selectedInterested,
    discipleMessage, setDiscipleMessage,
    selectedChurch, setSelectedChurch,
    currentPage, setCurrentPage,
    showAuthorizationModal, setShowAuthorizationModal,
    selectedRequest,
    adminNotes, setAdminNotes,
    showInviteModal, setShowInviteModal,
    inviteInterested,
    selectedMissionaryId, setSelectedMissionaryId,
    updatingSituation,
    loadingChurch, loadingRelationships, loadingRequests, loadingPoints,
    availableChurches,
    sortedMyInterested, sortedFilteredChurchInterested,
    availableMissionaries, myPendingInvites,
    allRequests, interestedPoints,
    statsData, totalPages, currentList,
    situationLevels,
    queryClient, pendingRequestsSet, itemsPerPage,
    createDiscipleRequestMutation, updateRequestMutation,
    directDiscipleMutation, pastorInviteMutation,
    getSituationOption, handleSituationChange,
    handleOpenInvite, handleConfirmInvite, handleRespondInvite,
    hasPendingRequestForAdmin, handleDiscipleRequest,
    openAuthorizationModal, handleProcessRequest,
    getUserInfo, getMissionaryFirstNames,
    handleUnlinkDisciple, confirmDiscipleRequest,
    handleWhatsApp, handleOpenChat,
    getStatusColor, getStatusLabel, getDiscipleStatus,
    hasAnyActiveRelationship, hasAnyApprovedRequest,
    formatDate, getLevelIcon,
  } = useMyInterestedState();

  // Alias stats for JSX compatibility
  const stats = statsData;
  if (!user) {
    return (
      <MobileLayout>
        <div className="container mx-auto p-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Faça login para acessar esta página</h3>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Amigos</h1>
            <p className="text-muted-foreground">Gerencie seus relacionamentos de discipulado</p>
          </div>

          {/* Botão de refresh manual */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
              queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
              queryClient.invalidateQueries({ queryKey: ['relationships'] });
              queryClient.invalidateQueries({ queryKey: ['all-relationships'] });
              queryClient.invalidateQueries({ queryKey: ['my-interested'] });
              queryClient.invalidateQueries({ queryKey: ['church-interested'] });
              queryClient.invalidateQueries({ queryKey: ['all-users'] });
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalMy}
              </div>
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

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Button
            variant={selectedTab === 'my' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('my')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Users className="h-4 w-4 mr-2" />
            Meus Amigos ({stats.totalMy})
          </Button>
          <Button
            variant={selectedTab === 'church' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('church')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Da Igreja ({stats.totalChurch})
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar amigos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus('all')}
          >
            Todos
          </Button>
          <Button
            variant={selectedStatus === 'novo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus('novo')}
          >
            Novos
          </Button>
          <Button
            variant={selectedStatus === 'estudando' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus('estudando')}
          >
            Estudando
          </Button>
          <Button
            variant={selectedStatus === 'batizado' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus('batizado')}
          >
            Batizados
          </Button>
        </div>

        {/* Church Filter (Admin) */}
        {isAdmin && (
          <div className="w-full md:w-80">
            <Select value={selectedChurch} onValueChange={setSelectedChurch}>
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
        )}

        {/* Convites Pendentes do Pastor (para membros) */}
        {myPendingInvites.length > 0 && !isPastorUser && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Mail className="h-4 w-4" />
              Convites do Pastor ({myPendingInvites.length})
            </h3>
            {myPendingInvites.map((invite: DiscipleshipRequest) => (
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
                        disabled={updateRequestMutation.isPending}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Recusar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRespondInvite(invite.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={updateRequestMutation.isPending}
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
        )}

        {/* Loading States */}
        {(loadingChurch || loadingRelationships || loadingRequests) && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        )}

        {/* Interested List */}
        {!loadingChurch && !loadingRelationships && !loadingRequests && (
          <div className="space-y-4">
            {currentList
              .filter((person: InterestedPerson) => person && person.id) // Extra filter para segurança
              .map((person: InterestedPerson) => {
                try {
                  const discipleStatus = getDiscipleStatus(person.id);
                  const isMyInterested = selectedTab === 'my';
                  const currentSituation =
                    person.interestedSituation || person.interested_situation;
                  const situationLevel = getSituationOption(currentSituation);

                  // Debug: Log para verificar dados
                  if (person.id === updatingSituation) {
                    console.warn('🔍 Debug pessoa sendo atualizada:', {
                      personId: person.id,
                      name: person.name,
                      interestedSituation: person.interestedSituation,
                      interested_situation: person.interested_situation,
                      currentSituation,
                      situationLevel,
                      allLevels: situationLevels,
                    });
                  }

                  return (
                    <Card
                      key={`${person.id}-${currentSituation || 'no-situation'}`}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-primary text-white">
                                  {person.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>

                              <div>
                                <h3 className="font-semibold">{person.name}</h3>
                                {isMyInterested && (
                                  <p className="text-sm text-muted-foreground">{person.email}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              {isMyInterested && (
                                <Badge className={getStatusColor(person.status)}>
                                  {getStatusLabel(person.status)}
                                </Badge>
                              )}

                              {/* Badges de discipulado e situação lado a lado */}
                              {(discipleStatus || situationLevel) && (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {discipleStatus && (
                                    <Badge className={discipleStatus.color}>
                                      <discipleStatus.icon className="h-3 w-3 mr-1" />
                                      {discipleStatus.label}
                                    </Badge>
                                  )}
                                  {situationLevel && (
                                    <Badge
                                      className="border-0 font-semibold"
                                      style={{
                                        backgroundColor: `${situationLevel.color}20`,
                                        color: situationLevel.color,
                                      }}
                                    >
                                      {situationLevel.value} — {situationLevel.label}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Informação de quem está discipulando (apenas na aba Da Igreja) */}
                              {selectedTab === 'church' && (
                                <div className="text-xs text-muted-foreground text-right">
                                  {/* Mostrar se há relacionamento ativo */}
                                  {hasAnyActiveRelationship(person.id) && (
                                    <div className="mb-1 flex items-center gap-1 justify-end">
                                      <span className="font-medium mr-1">Discipulado por:</span>
                                      {getMissionaryFirstNames(person.id).map((name, idx) => (
                                        <Badge
                                          key={idx}
                                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        >
                                          {name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  {/* Mostrar se há solicitação aprovada */}
                                  {hasAnyApprovedRequest(person.id) &&
                                    !hasAnyActiveRelationship(person.id) && (
                                      <div className="mb-1">
                                        <span className="font-medium">
                                          Aprovado para discipulado
                                        </span>
                                      </div>
                                    )}

                                  {/* Mostrar se há solicitação pendente */}
                                  {pendingRequestsSet.has(person.id) && (
                                    <div className="mb-1">
                                      <span className="font-medium">Solicitação pendente</span>
                                    </div>
                                  )}

                                  {/* Mostrar se não há nenhum status */}
                                  {!hasAnyActiveRelationship(person.id) &&
                                    !hasAnyApprovedRequest(person.id) &&
                                    !pendingRequestsSet.has(person.id) && (
                                      <div className="mb-1">
                                        <span className="font-medium">
                                          Disponível para discipulado
                                        </span>
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* Badge de autorização para administradores */}
                              {hasAdminAccess(user) && hasPendingRequestForAdmin(person.id) && (
                                <Badge
                                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800 cursor-pointer"
                                  onClick={() => {
                                    const request = allRequests.find(
                                      (r: DiscipleshipRequest) => r.interestedId === person.id
                                    );
                                    if (request) openAuthorizationModal(request);
                                  }}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Autorizar
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Contact Info - Apenas para interessados vinculados */}
                          {isMyInterested && (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span>{person.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{person.address}</span>
                                </div>
                              </div>

                              {/* Church */}
                              <div className="text-sm text-muted-foreground">
                                <strong>Igreja:</strong> {person.church}
                              </div>

                              {/* Study Progress */}
                              {person.studiesCompleted > 0 && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Progresso dos Estudos</span>
                                    <span>
                                      {person.studiesCompleted}/{person.totalStudies}
                                    </span>
                                  </div>
                                  <div className="bg-muted rounded-full h-2">
                                    <div
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{
                                        width: `${(person.studiesCompleted / person.totalStudies) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Interests */}
                              <div className="flex flex-wrap gap-1">
                                {person.interests?.map((interest, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {interest}
                                  </Badge>
                                ))}
                              </div>

                              {/* Notes */}
                              {person.notes && (
                                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                  <strong>Observações:</strong> {person.notes}
                                </div>
                              )}

                              {/* Last Contact */}
                              {person.lastContact && (
                                <div className="text-xs text-muted-foreground border-t pt-2">
                                  Último contato: {formatDate(person.lastContact)}
                                </div>
                              )}
                            </>
                          )}

                          {/* Pastor Controls - Situação e Discipulador */}
                          {isPastorUser && selectedTab === 'church' && (
                            <div className="space-y-3 border-t pt-3">
                              {/* Situação Selector */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                  Situação:
                                </span>
                                <div className="flex gap-1 flex-wrap">
                                  {situationLevels.length === 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      Carregando níveis...
                                    </span>
                                  )}
                                  {situationLevels.map((opt) => {
                                    const isActive = currentSituation === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        onClick={() => {
                                          console.warn('🔘 Botão clicado:', {
                                            personId: person.id,
                                            optValue: opt.value,
                                            currentSituation,
                                          });
                                          handleSituationChange(person.id, opt.value);
                                        }}
                                        disabled={updatingSituation === person.id}
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                                          isActive
                                            ? 'ring-2 ring-offset-1'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                        } ${updatingSituation === person.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        style={
                                          isActive
                                            ? ({
                                                backgroundColor: `${opt.color}20`,
                                                color: opt.color,
                                                '--tw-ring-color': opt.color,
                                              } as React.CSSProperties)
                                            : undefined
                                        }
                                        title={opt.label}
                                      >
                                        {opt.value}
                                      </button>
                                    );
                                  })}
                                </div>
                                {situationLevel && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    {situationLevel.label}
                                  </span>
                                )}
                              </div>

                              {/* Inline Discipler Selector */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                  Discipulador:
                                </span>
                                <Select
                                  value=""
                                  onValueChange={(missionaryId) => {
                                    if (missionaryId === 'invite') {
                                      handleOpenInvite(person);
                                      return;
                                    }
                                    directDiscipleMutation.mutate({
                                      interestedId: person.id,
                                      missionaryId: parseInt(missionaryId),
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue placeholder="Vincular discipulador..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="invite">
                                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                        <Send className="h-3 w-3" />
                                        Convidar membro...
                                      </div>
                                    </SelectItem>
                                    {availableMissionaries.map((m: UserMember) => (
                                      <SelectItem key={m.id} value={m.id.toString()}>
                                        {m.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {/* Botão "Discipular" - sempre disponível se não há nenhum status de discipulado */}
                            {!discipleStatus && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDiscipleRequest(person)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Target className="h-3 w-3 mr-1" />
                                Discipular
                              </Button>
                            )}

                            {/* Botão "Solicitado" quando há solicitação pendente com o usuário atual */}
                            {discipleStatus?.type === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300 cursor-not-allowed"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Solicitado
                              </Button>
                            )}

                            {/* Botão "Aprovado" quando a solicitação foi aprovada com o usuário atual */}
                            {discipleStatus?.type === 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 cursor-not-allowed"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aprovado
                              </Button>
                            )}

                            {/* Botão "Discipulando" quando há relacionamento ativo com o usuário atual */}
                            {discipleStatus?.type === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 cursor-not-allowed"
                              >
                                <Users className="h-3 w-3 mr-1" />
                                Discipulando
                              </Button>
                            )}

                            {/* Botões adicionais apenas para interessados vinculados */}
                            {isMyInterested && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleWhatsApp(person.phone, person.name)}
                                  className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:border-green-800 dark:text-green-300"
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  WhatsApp
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenChat(person.id, person.name)}
                                  className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:border-blue-800 dark:text-blue-300"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  Mensagem
                                </Button>

                                {/* Botão "Desvincular" apenas para interessados que estão sendo discipulados */}
                                {discipleStatus?.type === 'active' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnlinkDisciple(person.id)}
                                    className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:border-red-800 dark:text-red-300"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Desvincular
                                  </Button>
                                )}
                              </>
                            )}
                          </div>

                          {/* Mountain Progress - Apenas para interessados vinculados */}
                          {isMyInterested && (
                            <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                              {loadingPoints ? (
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 bg-purple-200 dark:bg-purple-800 rounded animate-pulse" />
                                  <div className="flex-1">
                                    <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded animate-pulse mb-1" />
                                    <div className="h-3 bg-purple-200 dark:bg-purple-800 rounded animate-pulse w-20" />
                                  </div>
                                  <div className="h-5 w-12 bg-purple-200 dark:bg-purple-800 rounded animate-pulse" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <MountIcon
                                    iconType={getLevelIcon(interestedPoints[person.id] || 0)}
                                    className="h-8 w-8 text-purple-600 dark:text-purple-400"
                                  />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                      {getMountName(interestedPoints[person.id] || 0)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {interestedPoints[person.id] || 0} pontos
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300"
                                  >
                                    Monte
                                  </Badge>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                } catch (error) {
                  console.error('Error rendering person card:', error, person);
                  // Retorna card de erro ao invés de quebrar toda a página
                  return (
                    <Card
                      key={person?.id || Math.random()}
                      className="border-red-200 bg-red-50/50 dark:bg-red-950/20"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">
                            Erro ao carregar: {person?.name || 'Desconhecido'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loadingChurch && !loadingRelationships && !loadingRequests && totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(
                currentPage * itemsPerPage,
                selectedTab === 'my'
                  ? sortedMyInterested.length
                  : sortedFilteredChurchInterested.length
              )}{' '}
              de{' '}
              {selectedTab === 'my'
                ? sortedMyInterested.length
                : sortedFilteredChurchInterested.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loadingChurch &&
          !loadingRelationships &&
          !loadingRequests &&
          !loadingPoints &&
          (selectedTab === 'my' ? sortedMyInterested : sortedFilteredChurchInterested).length ===
            0 && (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {selectedTab === 'my' ? 'Nenhum amigo vinculado' : 'Nenhum amigo encontrado'}
              </h3>
              <p className="text-muted-foreground">
                {selectedTab === 'my'
                  ? 'Você ainda não tem amigos vinculados. Solicite discipulado de amigos da igreja.'
                  : 'Tente ajustar os filtros de busca.'}
              </p>
            </div>
          )}
      </div>

      {/* Disciple Request Dialog */}
      {showDiscipleDialog && selectedInterested && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Solicitar Discipulado</CardTitle>
              <CardDescription>
                Solicite permissão para discipular {selectedInterested.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Mensagem para o administrador:</label>
                <textarea
                  className="w-full mt-1 p-2 border rounded-md bg-background text-foreground"
                  rows={3}
                  placeholder="Explique por que você gostaria de discipular esta pessoa..."
                  value={discipleMessage}
                  onChange={(e) => setDiscipleMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDiscipleDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDiscipleRequest}
                  disabled={!discipleMessage.trim() || createDiscipleRequestMutation.isPending}
                >
                  {createDiscipleRequestMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Authorization Modal for Admins */}
      {showAuthorizationModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                Autorizar Discipulado
              </CardTitle>
              <CardDescription>Aprove ou rejeite a solicitação de discipulado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Missionário:</span>
                    <div className="font-medium">{getUserInfo(selectedRequest.missionaryId)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Amigo:</span>
                    <div className="font-medium">{getUserInfo(selectedRequest.interestedId)}</div>
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
                    className="w-full mt-1 p-2 border rounded-md bg-background text-foreground"
                    rows={3}
                    placeholder="Adicione observações sobre sua decisão..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAuthorizationModal(false)}>
                  Cancelar
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => handleProcessRequest('rejected')}
                  disabled={updateRequestMutation.isPending}
                >
                  {updateRequestMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processando...
                    </div>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeitar
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleProcessRequest('approved')}
                  disabled={updateRequestMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateRequestMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processando...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pastor Invite Modal */}
      {showInviteModal && inviteInterested && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Convidar Discipulador
              </CardTitle>
              <CardDescription>
                Convide um membro para discipular <strong>{inviteInterested.name}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Selecione o membro:</label>
                <Select value={selectedMissionaryId} onValueChange={setSelectedMissionaryId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolha um membro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMissionaries.map((m: UserMember) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name} {m.church ? `(${m.church})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                O membro receberá um convite e poderá aceitar ou recusar.
              </p>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmInvite}
                  disabled={!selectedMissionaryId || pastorInviteMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {pastorInviteMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </div>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Enviar Convite
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MobileLayout>
  );
}
