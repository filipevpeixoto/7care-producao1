import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react';
import type { SituationLevel } from '@/hooks/useSituationLevels';

const DEFAULT_LEVELS: SituationLevel[] = [
  { value: 'A', label: 'Pronto para Batismo', color: '#10b981' },
  { value: 'B', label: 'Detalhes Pessoais', color: '#3b82f6' },
  { value: 'C', label: 'Estudando Bíblia', color: '#8b5cf6' },
  { value: 'D', label: 'Quer Estudar', color: '#f97316' },
  { value: 'E', label: 'Contato Inicial', color: '#6b7280' },
];

interface SituationLevelsConfigProps {
  levels: SituationLevel[];
  onChange: (levels: SituationLevel[]) => void;
  onSave?: () => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
  compact?: boolean;
}

export function SituationLevelsConfig({
  levels,
  onChange,
  onSave,
  isSaving = false,
  showSaveButton = true,
  compact = false,
}: SituationLevelsConfigProps) {
  const [_dragIndex, _setDragIndex] = useState<number | null>(null);

  const updateLevel = (index: number, field: keyof SituationLevel, value: string) => {
    const updated = [...levels];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addLevel = () => {
    // Encontrar o próximo valor de letra disponível
    const usedValues = new Set(levels.map((l) => l.value));
    let nextValue = '';
    for (let i = 65; i <= 90; i++) {
      // A-Z
      const letter = String.fromCharCode(i);
      if (!usedValues.has(letter)) {
        nextValue = letter;
        break;
      }
    }
    if (!nextValue) {
      // Se todas as letras foram usadas, usar número
      nextValue = `${levels.length + 1}`;
    }
    onChange([...levels, { value: nextValue, label: '', color: '#94a3b8' }]);
  };

  const removeLevel = (index: number) => {
    if (levels.length <= 1) return;
    onChange(levels.filter((_, i) => i !== index));
  };

  const resetToDefault = () => {
    onChange([...DEFAULT_LEVELS]);
  };

  return (
    <Card className={compact ? 'border-0 shadow-none' : ''}>
      {!compact && (
        <CardHeader>
          <CardTitle className="text-lg">Níveis de Situação</CardTitle>
          <CardDescription>
            Configure os níveis de situação dos interessados do seu distrito. Cada nível possui uma
            letra, descrição e cor personalizada.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={compact ? 'p-0' : ''}>
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-[40px_60px_1fr_50px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span></span>
            <span>Código</span>
            <span>Descrição</span>
            <span>Cor</span>
            <span></span>
          </div>

          {/* Levels */}
          {levels.map((level, index) => (
            <div
              key={index}
              className="grid grid-cols-[40px_60px_1fr_50px_36px] gap-2 items-center"
            >
              <div className="flex items-center justify-center text-muted-foreground cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>

              <Input
                value={level.value}
                onChange={(e) => updateLevel(index, 'value', e.target.value.toUpperCase())}
                className="h-8 text-center font-bold text-sm"
                maxLength={3}
                placeholder="A"
              />

              <Input
                value={level.label}
                onChange={(e) => updateLevel(index, 'label', e.target.value)}
                className="h-8 text-sm"
                placeholder="Descrição do nível..."
              />

              <div className="relative">
                <input
                  type="color"
                  value={level.color}
                  onChange={(e) => updateLevel(index, 'color', e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div
                  className="h-8 w-full rounded-md border cursor-pointer"
                  style={{ backgroundColor: level.color }}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                onClick={() => removeLevel(index)}
                disabled={levels.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Preview */}
          <div className="border-t pt-3 mt-4">
            <span className="text-xs font-medium text-muted-foreground mb-2 block">
              Pré-visualização:
            </span>
            <div className="flex gap-2 flex-wrap">
              {levels.map((level) => (
                <Badge
                  key={level.value}
                  style={{
                    backgroundColor: `${level.color}20`,
                    color: level.color,
                    borderColor: `${level.color}40`,
                  }}
                  className="border"
                  title={level.label}
                >
                  {level.value}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap pt-2">
            <Button variant="outline" size="sm" onClick={addLevel} disabled={levels.length >= 26}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Nível
            </Button>

            <Button variant="ghost" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar Padrão
            </Button>

            {showSaveButton && onSave && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving || levels.some((l) => !l.value || !l.label)}
                className="ml-auto"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>

          {levels.some((l) => !l.value || !l.label) && (
            <p className="text-xs text-red-500">
              Todos os níveis devem ter um código e uma descrição.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
