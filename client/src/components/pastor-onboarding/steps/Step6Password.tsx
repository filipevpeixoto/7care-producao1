/**
 * Passo 6: Definir Senha
 * Design elegante e moderno
 */

import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Step6PasswordProps {
  onSubmit: (password: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export function Step6Password({ onSubmit, onBack, isLoading }: Step6PasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validações de senha
  const validations = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const isPasswordValid = Object.values(validations).every(v => v);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validations.minLength) {
      newErrors.password = 'Senha deve ter no mínimo 8 caracteres';
    } else if (!validations.hasUpper) {
      newErrors.password = 'Senha deve ter pelo menos 1 letra maiúscula';
    } else if (!validations.hasNumber) {
      newErrors.password = 'Senha deve ter pelo menos 1 número';
    }

    if (!validations.match) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'Você deve aceitar os termos de uso';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 md:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-100 mb-4">
          <Sparkles className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-700">Passo Final</span>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Criar Senha
        </h2>
        <p className="text-gray-500 mt-3 text-lg">Defina uma senha segura para sua conta</p>
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-10">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-lg">
          <Shield className="w-12 h-12 text-green-500" />
        </div>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-base font-semibold text-gray-700">
            Senha <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg rounded-xl border-gray-200 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500 transition-all"
              placeholder="Crie uma senha segura"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Password validations */}
        <div className="space-y-3 bg-gradient-to-r from-gray-50 to-white p-5 rounded-2xl border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Sua senha deve conter:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  validations.minLength ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                {validations.minLength ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : (
                  <X className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${validations.minLength ? 'text-green-700' : 'text-gray-500'}`}
              >
                Mínimo 8 caracteres
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  validations.hasUpper ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                {validations.hasUpper ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : (
                  <X className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${validations.hasUpper ? 'text-green-700' : 'text-gray-500'}`}
              >
                Pelo menos 1 letra maiúscula
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  validations.hasNumber ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                {validations.hasNumber ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : (
                  <X className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${validations.hasNumber ? 'text-green-700' : 'text-gray-500'}`}
              >
                Pelo menos 1 número
              </span>
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-base font-semibold text-gray-700">
            Confirmar Senha <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg rounded-xl border-gray-200 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500 transition-all"
              placeholder="Digite a senha novamente"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.confirmPassword}
            </p>
          )}
          {validations.match && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Senhas coincidem!
            </p>
          )}
        </div>

        {/* Terms */}
        <div
          className={`flex items-start gap-4 p-5 border-2 rounded-2xl transition-all cursor-pointer ${
            acceptedTerms ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setAcceptedTerms(!acceptedTerms)}
        >
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={checked => setAcceptedTerms(checked as boolean)}
            className="mt-1"
          />
          <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
            Li e aceito os{' '}
            <a
              href="/termos"
              target="_blank"
              className="text-blue-600 hover:underline font-medium"
              onClick={e => e.stopPropagation()}
            >
              Termos de Uso
            </a>{' '}
            e{' '}
            <a
              href="/privacidade"
              target="_blank"
              className="text-blue-600 hover:underline font-medium"
              onClick={e => e.stopPropagation()}
            >
              Política de Privacidade
            </a>
          </Label>
        </div>
        {errors.terms && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-500" />
            {errors.terms}
          </p>
        )}

        {/* Info box */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-5">
          <p className="text-sm text-blue-800 flex items-start gap-2">
            <span className="text-xl">💡</span>
            <span>
              Seu cadastro será enviado para aprovação do administrador. Você receberá um email
              quando for aprovado.
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          size="lg"
          disabled={isLoading}
          className="h-14 px-8 text-lg rounded-xl border-gray-200 hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={!isPasswordValid || !acceptedTerms || isLoading}
          className="h-14 px-10 text-lg rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Finalizar Cadastro
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
