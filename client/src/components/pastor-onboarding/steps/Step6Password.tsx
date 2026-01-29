/**
 * Passo 6: Definir Senha
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Passo 6 de 6 - Criar Senha</h2>
        <p className="text-gray-600 mt-2">Defina uma senha segura para sua conta</p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base font-medium">
          Senha <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="pl-10 pr-10 h-12 text-lg"
            placeholder="Crie uma senha segura"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
      </div>

      {/* Password validations */}
      <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
        <p className="text-sm font-medium text-gray-700">Sua senha deve conter:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            {validations.minLength ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            <span className={validations.minLength ? 'text-green-700' : 'text-gray-600'}>
              Mínimo 8 caracteres
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {validations.hasUpper ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            <span className={validations.hasUpper ? 'text-green-700' : 'text-gray-600'}>
              Pelo menos 1 letra maiúscula
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {validations.hasNumber ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            <span className={validations.hasNumber ? 'text-green-700' : 'text-gray-600'}>
              Pelo menos 1 número
            </span>
          </div>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-base font-medium">
          Confirmar Senha <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="pl-10 pr-10 h-12 text-lg"
            placeholder="Digite a senha novamente"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
      </div>

      {/* Terms */}
      <div className="flex items-start gap-3 p-4 border rounded-lg">
        <Checkbox
          id="terms"
          checked={acceptedTerms}
          onCheckedChange={checked => setAcceptedTerms(checked as boolean)}
        />
        <Label htmlFor="terms" className="text-sm cursor-pointer">
          Li e aceito os{' '}
          <a href="/termos" target="_blank" className="text-blue-600 hover:underline">
            Termos de Uso
          </a>{' '}
          e{' '}
          <a href="/privacidade" target="_blank" className="text-blue-600 hover:underline">
            Política de Privacidade
          </a>
        </Label>
      </div>
      {errors.terms && <p className="text-sm text-red-500">{errors.terms}</p>}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 Seu cadastro será enviado para aprovação do administrador. Você receberá um email
          quando for aprovado.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-4 pt-6">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          size="lg"
          disabled={isLoading}
          className="min-w-[150px] text-lg h-12"
        >
          ← Voltar
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={!isPasswordValid || !acceptedTerms || isLoading}
          className="min-w-[150px] text-lg h-12 bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Enviando...
            </>
          ) : (
            <>✅ Finalizar Cadastro</>
          )}
        </Button>
      </div>
    </form>
  );
}
