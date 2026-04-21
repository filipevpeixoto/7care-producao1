/**
 * Passo 2: Criar Distrito
 * Design elegante e moderno
 */

import React, { useState } from 'react';
import { Building2, FileText, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type DistrictData } from '@/types/pastor-invite';

interface Step2DistrictProps {
  data: DistrictData;
  onNext: (data: DistrictData) => void;
  onBack: () => void;
}

export function Step2District({ data, onNext, onBack }: Step2DistrictProps) {
  const [formData, setFormData] = useState<DistrictData>({
    name: data.name || '',
    associationId: data.associationId,
    description: data.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do distrito é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
          <span className="text-xs sm:text-sm font-medium text-blue-700">Passo 2 de 6</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:bg-none dark:text-[var(--p7-text)]">
          Seu Distrito
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-[var(--p7-text-2)] sm:mt-3 sm:text-base md:text-lg">
          Informe os dados do distrito que você pastoreia
        </p>
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-6 sm:mb-10">
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-lg">
          <Building2 className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500" />
        </div>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        {/* District name */}
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-base font-semibold text-gray-700 dark:text-[var(--p7-text)]"
          >
            Nome do Distrito <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400 dark:text-[var(--p7-text-3)]" />
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-14 rounded-xl border-2 border-blue-400 !bg-white pl-12 text-lg !text-gray-800 placeholder:text-blue-300 transition-all focus:border-blue-500 focus:ring-blue-500 dark:border-[var(--p7-border)] dark:!bg-[var(--p7-card)] dark:!text-[var(--p7-text)] dark:placeholder:text-[var(--p7-text-3)] dark:focus:border-[var(--v2-gold)] dark:focus:ring-[var(--v2-gold)]"
              placeholder="Ex: Distrito Central de São Paulo"
            />
          </div>
          {errors.name && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label
            htmlFor="description"
            className="text-base font-semibold text-gray-700 dark:text-[var(--p7-text)]"
          >
            Descrição{' '}
            <span className="font-normal text-gray-400 dark:text-[var(--p7-text-3)]">
              (opcional)
            </span>
          </Label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 h-5 w-5 text-gray-400 dark:text-[var(--p7-text-3)]" />
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[120px] resize-none rounded-xl border-2 border-blue-400 !bg-white pl-12 text-base !text-gray-800 placeholder:text-blue-300 transition-all focus:border-blue-500 focus:ring-blue-500 dark:border-[var(--p7-border)] dark:!bg-[var(--p7-card)] dark:!text-[var(--p7-text)] dark:placeholder:text-[var(--p7-text-3)] dark:focus:border-[var(--v2-gold)] dark:focus:ring-[var(--v2-gold)]"
              placeholder="Informações adicionais sobre o distrito..."
            />
          </div>
          <p className="text-sm text-gray-400 dark:text-[var(--p7-text-3)]">
            Você pode descrever a região, número aproximado de membros, etc.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-[var(--p7-border)] sm:mt-10 sm:flex-row sm:justify-between sm:gap-3 sm:pt-6">
        <Button
          type="button"
          onClick={onBack}
          size="lg"
          className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-8 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 order-2 sm:order-1"
        >
          <ArrowLeft className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          Voltar
        </Button>
        <Button
          type="submit"
          size="lg"
          className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-8 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 order-1 sm:order-2"
        >
          Próximo Passo
          <ArrowRight className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
        </Button>
      </div>
    </form>
  );
}
