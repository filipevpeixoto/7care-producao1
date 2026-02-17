import { InterestedListCard } from './InterestedListCard';
import type { InterestedPerson, DiscipleshipRequest } from './myInterestedTypes';
import type { UserMember } from '@/types/domain';

type InterestedListProps = {
  currentList: InterestedPerson[];
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
  directDiscipleMutation: {
    mutate: (data: { interestedId: number; missionaryId: number }) => void;
  };
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

export const InterestedList = ({
  currentList,
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
}: InterestedListProps) => (
  <div className="space-y-4">
    {currentList
      .filter((person: InterestedPerson) => person && person.id)
      .map((person: InterestedPerson, index: number) => {
        const currentSituation = person.interestedSituation || person.interested_situation;
        return (
          <InterestedListCard
            key={`${person.id}-${currentSituation || 'no-situation'}`}
            person={person}
            index={index}
            selectedTab={selectedTab}
            user={user}
            pendingRequestsSet={pendingRequestsSet}
            situationLevels={situationLevels}
            updatingSituation={updatingSituation}
            loadingPoints={loadingPoints}
            interestedPoints={interestedPoints}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
            getDiscipleStatus={getDiscipleStatus}
            getSituationOption={getSituationOption}
            handleSituationChange={handleSituationChange}
            handleOpenInvite={handleOpenInvite}
            directDiscipleMutation={directDiscipleMutation}
            availableMissionaries={availableMissionaries}
            handleDiscipleRequest={handleDiscipleRequest}
            handleWhatsApp={handleWhatsApp}
            handleOpenChat={handleOpenChat}
            handleUnlinkDisciple={handleUnlinkDisciple}
            hasAnyActiveRelationship={hasAnyActiveRelationship}
            hasAnyApprovedRequest={hasAnyApprovedRequest}
            hasPendingRequestForAdmin={hasPendingRequestForAdmin}
            allRequests={allRequests}
            openAuthorizationModal={openAuthorizationModal}
            getMissionaryFirstNames={getMissionaryFirstNames}
            formatDate={formatDate}
            getLevelIcon={getLevelIcon}
            getMountName={getMountName}
            isPastorUser={isPastorUser}
          />
        );
      })}
  </div>
);
