import { Heart, Mountain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCardResponsive as UserCard } from '@/components/users/UserCardResponsive';
import type { Relationship } from '@shared/schema';
import type { UserWithDiscipleRequest } from '../usersTypes';

type UsersListProps = {
  userRole?: string;
  mountainFilter: string;
  filteredAndSortedUsers: UserWithDiscipleRequest[];
  safeRelationshipsData: Relationship[];
  getMountainFilterName: () => string | null;
  handleMountainClick: (value: string) => void;
  handleApproveUser: (userId: number) => void;
  handleRejectUser: (userId: number) => void;
  handleEditUser: (user: UserWithDiscipleRequest) => void;
  handleDeleteUser: (user: UserWithDiscipleRequest) => void;
  handleViewUser: (user: UserWithDiscipleRequest) => void;
  handleScheduleVisit: (user: UserWithDiscipleRequest) => void;
  handleDiscipleRequest: (user: UserWithDiscipleRequest) => void;
  showActions: boolean;
};

export const UsersList = ({
  userRole,
  mountainFilter,
  filteredAndSortedUsers,
  safeRelationshipsData,
  getMountainFilterName,
  handleMountainClick,
  handleApproveUser,
  handleRejectUser,
  handleEditUser,
  handleDeleteUser,
  handleViewUser,
  handleScheduleVisit,
  handleDiscipleRequest,
  showActions,
}: UsersListProps) => (
  <div className="space-y-1.5 sm:space-y-3">
    {userRole === 'missionary' && (
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

    {mountainFilter !== 'all' && (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-md sm:rounded-lg border border-blue-200">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Mountain className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
          <span className="text-[10px] sm:text-sm font-medium text-blue-800">
            {getMountainFilterName() ?? ''}
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
        showActions={showActions}
        relationshipsData={safeRelationshipsData}
        hasPendingDiscipleRequest={u.hasPendingDiscipleRequest}
      />
    ))}
  </div>
);
