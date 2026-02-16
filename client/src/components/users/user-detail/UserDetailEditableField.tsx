import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Edit, X as XIcon } from 'lucide-react';

type EditableFieldProps = {
  field: string;
  label: string;
  value: string | number | boolean | null | undefined;
  type?: 'text' | 'textarea' | 'select';
  options?: string[];
  editingFields: Record<string, boolean>;
  editValues: Record<string, string | number | boolean | null>;
  onStartEditing: (field: string, currentValue: string | number | boolean | null) => void;
  onCancelEditing: (field: string) => void;
  onSaveField: (field: string) => void;
  onEditValueChange: (field: string, value: string) => void;
  isUpdating: boolean;
};

const UserDetailEditableFieldComponent = ({
  field,
  label,
  value,
  type = 'text',
  options,
  editingFields,
  editValues,
  onStartEditing,
  onCancelEditing,
  onSaveField,
  onEditValueChange,
  isUpdating,
}: EditableFieldProps) => {
  const isEditing = editingFields[field];
  const currentValue = isEditing ? editValues[field] : value;
  const displayValue = currentValue != null ? String(currentValue) : '';

  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex gap-2">
          {type === 'textarea' ? (
            <Textarea
              value={displayValue}
              onChange={e => onEditValueChange(field, e.target.value)}
              className="flex-1"
              rows={3}
            />
          ) : type === 'select' ? (
            <Select
              value={displayValue}
              onValueChange={val => onEditValueChange(field, val)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {options?.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={displayValue}
              onChange={e => onEditValueChange(field, e.target.value)}
              className="flex-1"
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSaveField(field)}
            disabled={isUpdating}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
            aria-label={`Salvar ${label}`}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCancelEditing(field)}
            disabled={isUpdating}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            aria-label={`Cancelar edição de ${label}`}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onStartEditing(field, value ?? null)}
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
          aria-label={`Editar ${label}`}
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {value === null || value === undefined || value === '' ? 'Não informado' : String(value)}
      </p>
    </div>
  );
};

export const UserDetailEditableField = memo(UserDetailEditableFieldComponent);
