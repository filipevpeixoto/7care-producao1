/**
 * Campo editável inline com suporte a Enter/Escape/blur
 * Extraído de Settings.tsx para reutilização
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface EditableFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSave'> {
  value: string;
  onSave: (value: string) => void;
  className?: string;
}

export function EditableField({
  value,
  onSave,
  className = '',
  ...props
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex gap-1">
        <Input
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="h-8 text-sm"
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`p-1 rounded cursor-text hover:bg-muted/50 transition-colors min-h-[32px] flex items-center ${className}`}
      {...props}
    >
      {value || 'Clique para editar'}
    </div>
  );
}
