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
import { DistrictData } from '@/types/pastor-invite';

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
    <form onSubmit={handleSubmit} className="p-8 md:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-4">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-700">Passo 2 de 6</span>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Seu Distrito
        </h2>
        <p className="text-gray-500 mt-3 text-lg">
          Informe os dados do distrito que você pastoreia
        </p>
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-10">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-lg">
          <Building2 className="w-12 h-12 text-blue-500" />
        </div>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        {/* District name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base font-semibold text-gray-700">
            Nome do Distrito <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="pl-12 h-14 text-lg rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition-all"
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
          <Label htmlFor="description" className="text-base font-semibold text-gray-700">
            Descrição <span className="text-gray-400 font-normal">(opcional)</span>
          </Label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="pl-12 min-h-[120px] text-base rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition-all resize-none"
              placeholder="Informações adicionais sobre o distrito..."
            />
          </div>
          <p className="text-sm text-gray-400">
            Você pode descrever a região, número aproximado de membros, etc.
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
          className="h-14 px-8 text-lg rounded-xl border-gray-200 hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Button
          type="submit"
          size="lg"
          className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
          Próximo Passo
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </form>
  );
}
