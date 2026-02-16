import { useState } from 'react';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatEmailDisplay } from '@/lib/utils';
import { UserDetailEditableField } from './user-detail/UserDetailEditableField';
import {
  getDepartments,
  getExtraData,
  getPhoneWarning,
  getRoleLabel,
} from './user-detail/userDetailUtils';
import { X } from 'lucide-react';
import { UserDetailSections } from './user-detail/UserDetailSections';
import type { UserMember } from '@/types/domain';
import { uiLogger } from '@/lib/logger';

interface UserDetailModalProps {
  user: UserMember;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (userId: number, data: Record<string, unknown>) => void;
}

export const UserDetailModal = ({ user, isOpen, onClose, onUpdate }: UserDetailModalProps) => {
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string | number | boolean | null>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  if (!user) return null;

  const startEditing = (field: string, currentValue: string | number | boolean | null) => {
    setEditingFields(prev => ({ ...prev, [field]: true }));
    setEditValues(prev => ({ ...prev, [field]: currentValue }));
  };

  const cancelEditing = (field: string) => {
    setEditingFields(prev => ({ ...prev, [field]: false }));
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[field];
      return newValues;
    });
  };

  const saveField = async (field: string) => {
    const newValue = editValues[field];
    setIsUpdating(true);

    try {
      await onUpdate(Number(user.id), { [field]: newValue });
      setEditingFields(prev => ({ ...prev, [field]: false }));
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[field];
        return newValues;
      });
    } catch (error) {
      uiLogger.error('Erro ao atualizar campo:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderEditableField = (
    field: string,
    label: string,
    value: string | number | boolean | null | undefined,
    type: 'text' | 'textarea' | 'select' = 'text',
    options?: string[]
  ) => (
    <UserDetailEditableField
      field={field}
      label={label}
      value={field === 'email' ? formatEmailDisplay(value != null ? String(value) : undefined) : value}
      type={type}
      options={options}
      editingFields={editingFields}
      editValues={editValues}
      onStartEditing={startEditing}
      onCancelEditing={cancelEditing}
      onSaveField={saveField}
      onEditValueChange={(changedField, newValue) =>
        setEditValues(prev => ({ ...prev, [changedField]: newValue }))
      }
      isUpdating={isUpdating}
    />
  );

  const extraData = getExtraData(user as unknown as Record<string, unknown>);
  const phoneWarning = getPhoneWarning(user as unknown as Record<string, unknown>);
  const departments = getDepartments(user as unknown as Record<string, unknown>);

  return (
    <DialogWithModalTracking
      modalId="user-detail-modal"
      open={isOpen}
      onOpenChange={open => !open && onClose()}
    >
      <DialogContent className="max-w-6xl w-[95vw]" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.profilePhoto ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl font-bold">{user.name}</div>
                <div className="text-sm text-muted-foreground">{formatEmailDisplay(user.email ?? undefined)}</div>
              </div>
              <Badge variant="outline" className="ml-2">
                {getRoleLabel(user.role)}
              </Badge>
            </DialogTitle>
          </div>
          <DialogDescription>Informações detalhadas do membro</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <UserDetailSections
            user={user}
            extraData={extraData}
            phoneWarning={phoneWarning}
            departments={departments}
            renderEditableField={renderEditableField}
            onStartEditing={startEditing}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} data-testid="button-close">
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
};

export default UserDetailModal;
