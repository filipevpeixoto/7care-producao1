import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Target, AlertCircle } from 'lucide-react';
import type { ElectionConfigData } from './types';

export interface StepCriteriaProps {
  config: ElectionConfigData;
  handleCriteriaChange: (path: string, value: string | number | boolean) => void;
}

export function StepCriteria({ config, handleCriteriaChange }: StepCriteriaProps) {
  return (
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
  );
}
