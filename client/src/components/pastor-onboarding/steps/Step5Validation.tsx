/**
 * Step 5: Validação de Igrejas
 * UI para validar correspondências entre igrejas da planilha e igrejas existentes
 * Design elegante e moderno
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
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
      <div className="p-8 md:p-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-4">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">Passo 5 de 6</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Validação de Igrejas
          </h2>
          <p className="text-gray-500 mt-3 text-lg">
            Nenhuma planilha foi importada. Você pode continuar sem importar membros.
          </p>
        </div>

        <Alert className="rounded-2xl border-blue-200 bg-blue-50">
          <HelpCircle className="h-5 w-5 text-blue-500" />
          <AlertDescription className="ml-2 text-blue-700">
            Como você não importou uma planilha, as igrejas cadastradas manualmente serão usadas.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onBack}
            size="lg"
            className="h-14 px-8 text-lg rounded-xl border-gray-200 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={onNext}
            size="lg"
            className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            Continuar
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 md:p-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-4">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-sm font-medium text-blue-700">Validando...</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Validando Igrejas
          </h2>
          <p className="text-gray-500 mt-3 text-lg">
            Estamos verificando as igrejas da sua planilha.
          </p>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2 rounded-lg" />
                  <Skeleton className="h-4 w-32 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-4">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-700">Passo 5 de 6</span>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Validação de Igrejas
        </h2>
        <p className="text-gray-500 mt-3 text-lg">
          Verifique as correspondências e escolha como processar cada igreja.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold text-green-900">{exactMatches}</p>
          <p className="text-sm text-green-700 mt-1">Correspondências exatas</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold text-yellow-900">{similarFound}</p>
          <p className="text-sm text-yellow-700 mt-1">Similares encontradas</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <XCircle className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold text-red-900">{notFound}</p>
          <p className="text-sm text-red-700 mt-1">Não encontradas</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 rounded-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Lista de Validações */}
      <div className="space-y-4 max-w-3xl mx-auto">
        {validations.map(validation => {
          const currentValidation = churchValidations.find(
            v => v.excelChurchName === validation.churchName
          );
          const isExpanded = expandedChurch === validation.churchName;

          return (
            <div
              key={validation.churchName}
              className={`border-2 rounded-2xl transition-all overflow-hidden ${
                validation.status === 'exact_match'
                  ? 'border-green-200 bg-gradient-to-r from-green-50/50 to-white'
                  : validation.status === 'similar_found'
                    ? 'border-yellow-200 bg-gradient-to-r from-yellow-50/50 to-white'
                    : 'border-red-200 bg-gradient-to-r from-red-50/50 to-white'
              }`}
            >
              <div
                className="p-5 cursor-pointer"
                onClick={() => setExpandedChurch(isExpanded ? null : validation.churchName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                        validation.status === 'exact_match'
                          ? 'bg-green-100'
                          : validation.status === 'similar_found'
                            ? 'bg-yellow-100'
                            : 'bg-red-100'
                      }`}
                    >
                      {getStatusIcon(validation.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {validation.churchName}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <Users className="w-4 h-4" />
                        {validation.memberCount} membros na planilha
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(validation.status)}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isExpanded ? 'bg-gray-100' : 'hover:bg-gray-100'
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5">
                  <div className="border-t border-gray-200 pt-5">
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
                        <div className="flex items-center space-x-3 p-4 rounded-xl bg-green-50 border border-green-200">
                          <RadioGroupItem value="use_match" id={`match-${validation.churchName}`} />
                          <Label
                            htmlFor={`match-${validation.churchName}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-green-600" />
                              <span className="font-semibold text-green-800">
                                Usar igreja existente
                              </span>
                            </div>
                            <p className="text-sm text-green-700 mt-1">
                              A igreja já existe no sistema e será vinculada automaticamente.
                            </p>
                          </Label>
                        </div>
                      )}

                      {/* Opção: Usar sugestão similar */}
                      {validation.suggestions && validation.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            Igrejas similares encontradas:
                          </p>
                          {validation.suggestions.map(suggestion => (
                            <div
                              key={suggestion.id}
                              className="flex items-center space-x-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200"
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
                                    <Building2 className="w-5 h-5 text-yellow-600" />
                                    <span className="font-semibold text-yellow-800">
                                      {suggestion.name}
                                    </span>
                                  </div>
                                  <Badge className="bg-yellow-200 text-yellow-800 border-0">
                                    {Math.round(suggestion.similarity * 100)}% similar
                                  </Badge>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Opção: Criar nova igreja */}
                      <div className="flex items-center space-x-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                        <RadioGroupItem value="create_new" id={`new-${validation.churchName}`} />
                        <Label
                          htmlFor={`new-${validation.churchName}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">Criar nova igreja</span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            Criar "{validation.churchName}" como uma nova igreja no sistema.
                          </p>
                        </Label>
                      </div>

                      {/* Opção: Ignorar */}
                      <div className="flex items-center space-x-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <RadioGroupItem value="ignore" id={`ignore-${validation.churchName}`} />
                        <Label
                          htmlFor={`ignore-${validation.churchName}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-gray-400" />
                            <span className="font-semibold text-gray-600">Ignorar</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Não importar membros desta igreja.
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          onClick={onBack}
          size="lg"
          className="h-14 px-8 text-lg rounded-xl border-gray-200 hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
          Continuar para Finalizar
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
