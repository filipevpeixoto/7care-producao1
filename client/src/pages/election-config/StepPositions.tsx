import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Vote,
  Save,
  Plus,
  Edit,
  Trash2,
  X,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { ariaLabels } from '@/lib/accessibility';
import type { ElectionMember, ElectionConfigData } from './types';

export interface StepPositionsProps {
  config: ElectionConfigData;
  members: ElectionMember[];
  customPositions: string[];
  positionDescriptions: Record<string, string>;
  currentLeaders: Record<string, number | null>;
  setCurrentLeaders: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  showAddPosition: boolean;
  setShowAddPosition: (value: boolean) => void;
  newPositionName: string;
  setNewPositionName: (value: string) => void;
  editingPosition: string | null;
  editingPositionName: string;
  setEditingPositionName: (value: string) => void;
  editingDescription: string | null;
  editingDescriptionText: string;
  setEditingDescriptionText: (value: string) => void;
  handlePositionToggle: (position: string) => void;
  handleAddCustomPosition: () => void;
  handleEditCustomPosition: (position: string) => void;
  handleSaveEditPosition: () => void;
  handleDeleteCustomPosition: (position: string) => void;
  handleMovePositionUp: (position: string) => void;
  handleMovePositionDown: (position: string) => void;
  handleCancelEdit: () => void;
  handleCancelAdd: () => void;
  handleEditDescription: (position: string) => void;
  handleSaveDescription: () => void;
  handleCancelDescriptionEdit: () => void;
  handleSelectAllPositions: () => void;
  handleDeselectAllPositions: () => void;
}

export function StepPositions({
  config,
  members,
  customPositions,
  positionDescriptions,
  currentLeaders,
  setCurrentLeaders,
  showAddPosition,
  setShowAddPosition,
  newPositionName,
  setNewPositionName,
  editingPosition,
  editingPositionName,
  setEditingPositionName,
  editingDescription,
  editingDescriptionText,
  setEditingDescriptionText,
  handlePositionToggle,
  handleAddCustomPosition,
  handleEditCustomPosition,
  handleSaveEditPosition,
  handleDeleteCustomPosition,
  handleMovePositionUp,
  handleMovePositionDown,
  handleCancelEdit,
  handleCancelAdd,
  handleEditDescription,
  handleSaveDescription,
  handleCancelDescriptionEdit,
  handleSelectAllPositions,
  handleDeselectAllPositions,
}: StepPositionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Cargos para Eleição
        </CardTitle>
        <CardDescription>
          Gerencie todos os cargos disponíveis para eleição. Você pode adicionar, editar e
          excluir cargos conforme necessário.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CARGOS PERSONALIZADOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <h3 className="font-semibold text-orange-700">TODOS OS CARGOS</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddPosition(true)}
              className="h-8 px-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {/* Formulário para adicionar novo cargo */}
          {showAddPosition && (
            <div className="ml-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nome do cargo"
                  value={newPositionName}
                  onChange={e => setNewPositionName(e.target.value)}
                  className="flex-1"
                  onKeyPress={e => e.key === 'Enter' && handleAddCustomPosition()}
                />
                <Button
                  size="sm"
                  onClick={handleAddCustomPosition}
                  disabled={!newPositionName.trim()}
                  aria-label={ariaLabels.savePosition}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAdd}
                  aria-label={ariaLabels.cancelAddPosition}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Tabela de cargos personalizados */}
          <div className="ml-4">
            {customPositions.length === 0 && !showAddPosition ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Nenhum cargo disponível
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-orange-200">
                      <th className="text-left p-2 text-xs font-medium text-orange-700">
                        Selecionar
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-orange-700">
                        Departamento/Ministério
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-orange-700">
                        Descrição/Atribuições
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-orange-700">
                        Líder Atual
                      </th>
                      <th className="text-left p-2 text-xs font-medium text-orange-700">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customPositions.map((position, index) => (
                      <tr
                        key={position}
                        className="border-b border-orange-100 hover:bg-orange-25"
                      >
                        <td className="p-2">
                          <Checkbox
                            id={`custom-position-${position}`}
                            checked={(config.positions || []).includes(position)}
                            onCheckedChange={() => handlePositionToggle(position)}
                          />
                        </td>
                        <td className="p-2">
                          {editingPosition === position ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingPositionName}
                                onChange={e => setEditingPositionName(e.target.value)}
                                className="flex-1 text-sm"
                                onKeyPress={e =>
                                  e.key === 'Enter' && handleSaveEditPosition()
                                }
                              />
                              <Button
                                size="sm"
                                onClick={handleSaveEditPosition}
                                disabled={!editingPositionName.trim()}
                                className="h-6 w-6 p-0"
                                aria-label={ariaLabels.savePosition}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="h-6 w-6 p-0"
                                aria-label={ariaLabels.cancelPositionEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Label
                              htmlFor={`custom-position-${position}`}
                              className="cursor-pointer text-sm font-medium"
                            >
                              {position}
                            </Label>
                          )}
                        </td>
                        <td className="p-2">
                          {editingDescription === position ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingDescriptionText}
                                onChange={e => setEditingDescriptionText(e.target.value)}
                                className="w-full min-h-[60px] p-2 text-xs border rounded-md resize-none"
                                placeholder="Digite as atribuições e responsabilidades deste cargo..."
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={handleSaveDescription}
                                  className="h-6 w-6 p-0"
                                  aria-label={ariaLabels.saveDescription}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelDescriptionEdit}
                                  className="h-6 w-6 p-0"
                                  aria-label={ariaLabels.cancelDescriptionEdit}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {positionDescriptions[position] ? (
                                <div className="text-xs text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded p-2 border max-h-20 overflow-y-auto">
                                  {positionDescriptions[position]}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground italic">
                                  Nenhuma descrição adicionada
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <Select
                            value={currentLeaders[position]?.toString() || undefined}
                            onValueChange={value => {
                              if (value === 'none') {
                                setCurrentLeaders(prev => ({
                                  ...prev,
                                  [position]: null,
                                }));
                              } else {
                                setCurrentLeaders(prev => ({
                                  ...prev,
                                  [position]: value ? parseInt(value) : null,
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Selecione o líder atual" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {members
                                .filter(member => member.church === config.churchName)
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(member => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1 items-center">
                            <div className="flex flex-col gap-0.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMovePositionUp(position)}
                                disabled={index === 0}
                                className="h-5 w-5 p-0"
                                title="Mover para cima"
                                aria-label={ariaLabels.movePositionUp(position)}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMovePositionDown(position)}
                                disabled={index === customPositions.length - 1}
                                className="h-5 w-5 p-0"
                                title="Mover para baixo"
                                aria-label={ariaLabels.movePositionDown(position)}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCustomPosition(position)}
                              className="h-6 w-6 p-0"
                              title="Editar nome do cargo"
                              aria-label={ariaLabels.editPosition(position)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditDescription(position)}
                              className="h-6 w-6 p-0"
                              title="Editar descrição"
                              aria-label={ariaLabels.editDescription(position)}
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCustomPosition(position)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              title="Excluir cargo"
                              aria-label={ariaLabels.deletePosition(position)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            {config.positions?.length || 0} cargo(s) selecionado(s)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAllPositions}
              disabled={!config.positions?.length}
            >
              Desmarcar Todos
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectAllPositions}>
              Marcar Todos
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
