/**
 * Passo 2: Criar Distrito
 */

import React, { useState } from 'react';
import { Building2, FileText } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Passo 2 de 6 - Seu Distrito</h2>
        <p className="text-gray-600 mt-2">Informe os dados do distrito que você pastoreia</p>
      </div>

      {/* District name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base font-medium">
          Nome do Distrito <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="pl-10 h-12 text-lg"
            placeholder="Ex: Distrito Central de São Paulo"
          />
        </div>
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">
          Descrição (opcional)
        </Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <Textarea
            id="description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="pl-10 min-h-[100px] text-base"
            placeholder="Informações adicionais sobre o distrito..."
          />
        </div>
        <p className="text-sm text-gray-500">
          Você pode descrever a região, número aproximado de membros, etc.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-4 pt-6">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          size="lg"
          className="min-w-[150px] text-lg h-12"
        >
          ← Voltar
        </Button>
        <Button type="submit" size="lg" className="min-w-[150px] text-lg h-12">
          Próximo Passo →
        </Button>
      </div>
    </form>
  );
}
