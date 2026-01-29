/**
 * Passo 3: Cadastrar Igrejas
 */

import React, { useState } from 'react';
import { Church, MapPin, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChurchData } from '@/types/pastor-invite';

interface Step3ChurchesProps {
  data: ChurchData[];
  onNext: (data: ChurchData[]) => void;
  onBack: () => void;
}

export function Step3Churches({ data, onNext, onBack }: Step3ChurchesProps) {
  const [churches, setChurches] = useState<ChurchData[]>(
    data.length > 0 ? data : [{ name: '', address: '', isNew: true }]
  );
  const [errors, setErrors] = useState<string>('');

  const addChurch = () => {
    setChurches([...churches, { name: '', address: '', isNew: true }]);
  };

  const removeChurch = (index: number) => {
    if (churches.length > 1) {
      setChurches(churches.filter((_, i) => i !== index));
    }
  };

  const updateChurch = (index: number, field: 'name' | 'address', value: string) => {
    const updated = [...churches];
    updated[index] = { ...updated[index], [field]: value };
    setChurches(updated);
  };

  const validateForm = () => {
    const hasEmpty = churches.some(c => !c.name.trim());
    if (hasEmpty) {
      setErrors('Todas as igrejas devem ter um nome');
      return false;
    }
    setErrors('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext(churches);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Passo 3 de 6 - Suas Igrejas</h2>
        <p className="text-gray-600 mt-2">Adicione as igrejas do seu distrito</p>
      </div>

      {errors && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors}
        </div>
      )}

      <div className="space-y-4">
        {churches.map((church, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gray-50 relative">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Church className="w-5 h-5" />
                Igreja {index + 1}
              </h3>
              {churches.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChurch(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor={`name-${index}`} className="text-sm">
                  Nome da Igreja <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`name-${index}`}
                  value={church.name}
                  onChange={e => updateChurch(index, 'name', e.target.value)}
                  placeholder="Ex: Igreja Central"
                  className="h-10"
                />
              </div>

              <div>
                <Label htmlFor={`address-${index}`} className="text-sm">
                  Endereço
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id={`address-${index}`}
                    value={church.address}
                    onChange={e => updateChurch(index, 'address', e.target.value)}
                    placeholder="Rua, número, bairro"
                    className="pl-9 h-10"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        onClick={addChurch}
        variant="outline"
        className="w-full h-12 text-lg border-dashed"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar Nova Igreja
      </Button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Dica:</strong> Você poderá importar os membros de cada igreja no próximo passo
          através de um arquivo Excel.
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
