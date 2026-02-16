import type { CSSProperties, ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MountIcon } from '@/components/ui/mount-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
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
  Send,
} from 'lucide-react';
import { hasAdminAccess } from '@/lib/permissions';
import type { InterestedPerson, DiscipleshipRequest } from './myInterestedTypes';
import type { UserMember } from '@/types/domain';
import { createLogger } from '@/lib/logger';

const interestedLogger = createLogger('Interested');

type DiscipleStatus = {
  type?: string;
  color?: string;
  label?: string;
  icon?: ComponentType<{ className?: string }>;
} | null;

type InterestedListCardProps = {
  person: InterestedPerson;
  index: number;
  selectedTab: string;
  user: { id?: number | string; role?: string } | null;
  pendingRequestsSet: Set<number>;
  situationLevels: {
    value: string;
    label: string;
    color: string;
  }[];
  updatingSituation: number | null;
  loadingPoints: boolean;
  interestedPoints: Record<number, number>;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  getDiscipleStatus: (personId: number) => unknown;
  getSituationOption: (value?: string) => { value: string; label: string; color: string } | null;
  handleSituationChange: (personId: number, value: string) => void;
  handleOpenInvite: (person: InterestedPerson) => void;
  directDiscipleMutation: { mutate: (data: { interestedId: number; missionaryId: number }) => void };
  availableMissionaries: UserMember[];
  handleDiscipleRequest: (person: InterestedPerson) => void;
  handleWhatsApp: (phone: string, name: string) => void;
  handleOpenChat: (personId: number, name: string) => void;
  handleUnlinkDisciple: (personId: number) => void;
  hasAnyActiveRelationship: (personId: number) => boolean;
  hasAnyApprovedRequest: (personId: number) => boolean;
  hasPendingRequestForAdmin: (personId: number) => boolean;
  allRequests: DiscipleshipRequest[];
  openAuthorizationModal: (request: DiscipleshipRequest) => void;
  getMissionaryFirstNames: (personId: number) => string[];
  formatDate: (date: string) => string;
  getLevelIcon: (points: number) => string;
  getMountName: (points: number) => string;
  isPastorUser: boolean;
};

export const InterestedListCard = ({
  person,
  index,
  selectedTab,
  user,
  pendingRequestsSet,
  situationLevels,
  updatingSituation,
  loadingPoints,
  interestedPoints,
  getStatusColor,
  getStatusLabel,
  getDiscipleStatus,
  getSituationOption,
  handleSituationChange,
  handleOpenInvite,
  directDiscipleMutation,
  availableMissionaries,
  handleDiscipleRequest,
  handleWhatsApp,
  handleOpenChat,
  handleUnlinkDisciple,
  hasAnyActiveRelationship,
  hasAnyApprovedRequest,
  hasPendingRequestForAdmin,
  allRequests,
  openAuthorizationModal,
  getMissionaryFirstNames,
  formatDate,
  getLevelIcon,
  getMountName,
  isPastorUser,
}: InterestedListCardProps) => {
  try {
    const discipleStatus = getDiscipleStatus(person.id) as DiscipleStatus;
    const isMyInterested = selectedTab === 'my';
    const currentSituation = person.interestedSituation || person.interested_situation;
    const situationLevel = getSituationOption(currentSituation);

    if (person.id === updatingSituation) {
      interestedLogger.debug('Pessoa sendo atualizada:', {
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

                {(discipleStatus || situationLevel) && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {discipleStatus && (
                      <Badge className={discipleStatus.color}>
                        {discipleStatus.icon && (
                          <discipleStatus.icon className="h-3 w-3 mr-1" />
                        )}
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

                {selectedTab === 'church' && (
                  <div className="text-xs text-muted-foreground text-right">
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

                    {hasAnyApprovedRequest(person.id) && !hasAnyActiveRelationship(person.id) && (
                      <div className="mb-1">
                        <span className="font-medium">Aprovado para discipulado</span>
                      </div>
                    )}

                    {pendingRequestsSet.has(person.id) && (
                      <div className="mb-1">
                        <span className="font-medium">Solicitação pendente</span>
                      </div>
                    )}

                    {!hasAnyActiveRelationship(person.id) &&
                      !hasAnyApprovedRequest(person.id) &&
                      !pendingRequestsSet.has(person.id) && (
                        <div className="mb-1">
                          <span className="font-medium">Disponível para discipulado</span>
                        </div>
                      )}
                  </div>
                )}

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

                <div className="text-sm text-muted-foreground">
                  <strong>Igreja:</strong> {person.church}
                </div>

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

                <div className="flex flex-wrap gap-1">
                  {person.interests?.map((interest, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>

                {person.notes && (
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    <strong>Observações:</strong> {person.notes}
                  </div>
                )}

                {person.lastContact && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    Último contato: {formatDate(person.lastContact)}
                  </div>
                )}
              </>
            )}

            {isPastorUser && selectedTab === 'church' && (
              <div className="space-y-3 border-t pt-3">
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
                            interestedLogger.debug('Botão clicado:', {
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
                          } ${
                            updatingSituation === person.id
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                          style={
                            isActive
                              ? ({
                                  backgroundColor: `${opt.color}20`,
                                  color: opt.color,
                                  '--tw-ring-color': opt.color,
                                } as CSSProperties)
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

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Discipulador:
                  </span>
                  <Select
                    aria-label="Selecionar discipulador"
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

            <div className="flex flex-wrap gap-2">
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
    interestedLogger.error('Error rendering person card:', error, person);
    return (
      <Card
        key={person?.id ?? `error-person-${index}`}
        className="border-red-200 bg-red-50/50 dark:bg-red-950/20"
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Erro ao carregar: {person?.name || 'Desconhecido'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
};
