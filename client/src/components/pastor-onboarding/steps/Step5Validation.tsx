/**
 * Step 5: Validação de Igrejas
 * UI para validar correspondências entre igrejas da planilha e igrejas existentes
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  HelpCircle,
} from 'lucide-react';
import {
  ChurchValidation,
  ChurchValidationAction,
  ValidationResult,
  ExcelData,
} from '@/types/pastor-invite';

interface Step5ValidationProps {
  excelData?: ExcelData;
  validations?: ChurchValidation[];
  onUpdate: (validations: ChurchValidation[]) => void;
  onNext: () => void;
  onBack: () => void;
  token: string;
}

export function Step5Validation({
  excelData,
  validations: existingValidations,
  onUpdate,
  onNext,
  onBack,
  token,
}: Step5ValidationProps) {
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [churchValidations, setChurchValidations] = useState<ChurchValidation[]>(
    existingValidations || []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChurch, setExpandedChurch] = useState<string | null>(null);

  // Buscar validações do servidor
  useEffect(() => {
    if (!excelData || excelData.data.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchValidations = async () => {
      try {
        const response = await fetch(`/api/invites/${token}/validate-churches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ excelData }),
        });

        if (!response.ok) {
          throw new Error('Erro ao validar igrejas');
        }

        const result = await response.json();
        setValidations(result.validations);

        // Inicializar churchValidations com valores padrão
        if (!existingValidations || existingValidations.length === 0) {
          const initialValidations: ChurchValidation[] = result.validations.map(
            (v: ValidationResult) => ({
              excelChurchName: v.churchName,
              status: v.status,
              matchedChurchId: v.matchedChurchId,
              memberCount: v.memberCount,
              action:
                v.status === 'exact_match'
                  ? 'use_match'
                  : v.status === 'similar_found'
                    ? 'use_suggestion'
                    : 'create_new',
              selectedSuggestionId: v.suggestions?.[0]?.id,
            })
          );
          setChurchValidations(initialValidations);
          onUpdate(initialValidations);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao validar igrejas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchValidations();
  }, [excelData, token]);

  const handleActionChange = (
    churchName: string,
    action: ChurchValidationAction,
    suggestionId?: number
  ) => {
    const updated = churchValidations.map(v =>
      v.excelChurchName === churchName ? { ...v, action, selectedSuggestionId: suggestionId } : v
    );
    setChurchValidations(updated);
    onUpdate(updated);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exact_match':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'similar_found':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'not_found':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <HelpCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'exact_match':
        return <Badge className="bg-green-100 text-green-800">Correspondência exata</Badge>;
      case 'similar_found':
        return <Badge className="bg-yellow-100 text-yellow-800">Similar encontrada</Badge>;
      case 'not_found':
        return <Badge className="bg-red-100 text-red-800">Não encontrada</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  // Contadores
  const exactMatches = validations.filter(v => v.status === 'exact_match').length;
  const similarFound = validations.filter(v => v.status === 'similar_found').length;
  const notFound = validations.filter(v => v.status === 'not_found').length;

  // Se não há dados de Excel, pular
  if (!excelData || excelData.data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Validação de Igrejas</h2>
          <p className="text-gray-600 mt-2">
            Nenhuma planilha foi importada. Você pode continuar sem importar membros.
          </p>
        </div>

        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertDescription>
            Como você não importou uma planilha, as igrejas cadastradas manualmente serão usadas.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext}>Continuar</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Validando Igrejas...</h2>
          <p className="text-gray-600 mt-2">Estamos verificando as igrejas da sua planilha.</p>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Validação de Igrejas</h2>
        <p className="text-gray-600 mt-2">
          Verifique as correspondências encontradas e escolha como processar cada igreja.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">{exactMatches}</p>
            <p className="text-xs text-green-700">Correspondências exatas</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-900">{similarFound}</p>
            <p className="text-xs text-yellow-700">Similares encontradas</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-900">{notFound}</p>
            <p className="text-xs text-red-700">Não encontradas</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Lista de Validações */}
      <div className="space-y-3">
        {validations.map(validation => {
          const currentValidation = churchValidations.find(
            v => v.excelChurchName === validation.churchName
          );
          const isExpanded = expandedChurch === validation.churchName;

          return (
            <Card
              key={validation.churchName}
              className={`transition-all ${
                validation.status === 'exact_match'
                  ? 'border-green-200'
                  : validation.status === 'similar_found'
                    ? 'border-yellow-200'
                    : 'border-red-200'
              }`}
            >
              <CardHeader
                className="p-4 cursor-pointer"
                onClick={() => setExpandedChurch(isExpanded ? null : validation.churchName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(validation.status)}
                    <div>
                      <CardTitle className="text-base">{validation.churchName}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Users className="w-3 h-3" />
                        {validation.memberCount} membros na planilha
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(validation.status)}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="border-t pt-4">
                    <RadioGroup
                      value={currentValidation?.action || 'create_new'}
                      onValueChange={value =>
                        handleActionChange(
                          validation.churchName,
                          value as ChurchValidationAction,
                          value === 'use_suggestion' ? validation.suggestions?.[0]?.id : undefined
                        )
                      }
                      className="space-y-3"
                    >
                      {/* Opção: Usar correspondência exata */}
                      {validation.status === 'exact_match' && validation.matchedChurchId && (
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50">
                          <RadioGroupItem value="use_match" id={`match-${validation.churchName}`} />
                          <Label
                            htmlFor={`match-${validation.churchName}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Usar igreja existente</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              A igreja já existe no sistema e será vinculada automaticamente.
                            </p>
                          </Label>
                        </div>
                      )}

                      {/* Opção: Usar sugestão similar */}
                      {validation.suggestions && validation.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            Igrejas similares encontradas:
                          </p>
                          {validation.suggestions.map(suggestion => (
                            <div
                              key={suggestion.id}
                              className="flex items-center space-x-3 p-3 rounded-lg bg-yellow-50"
                            >
                              <RadioGroupItem
                                value="use_suggestion"
                                id={`suggestion-${validation.churchName}-${suggestion.id}`}
                                onClick={() =>
                                  handleActionChange(
                                    validation.churchName,
                                    'use_suggestion',
                                    suggestion.id
                                  )
                                }
                              />
                              <Label
                                htmlFor={`suggestion-${validation.churchName}-${suggestion.id}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-yellow-600" />
                                    <span className="font-medium">{suggestion.name}</span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(suggestion.similarity * 100)}% similar
                                  </Badge>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Opção: Criar nova igreja */}
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50">
                        <RadioGroupItem value="create_new" id={`new-${validation.churchName}`} />
                        <Label
                          htmlFor={`new-${validation.churchName}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Criar nova igreja</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Criar "{validation.churchName}" como uma nova igreja no sistema.
                          </p>
                        </Label>
                      </div>

                      {/* Opção: Ignorar */}
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                        <RadioGroupItem value="ignore" id={`ignore-${validation.churchName}`} />
                        <Label
                          htmlFor={`ignore-${validation.churchName}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-600">Ignorar</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Não importar membros desta igreja.
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Botões de Navegação */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext}>Continuar para Finalizar</Button>
      </div>
    </div>
  );
}
