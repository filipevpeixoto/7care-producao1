import React from 'react';
import { formatEmailDisplay } from '@/lib/utils';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Users,
  Church as ChurchIcon,
  Vote,
  CheckCircle,
  AlertCircle,
  Save,
  Play,
  UserCheck,
  Target,
  RefreshCw,
  Loader2,
  User,
  Info,
  AlertTriangle,
  UserPlus,
  Plus,
  Edit,
  Trash2,
  X,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useElectionConfigState } from './election-config/useElectionConfigState';

export default function ElectionConfig() {
  const {
    user,
    config, setConfig,
    currentStep, setCurrentStep,
    isEditing,
    editingConfigId,
    configExists,
    churches,
    members,
    loading,
    saving,
    searchTerm, setSearchTerm,
    eligibleSearchTerm, setEligibleSearchTerm,
    eligibleCandidates,
    ineligibleCandidates,
    removedCandidates,
    loadingCandidates,
    customPositions,
    positionDescriptions,
    currentLeaders, setCurrentLeaders,
    showAddPosition, setShowAddPosition,
    newPositionName, setNewPositionName,
    editingPosition,
    editingPositionName, setEditingPositionName,
    editingDescription,
    editingDescriptionText, setEditingDescriptionText,
    filteredMembers,
    selectedVoters,
    filteredEligibleCandidates,
    canAccessElectionConfig,
    handleNewNomination,
    handleChurchChange,
    handleVoterToggle,
    handleCriteriaChange,
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
    handleAddIneligibleCandidate,
    handleRemoveCandidate,
    handleAddCandidate,
    loadEligibleCandidates,
    canProceedToNextStep,
    saveConfig,
    startElection,
  } = useElectionConfigState();

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Preparando configuração de eleição</p>
        </div>
      </MobileLayout>
    );
  }

  if (!canAccessElectionConfig) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem configurar eleições.</p>
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Usuário atual:</strong>
              <br />
              Nome: {user?.name || 'N/A'}
              <br />
              Email: {user?.email || 'N/A'}
              <br />
              Role: {user?.role || 'N/A'}
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold">Configuração de Nomeações</h1>
                {config.title && config.title.trim().length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {config.title}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Configure os parâmetros da nomeação de liderança
              </p>
            </div>
          </div>

          {/* Botão Nova Nomeação */}
          <Button
            variant="default"
            size="sm"
            onClick={handleNewNomination}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Nomeação
          </Button>
        </div>

        {/* Indicador de Passos */}
        <div className="flex items-center justify-center space-x-1 sm:space-x-4 mb-4 sm:mb-6 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map(step => (
            <div key={step} className="flex items-center flex-shrink-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {step}
              </div>
              <span
                className={`hidden sm:block ml-2 text-sm font-medium ${
                  currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {step === 1 && 'Igreja'}
                {step === 2 && 'Votantes'}
                {step === 3 && 'Critérios'}
                {step === 4 && 'Cargos'}
                {step === 5 && 'Candidatos'}
              </span>
              {step < 5 && (
                <div
                  className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Indicador de Modo (Edição ou Criação) */}
        {isEditing ? (
          <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-400">
            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription>
              <strong>Modo Edição</strong> - Você está editando a nomeação ID #{editingConfigId}.
              Clique em "Nova Nomeação" para criar uma nova configuração do zero.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950/50 dark:border-green-400">
            <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>
              <strong>Modo Criação</strong> - Você está criando uma nova nomeação. Todas as
              alterações serão salvas como uma nova configuração.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de Configuração Existente */}
        {configExists && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Configuração já existe!</strong> Já existe uma configuração para esta igreja.
              Você pode editar a configuração existente ou criar uma nova.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChurchIcon className="h-5 w-5" />
                  Seleção da Igreja
                </CardTitle>
                <CardDescription>
                  Selecione qual igreja será feita a eleição de liderança
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nomination-title">Nome da Nomeação</Label>
                  <Input
                    id="nomination-title"
                    type="text"
                    placeholder="Ex.: Nomeação 2025 - Comissão de Nomeações"
                    value={config.title || ''}
                    onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defina um nome para identificar esta nomeação. Útil quando houver várias
                    nomeações para a mesma igreja.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="church">Igreja</Label>
                  <Select
                    value={config.churchId?.toString() || ''}
                    onValueChange={handleChurchChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma igreja" />
                    </SelectTrigger>
                    <SelectContent>
                      {churches.map(church => (
                        <SelectItem key={church.id} value={church.id?.toString() || ''}>
                          {church.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.churchName && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Eleição será realizada na igreja: <strong>{config.churchName}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Seleção de Votantes
                </CardTitle>
                <CardDescription>
                  Selecione quais membros da igreja "{config.churchName || 'Selecione uma igreja'}"
                  poderão votar na eleição
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!config.churchId ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selecione uma igreja na aba "Configuração Básica" para visualizar os membros
                      disponíveis.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Barra de Busca */}
                    <div className="space-y-2">
                      <Label htmlFor="voter-search">Buscar membros</Label>
                      <Input
                        id="voter-search"
                        type="text"
                        placeholder="Digite o nome ou email do membro para pesquisar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Contadores */}
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{filteredMembers.length} membro(s) encontrado(s)</span>
                      <span>{selectedVoters.length} votante(s) selecionado(s)</span>
                    </div>

                    {/* Lista de Membros */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredMembers.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            id={`voter-${member.id}`}
                            checked={config.voters?.includes(member.id) || false}
                            onCheckedChange={() => handleVoterToggle(member.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-medium text-sm truncate">{member.name}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {formatEmailDisplay(member.email)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <Badge variant="secondary" className="text-xs">
                                  {member.role}
                                </Badge>
                                <Badge
                                  variant={
                                    member.status === 'active' || member.status === 'approved'
                                      ? 'default'
                                      : 'outline'
                                  }
                                  className="text-xs"
                                >
                                  {member.status === 'active' || member.status === 'approved'
                                    ? 'Ativo'
                                    : 'Pendente'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {member.church}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredMembers.length === 0 && searchTerm && (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground mb-2">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum membro encontrado para "{searchTerm}"</p>
                          <p className="text-xs mt-1">Tente usar um termo de busca diferente</p>
                        </div>
                      </div>
                    )}

                    {filteredMembers.length === 0 && !searchTerm && (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground mb-2">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum membro encontrado para a igreja "{config.churchName}"</p>
                          <p className="text-xs mt-1">
                            Verifique se a igreja foi selecionada corretamente
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Ações Rápidas */}
                    {filteredMembers.length > 0 && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allMemberIds = filteredMembers.map(m => m.id);
                            setConfig(prev => ({
                              ...prev,
                              voters: allMemberIds,
                            }));
                          }}
                          className="flex-1"
                        >
                          Selecionar Todos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              voters: [],
                            }));
                          }}
                          className="flex-1"
                        >
                          Limpar Seleção
                        </Button>
                      </div>
                    )}

                    {/* Votantes Selecionados */}
                    {selectedVoters.length > 0 && (
                      <div className="space-y-2">
                        <Label>Votantes selecionados ({selectedVoters.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedVoters.map(voter => (
                            <Badge
                              key={voter.id}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              <UserCheck className="h-3 w-3" />
                              {voter.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Critérios de Candidatos
                </CardTitle>
                <CardDescription>
                  Defina os critérios que os candidatos devem atender
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  {/* Fidelidade nos Dízimos e Ofertas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="faithfulness-enabled"
                          checked={config.criteria?.faithfulness?.enabled || false}
                          onCheckedChange={checked =>
                            handleCriteriaChange('faithfulness.enabled', checked)
                          }
                        />
                        <Label htmlFor="faithfulness-enabled" className="cursor-pointer">
                          Fidelidade nos dízimos e ofertas
                        </Label>
                      </div>
                    </div>

                    {config.criteria?.faithfulness?.enabled && (
                      <div className="ml-6 space-y-4">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">
                            Tipos de fidelidade obrigatórios:
                          </Label>

                          {/* Campo inline para Pontual */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">P</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Pontual</Label>
                                <p className="text-xs text-muted-foreground">
                                  Dízimos pagos no prazo
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="punctual"
                              checked={config.criteria?.faithfulness?.punctual || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('faithfulness.punctual', checked)
                              }
                            />
                          </div>

                          {/* Campo inline para Sazonal */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <span className="text-xs font-bold text-green-600 dark:text-green-400">S</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Sazonal</Label>
                                <p className="text-xs text-muted-foreground">
                                  Ofertas especiais e campanhas
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="seasonal"
                              checked={config.criteria?.faithfulness?.seasonal || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('faithfulness.seasonal', checked)
                              }
                            />
                          </div>

                          {/* Campo inline para Recorrente */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">R</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Recorrente</Label>
                                <p className="text-xs text-muted-foreground">
                                  Contribuições regulares
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="recurring"
                              checked={config.criteria?.faithfulness?.recurring || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('faithfulness.recurring', checked)
                              }
                            />
                          </div>
                        </div>

                        {/* Resumo dos critérios selecionados */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                            <Label className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              Critérios Ativos:
                            </Label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {config.criteria?.faithfulness?.punctual && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                              >
                                Pontual
                              </Badge>
                            )}
                            {config.criteria?.faithfulness?.seasonal && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                              >
                                Sazonal
                              </Badge>
                            )}
                            {config.criteria?.faithfulness?.recurring && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                              >
                                Recorrente
                              </Badge>
                            )}
                            {!config.criteria?.faithfulness?.punctual &&
                              !config.criteria?.faithfulness?.seasonal &&
                              !config.criteria?.faithfulness?.recurring && (
                                <span className="text-xs text-muted-foreground">
                                  Nenhum critério selecionado
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Presença Regular */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="attendance-enabled"
                        checked={config.criteria?.attendance?.enabled || false}
                        onCheckedChange={checked =>
                          handleCriteriaChange('attendance.enabled', checked)
                        }
                      />
                      <Label htmlFor="attendance-enabled" className="cursor-pointer">
                        Presença regular (teveParticipacao)
                      </Label>
                    </div>

                    {config.criteria?.attendance?.enabled && (
                      <div className="ml-6 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Tipos de participação aceitos:
                          </Label>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="attendance-punctual"
                              checked={config.criteria?.attendance?.punctual || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('attendance.punctual', checked)
                              }
                            />
                            <Label htmlFor="attendance-punctual" className="cursor-pointer text-sm">
                              Pontual (Recorrente)
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="attendance-seasonal"
                              checked={config.criteria?.attendance?.seasonal || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('attendance.seasonal', checked)
                              }
                            />
                            <Label htmlFor="attendance-seasonal" className="cursor-pointer text-sm">
                              Sazonal (Sazonal + Recorrente)
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="attendance-recurring"
                              checked={config.criteria?.attendance?.recurring || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('attendance.recurring', checked)
                              }
                            />
                            <Label
                              htmlFor="attendance-recurring"
                              className="cursor-pointer text-sm"
                            >
                              Recorrente (apenas Recorrente)
                            </Label>
                          </div>
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Critérios de participação:</strong>
                            <br />• <strong>Pontual:</strong> Apenas membros com participação
                            "Recorrente"
                            <br />• <strong>Sazonal:</strong> Membros com participação "Sazonal" ou
                            "Recorrente"
                            <br />• <strong>Recorrente:</strong> Apenas membros com participação
                            "Recorrente"
                            <br />• <strong>Exclusão:</strong> Membros com "Sem participação" são
                            automaticamente excluídos
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Tempo Mínimo de Igreja */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="church-time-enabled"
                        checked={config.criteria?.churchTime?.enabled || false}
                        onCheckedChange={checked =>
                          handleCriteriaChange('churchTime.enabled', checked)
                        }
                      />
                      <Label htmlFor="church-time-enabled" className="cursor-pointer">
                        Tempo mínimo de batismo
                      </Label>
                    </div>

                    {config.criteria?.churchTime?.enabled && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="minimumYears">Tempo mínimo em anos</Label>
                        <Input
                          id="minimumYears"
                          type="number"
                          min="1"
                          max="50"
                          value={Math.round(
                            (config.criteria?.churchTime?.minimumMonths || 12) / 12
                          )}
                          onChange={e =>
                            handleCriteriaChange(
                              'churchTime.minimumMonths',
                              (parseInt(e.target.value) || 1) * 12
                            )
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          Membros com menos de{' '}
                          {Math.round((config.criteria?.churchTime?.minimumMonths || 12) / 12)} anos
                          de batismo não poderão ser candidatos
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Classificação do Membro */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="classification-enabled"
                          checked={config.criteria?.classification?.enabled || false}
                          onCheckedChange={checked =>
                            handleCriteriaChange('classification.enabled', checked)
                          }
                        />
                        <Label htmlFor="classification-enabled" className="cursor-pointer">
                          Classificação do Membro
                        </Label>
                      </div>
                    </div>

                    {config.criteria?.classification?.enabled && (
                      <div className="ml-6 space-y-4">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">
                            Tipos de classificação aceitos:
                          </Label>

                          {/* Campo inline para Frequente */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <span className="text-xs font-bold text-green-600 dark:text-green-400">F</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Frequente</Label>
                                <p className="text-xs text-muted-foreground">
                                  Membros com participação regular
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="classification-frequente"
                              checked={config.criteria?.classification?.frequente || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('classification.frequente', checked)
                              }
                            />
                          </div>

                          {/* Campo inline para Não Frequente */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">N</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Não Frequente</Label>
                                <p className="text-xs text-muted-foreground">
                                  Membros com baixa participação
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="classification-naoFrequente"
                              checked={config.criteria?.classification?.naoFrequente || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('classification.naoFrequente', checked)
                              }
                            />
                          </div>

                          {/* Campo inline para A Resgatar */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                                <span className="text-xs font-bold text-red-600 dark:text-red-400">R</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">A Resgatar</Label>
                                <p className="text-xs text-muted-foreground">
                                  Membros inativos/afastados
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="classification-aResgatar"
                              checked={config.criteria?.classification?.aResgatar || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('classification.aResgatar', checked)
                              }
                            />
                          </div>
                        </div>

                        {/* Resumo dos critérios selecionados */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                            <Label className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              Critérios Ativos:
                            </Label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {config.criteria?.classification?.frequente && (
                              <Badge
                                variant="success"
                                className="text-xs px-3 py-1 shadow-sm border-0"
                              >
                                <span className="font-semibold">Frequente</span>
                              </Badge>
                            )}
                            {config.criteria?.classification?.naoFrequente && (
                              <Badge
                                variant="warning"
                                className="text-xs px-3 py-1 shadow-sm border-0"
                              >
                                <span className="font-semibold">Não Frequente</span>
                              </Badge>
                            )}
                            {config.criteria?.classification?.aResgatar && (
                              <Badge
                                variant="destructive"
                                className="text-xs px-3 py-1 shadow-sm border-0"
                              >
                                <span className="font-semibold">A Resgatar</span>
                              </Badge>
                            )}
                            {!config.criteria?.classification?.frequente &&
                              !config.criteria?.classification?.naoFrequente &&
                              !config.criteria?.classification?.aResgatar && (
                                <span className="text-xs text-muted-foreground">
                                  Nenhum critério selecionado
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Limite de Cargos por Pessoa */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="position-limit-enabled"
                        checked={config.criteria?.positionLimit?.enabled || false}
                        onCheckedChange={checked =>
                          handleCriteriaChange('positionLimit.enabled', checked)
                        }
                      />
                      <Label htmlFor="position-limit-enabled" className="cursor-pointer">
                        Limite de cargos por pessoa
                      </Label>
                    </div>

                    {config.criteria?.positionLimit?.enabled && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="maxPositions">Máximo de cargos por pessoa</Label>
                        <Input
                          id="maxPositions"
                          type="number"
                          min="1"
                          max="4"
                          value={config.criteria?.positionLimit?.maxPositions || 2}
                          onChange={e =>
                            handleCriteriaChange(
                              'positionLimit.maxPositions',
                              parseInt(e.target.value)
                            )
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          Uma pessoa pode ser eleita para no máximo{' '}
                          {config.criteria?.positionLimit?.maxPositions || 2} cargo(s)
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Quantidade de Anciãos */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="elders-count-enabled"
                        checked={config.criteria?.eldersCount?.enabled || false}
                        onCheckedChange={checked =>
                          handleCriteriaChange('eldersCount.enabled', checked)
                        }
                      />
                      <Label htmlFor="elders-count-enabled" className="cursor-pointer">
                        Quantidade de anciãos a serem eleitos
                      </Label>
                    </div>

                    {config.criteria?.eldersCount?.enabled && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="eldersCount">Número de anciãos</Label>
                        <Input
                          id="eldersCount"
                          type="number"
                          min="1"
                          max="10"
                          value={config.criteria?.eldersCount?.count || 1}
                          onChange={e =>
                            handleCriteriaChange('eldersCount.count', parseInt(e.target.value))
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          Serão eleitos {config.criteria?.eldersCount?.count || 1} ancião(s) para a
                          igreja
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
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
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelAdd}>
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
                                      >
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="h-6 w-6 p-0"
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
                                        >
                                          <Save className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelDescriptionEdit}
                                          className="h-6 w-6 p-0"
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
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditDescription(position)}
                                      className="h-6 w-6 p-0"
                                      title="Editar descrição"
                                    >
                                      <FileText className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteCustomPosition(position)}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                      title="Excluir cargo"
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
          )}

          {/* Passo 5: Preview de Candidatos Elegíveis */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Candidatos Elegíveis
                </CardTitle>
                <CardDescription>
                  Visualize os membros que atendem aos critérios definidos e podem ser candidatos
                  nas nomeações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button
                    onClick={loadEligibleCandidates}
                    disabled={loadingCandidates || !config.churchId}
                    variant="outline"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${loadingCandidates ? 'animate-spin' : ''}`}
                    />
                    {loadingCandidates ? 'Carregando...' : 'Atualizar Lista'}
                  </Button>

                  {eligibleCandidates.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {eligibleCandidates.length} candidato(s) elegível(eis)
                    </div>
                  )}
                </div>

                {loadingCandidates ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-lg text-gray-600 dark:text-gray-300">
                      Carregando candidatos...
                    </span>
                  </div>
                ) : eligibleCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Nenhum candidato elegível
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {config.churchId
                        ? 'Nenhum membro da igreja selecionada atende aos critérios definidos.'
                        : 'Selecione uma igreja primeiro para visualizar os candidatos.'}
                    </p>
                    {config.churchId && (
                      <Button onClick={loadEligibleCandidates} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] items-center">
                      <div>
                        <Label htmlFor="eligible-search" className="sr-only">
                          Buscar candidato elegível
                        </Label>
                        <Input
                          id="eligible-search"
                          placeholder="Buscar candidato por nome, e-mail ou função"
                          value={eligibleSearchTerm}
                          onChange={event => setEligibleSearchTerm(event.target.value)}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground md:text-right">
                        Exibindo {filteredEligibleCandidates.length} de {eligibleCandidates.length}
                      </div>
                    </div>
                    {filteredEligibleCandidates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum candidato encontrado para a busca atual.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {filteredEligibleCandidates.map(candidate => (
                          <Card key={candidate.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{candidate.name}</h4>
                                  <p className="text-sm text-muted-foreground">{formatEmailDisplay(candidate.email)}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={
                                    candidate.status === 'active' || candidate.status === 'approved'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {candidate.status === 'active' || candidate.status === 'approved'
                                    ? 'Ativo'
                                    : 'Pendente'}
                                </Badge>
                                <Badge variant="outline">{candidate.role}</Badge>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Tempo de batismo:</span>
                                  <Badge
                                    variant={
                                      candidate.churchTime?.includes('Não')
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.churchTimeYears > 0
                                      ? `${candidate.churchTimeYears} anos`
                                      : 'Não informado'}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Dizimista:</span>
                                  <Badge
                                    variant={
                                      candidate.isTither?.includes('Não') ||
                                      candidate.isTither === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.isTither}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Ofertante:</span>
                                  <Badge
                                    variant={
                                      candidate.isDonor?.includes('Não') ||
                                      candidate.isDonor === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.isDonor}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Presença:</span>
                                  <Badge
                                    variant={
                                      candidate.attendance?.includes('Não') ||
                                      candidate.attendance === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.attendance}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-sm">Classificação:</span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      candidate.classification === 'Frequente'
                                        ? 'bg-green-50 text-green-700 border-green-300'
                                        : candidate.classification === 'Não Frequente'
                                          ? 'bg-orange-50 text-orange-700 border-orange-300'
                                          : candidate.classification === 'A Resgatar'
                                            ? 'bg-red-50 text-red-700 border-red-300'
                                            : 'bg-gray-50 text-gray-600'
                                    }
                                  >
                                    {candidate.classification}
                                  </Badge>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveCandidate(candidate.id)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Esta lista mostra apenas os membros que atendem aos critérios definidos.
                        Durante a nomeação, apenas estes membros poderão ser indicados como
                        candidatos.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Seção de Candidatos Não Elegíveis */}
                {ineligibleCandidates.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-orange-700 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Candidatos Não Elegíveis ({ineligibleCandidates.length})
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Membros que não atendem aos critérios definidos, mas podem ser adicionados
                      manualmente pelo administrador.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ineligibleCandidates.map(candidate => (
                        <Card key={candidate.id} className="border-orange-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-orange-800">{candidate.name}</h4>
                                <p className="text-sm text-muted-foreground">{formatEmailDisplay(candidate.email)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge
                                    variant={
                                      candidate.status === 'active' ||
                                      candidate.status === 'approved'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                  >
                                    {candidate.status === 'active' ||
                                    candidate.status === 'approved'
                                      ? 'Ativo'
                                      : 'Pendente'}
                                  </Badge>
                                  <Badge variant="outline">{candidate.role}</Badge>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddIneligibleCandidate(candidate)}
                                className="ml-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            </div>

                            <div className="mt-3 pt-3 border-t border-orange-100">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Tempo de batismo:</span>
                                  <Badge
                                    variant={
                                      candidate.churchTimeYears === 0 ? 'secondary' : 'default'
                                    }
                                  >
                                    {candidate.churchTimeYears > 0
                                      ? `${candidate.churchTimeYears} anos`
                                      : 'Não informado'}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Dizimista:</span>
                                  <Badge
                                    variant={
                                      candidate.isTither?.includes('Não') ||
                                      candidate.isTither === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.isTither}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Ofertante:</span>
                                  <Badge
                                    variant={
                                      candidate.isDonor?.includes('Não') ||
                                      candidate.isDonor === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.isDonor}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Presença:</span>
                                  <Badge
                                    variant={
                                      candidate.attendance?.includes('Não') ||
                                      candidate.attendance === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.attendance}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 mt-3">
                                <span className="font-medium text-sm">Classificação:</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    candidate.classification === 'Frequente'
                                      ? 'bg-green-50 text-green-700 border-green-300'
                                      : candidate.classification === 'Não Frequente'
                                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                                        : candidate.classification === 'A Resgatar'
                                          ? 'bg-red-50 text-red-700 border-red-300'
                                          : 'bg-gray-50 text-gray-600'
                                  }
                                >
                                  {candidate.classification}
                                </Badge>
                              </div>

                              {/* Motivos de não elegibilidade */}
                              <div className="mt-3 pt-3 border-t border-orange-100">
                                <p className="text-sm font-medium text-orange-700 mb-2">Motivos:</p>
                                <div className="space-y-1">
                                  {candidate.eligibilityReasons.map(
                                    (reason: string, index: number) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-2 text-sm text-orange-600"
                                      >
                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                        <span>{reason}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Alert className="mt-4 border-orange-200">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        Estes membros não atendem aos critérios definidos, mas podem ser adicionados
                        manualmente clicando no botão "Adicionar" se o administrador considerar
                        apropriado.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Seção de Candidatos Removidos Manualmente */}
                {removedCandidates.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                        <X className="h-5 w-5" />
                        Candidatos Removidos Manualmente ({removedCandidates.length})
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Candidatos que foram removidos manualmente pelo administrador.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {eligibleCandidates
                        .filter(c => removedCandidates.includes(c.id))
                        .map(candidate => (
                          <Card key={candidate.id} className="border-red-200 bg-red-50">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-red-800">{candidate.name}</h4>
                                  <p className="text-sm text-muted-foreground">{formatEmailDisplay(candidate.email)}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-red-100 text-red-700 border-red-300"
                                    >
                                      Removido
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddCandidate(candidate.id)}
                                  className="ml-2 border-green-300 text-green-700 hover:bg-green-50"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Adicionar de Volta
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <Info className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Estes candidatos foram removidos manualmente e não participarão da eleição.
                        Você pode adicioná-los de volta clicando em "Adicionar de Volta".
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navegação entre Passos */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 sm:pt-6 border-t gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="order-2 sm:order-1"
          >
            Anterior
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
            {currentStep < 5 ? (
              <Button
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                disabled={!canProceedToNextStep()}
                className="w-full sm:w-auto"
              >
                Próximo
              </Button>
            ) : (
              <>
                <Button
                  onClick={saveConfig}
                  disabled={saving}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  <span className="truncate">
                    {saving
                      ? 'Salvando...'
                      : isEditing
                        ? 'Salvar Alterações'
                        : 'Salvar Configuração'}
                  </span>
                </Button>

                <Button
                  onClick={startElection}
                  disabled={loading}
                  variant="default"
                  className="w-full sm:w-auto"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Iniciando...' : 'Iniciar Nomeação'}
                </Button>
              </>
            )}
          </div>
        </div>

        {config.status === 'active' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Nomeação ativa!</strong> Os votantes já podem acessar a página de votação.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MobileLayout>
  );
}
