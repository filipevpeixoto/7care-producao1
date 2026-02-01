/**
 * Passo 6: Configuração do Dracma (Opcional)
 * Permite que o pastor configure automação de recibos
 */

import React, { useState } from 'react';
import {
  Receipt,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DracmaConfigData } from '@/types/pastor-invite';

interface Step6DracmaConfigProps {
  data?: DracmaConfigData;
  onNext: (data: DracmaConfigData) => void;
  onBack: () => void;
}

export function Step6DracmaConfig({ data, onNext, onBack }: Step6DracmaConfigProps) {
  const [enableAutomation, setEnableAutomation] = useState(data?.enableAutomation || false);
  const [formData, setFormData] = useState({
    dracmaUsername: data?.dracmaUsername || '',
    dracmaPassword: data?.dracmaPassword || '',
    ocrApiKey: data?.ocrApiKey || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    if (!enableAutomation) {
      // Se não quiser usar, não precisa validar
      return true;
    }

    const newErrors: Record<string, string> = {};

    if (!formData.dracmaUsername.trim()) {
      newErrors.dracmaUsername = 'Usuário do Dracma é obrigatório';
    }

    if (!formData.dracmaPassword.trim()) {
      newErrors.dracmaPassword = 'Senha do Dracma é obrigatória';
    } else if (formData.dracmaPassword.length < 6) {
      newErrors.dracmaPassword = 'Senha deve ter no mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const configData: DracmaConfigData = {
      enableAutomation,
      ...(enableAutomation && {
        dracmaUsername: formData.dracmaUsername,
        dracmaPassword: formData.dracmaPassword,
        ocrApiKey: formData.ocrApiKey || undefined,
      }),
    };

    onNext(configData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
          <span className="text-xs sm:text-sm font-medium text-blue-700">Passo 6 de 7</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Automação de Notas Fiscais
        </h2>
        <p className="text-gray-500 mt-2 sm:mt-3 text-sm sm:text-base md:text-lg">
          Configure a automação de lançamento de recibos no Dracma (Opcional)
        </p>
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center ring-4 ring-blue-50 shadow-lg">
          <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-100 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Info className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                📱 O que é a Automação de Recibos?
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Tire foto de notas fiscais com o celular</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Envie pelo WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Sistema lê automaticamente (OCR)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Lança no Dracma sem você digitar nada</span>
                </li>
              </ul>
              <p className="mt-3 text-xs sm:text-sm font-medium text-blue-700">
                ⏱️ Economize tempo lançando suas despesas de reembolso!
              </p>
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-base sm:text-lg font-semibold text-gray-900 cursor-pointer">
                Quero usar a automação de recibos
              </Label>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Ative para configurar suas credenciais do Dracma
              </p>
            </div>
            <Switch
              checked={enableAutomation}
              onCheckedChange={setEnableAutomation}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>
        </div>

        {/* Form Fields (shown only if enabled) */}
        {enableAutomation && (
          <div className="space-y-6 bg-white border-2 border-blue-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                Configure suas credenciais do Dracma
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Use suas credenciais de acesso ao{' '}
                <a
                  href="https://dracma.sdasystems.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  dracma.sdasystems.org
                </a>
              </p>
            </div>

            {/* Dracma Username */}
            <div className="space-y-2">
              <Label
                htmlFor="dracmaUsername"
                className="text-sm sm:text-base font-semibold text-gray-700"
              >
                Usuário do Dracma <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dracmaUsername"
                type="text"
                value={formData.dracmaUsername}
                onChange={e => setFormData({ ...formData, dracmaUsername: e.target.value })}
                className="h-12 sm:h-14 text-base sm:text-lg rounded-xl border-2 border-blue-400 !bg-white !text-gray-800 placeholder:text-blue-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="seu.usuario"
              />
              {errors.dracmaUsername && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500" />
                  {errors.dracmaUsername}
                </p>
              )}
            </div>

            {/* Dracma Password */}
            <div className="space-y-2">
              <Label
                htmlFor="dracmaPassword"
                className="text-sm sm:text-base font-semibold text-gray-700"
              >
                Senha do Dracma <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="dracmaPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.dracmaPassword}
                  onChange={e => setFormData({ ...formData, dracmaPassword: e.target.value })}
                  className="h-12 sm:h-14 text-base sm:text-lg rounded-xl border-2 border-blue-400 !bg-white !text-gray-800 placeholder:text-blue-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.dracmaPassword && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500" />
                  {errors.dracmaPassword}
                </p>
              )}
            </div>

            {/* OCR API Key (Optional) */}
            <div className="space-y-2">
              <Label
                htmlFor="ocrApiKey"
                className="text-sm sm:text-base font-semibold text-gray-700"
              >
                API Key do OCR.space <span className="text-gray-400 font-normal">(Opcional)</span>
              </Label>
              <Input
                id="ocrApiKey"
                type="text"
                value={formData.ocrApiKey}
                onChange={e => setFormData({ ...formData, ocrApiKey: e.target.value })}
                className="h-12 sm:h-14 text-base sm:text-lg rounded-xl border-2 border-gray-300 !bg-white !text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Deixe em branco para usar o padrão"
              />
              <p className="text-xs text-gray-500">
                Opcional. Registre-se grátis em{' '}
                <a
                  href="https://ocr.space/ocrapi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  ocr.space/ocrapi
                </a>{' '}
                para 500 leituras/dia
              </p>
            </div>

            {/* Security Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div className="text-xs sm:text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Importante:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Suas credenciais são criptografadas e seguras</li>
                    <li>Você pode desativar a qualquer momento</li>
                    <li>Funcionalidade totalmente opcional</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skip Message */}
        {!enableAutomation && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 sm:p-6 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              Você pode configurar a automação de recibos depois nas configurações do sistema.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-gray-100">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          size="lg"
          className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-8 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl border-2 hover:bg-gray-50 w-full sm:w-auto"
        >
          <ArrowLeft className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          Voltar
        </Button>

        <Button
          type="submit"
          size="lg"
          className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-8 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 w-full sm:w-auto"
        >
          {enableAutomation ? 'Salvar e Continuar' : 'Pular esta etapa'}
          <ArrowRight className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
        </Button>
      </div>
    </form>
  );
}
