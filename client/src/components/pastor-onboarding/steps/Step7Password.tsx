/**
 * Passo 7: Definir Senha
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
  Loader2,
  CheckCircle2,
  Sparkles,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Step7PasswordProps {
  onSubmit: (password: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export function Step7Password({ onSubmit, onBack, isLoading }: Step7PasswordProps) {
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

  const isPasswordValid = Object.values(validations).every((v) => v);

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
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-100 mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
          <span className="text-xs sm:text-sm font-medium text-green-700">
            Passo 7 de 7 - Final
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:bg-none dark:text-[var(--p7-text)]">
          Criar Senha
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-[var(--p7-text-2)] sm:mt-3 sm:text-base md:text-lg">
          Defina uma senha segura para sua conta
        </p>
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-6 sm:mb-10">
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-lg">
          <Shield className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" />
        </div>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        {/* Password */}
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-base font-semibold text-gray-700 dark:text-[var(--p7-text)]"
          >
            Senha <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400 dark:text-[var(--p7-text-3)]" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-xl border-2 border-blue-400 !bg-white pl-12 pr-12 text-lg !text-gray-800 placeholder:text-blue-300 transition-all focus:border-green-500 focus:ring-green-500 dark:border-[var(--p7-border)] dark:!bg-[var(--p7-card)] dark:!text-[var(--p7-text)] dark:placeholder:text-[var(--p7-text-3)] dark:focus:border-green-400 dark:focus:ring-green-400"
              placeholder="Crie uma senha segura"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-gray-600 dark:text-[var(--p7-text-3)] dark:hover:text-[var(--p7-text)]"
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
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-5 dark:border-[var(--p7-border)] dark:from-[var(--p7-surface-2)] dark:to-[var(--p7-card)]">
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-[var(--p7-text)]">
            Sua senha deve conter:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  validations.minLength ? 'bg-green-500' : 'bg-gray-200 dark:bg-[var(--p7-border)]'
                }`}
              >
                {validations.minLength ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : (
                  <X className="h-4 w-4 text-gray-400 dark:text-[var(--p7-text-3)]" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${validations.minLength ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-[var(--p7-text-2)]'}`}
              >
                Mínimo 8 caracteres
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  validations.hasUpper ? 'bg-green-500' : 'bg-gray-200 dark:bg-[var(--p7-border)]'
                }`}
              >
                {validations.hasUpper ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : (
                  <X className="h-4 w-4 text-gray-400 dark:text-[var(--p7-text-3)]" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${validations.hasUpper ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-[var(--p7-text-2)]'}`}
              >
                Pelo menos 1 letra maiúscula
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  validations.hasNumber ? 'bg-green-500' : 'bg-gray-200 dark:bg-[var(--p7-border)]'
                }`}
              >
                {validations.hasNumber ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : (
                  <X className="h-4 w-4 text-gray-400 dark:text-[var(--p7-text-3)]" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${validations.hasNumber ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-[var(--p7-text-2)]'}`}
              >
                Pelo menos 1 número
              </span>
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label
            htmlFor="confirmPassword"
            className="text-base font-semibold text-gray-700 dark:text-[var(--p7-text)]"
          >
            Confirmar Senha <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400 dark:text-[var(--p7-text-3)]" />
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-14 rounded-xl border-2 border-blue-400 !bg-white pl-12 pr-12 text-lg !text-gray-800 placeholder:text-blue-300 transition-all focus:border-green-500 focus:ring-green-500 dark:border-[var(--p7-border)] dark:!bg-[var(--p7-card)] dark:!text-[var(--p7-text)] dark:placeholder:text-[var(--p7-text-3)] dark:focus:border-green-400 dark:focus:ring-green-400"
              placeholder="Digite a senha novamente"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-gray-600 dark:text-[var(--p7-text-3)] dark:hover:text-[var(--p7-text)]"
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
            <p className="flex items-center gap-1 text-sm text-green-600 dark:text-green-300">
              <CheckCircle2 className="w-4 h-4" />
              Senhas coincidem!
            </p>
          )}
        </div>

        {/* Terms */}
        <div
          className={`flex items-start gap-4 p-5 border-2 rounded-2xl transition-all cursor-pointer ${
            acceptedTerms
              ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
              : 'border-gray-200 hover:border-gray-300 dark:border-[var(--p7-border)] dark:hover:border-[var(--v2-gold)]'
          }`}
          onClick={() => setAcceptedTerms((prev) => !prev)}
        >
          <input
            type="checkbox"
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-[var(--p7-border)] dark:bg-[var(--p7-card)]"
          />
          <label
            htmlFor="terms"
            className="cursor-pointer text-sm leading-relaxed dark:text-[var(--p7-text-2)]"
          >
            Li e aceito os{' '}
            <a
              href="/termos"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline dark:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              Termos de Uso
            </a>{' '}
            e{' '}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline dark:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              Política de Privacidade
            </a>
          </label>
        </div>
        {errors.terms && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-500" />
            {errors.terms}
          </p>
        )}

        {/* Info box */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5">
          <p className="text-sm text-green-800 flex items-start gap-2">
            <span className="text-xl">🚀</span>
            <span>
              Após finalizar, seu cadastro será ativado automaticamente e você poderá fazer login
              imediatamente!
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-[var(--p7-border)] sm:mt-10 sm:flex-row sm:justify-between sm:gap-3 sm:pt-6">
        <Button
          type="button"
          onClick={onBack}
          size="lg"
          disabled={isLoading}
          className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-8 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 order-2 sm:order-1"
        >
          <ArrowLeft className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          Voltar
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={!isPasswordValid || !acceptedTerms || isLoading}
          className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-10 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 order-1 sm:order-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              Finalizar Cadastro
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
