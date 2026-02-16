import React from 'react';
import { formatEmailDisplay } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  RefreshCw,
  Loader2,
  User,
  Info,
  AlertTriangle,
  UserPlus,
  X,
} from 'lucide-react';
import type { ElectionConfigData } from './types';

export interface CandidateMember {
  id: number;
  name: string;
  email?: string;
  church?: string;
  unit?: string;
  role?: string;
  status?: string;
  churchTime?: string;
  churchTimeYears?: number;
  isTither?: string;
  isDonor?: string;
  attendance?: string;
  classification?: string;
  eligibilityReasons?: string[];
  [key: string]: unknown;
}

export interface StepCandidatesProps {
  config: ElectionConfigData;
  eligibleCandidates: CandidateMember[];
  ineligibleCandidates: CandidateMember[];
  removedCandidates: number[];
  loadingCandidates: boolean;
  eligibleSearchTerm: string;
  setEligibleSearchTerm: (value: string) => void;
  filteredEligibleCandidates: CandidateMember[];
  loadEligibleCandidates: () => void;
  handleRemoveCandidate: (id: number) => void;
  handleAddIneligibleCandidate: (candidate: CandidateMember) => void;
  handleAddCandidate: (id: number) => void;
}

export function StepCandidates({
  config,
  eligibleCandidates,
  ineligibleCandidates,
  removedCandidates,
  loadingCandidates,
  eligibleSearchTerm,
  setEligibleSearchTerm,
  filteredEligibleCandidates,
  loadEligibleCandidates,
  handleRemoveCandidate,
  handleAddIneligibleCandidate,
  handleAddCandidate,
}: StepCandidatesProps) {
  return (
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
                            {(candidate.churchTimeYears ?? 0) > 0
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
                            {(candidate.churchTimeYears ?? 0) > 0
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
                          {(candidate.eligibilityReasons ?? []).map(
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
  );
}
