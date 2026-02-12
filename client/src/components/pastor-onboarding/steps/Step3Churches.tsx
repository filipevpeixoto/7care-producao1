/**
 * Passo 3: Cadastrar Igrejas
 * Design elegante e moderno
 */

import React, { useState } from 'react';
import {
  Church,
  MapPin,
  Plus,
  Trash2,
  Database,
  Building2,
  Users,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ChurchData } from '@/types/pastor-invite';

interface Step3ChurchesProps {
  data: ChurchData[];
  onNext: (data: ChurchData[]) => void;
  onBack: () => void;
}

export function Step3Churches({ data, onNext, onBack }: Step3ChurchesProps) {
  const [churches, setChurches] = useState<ChurchData[]>(
    data.length > 0 ? data : [{ name: '', address: '', isNew: true, type: 'igreja' }]
  );
  const [errors, setErrors] = useState<string>('');
  const [willImportFromPowerBI, setWillImportFromPowerBI] = useState(false);

  const addChurch = () => {
    setChurches([...churches, { name: '', address: '', isNew: true, type: 'igreja' }]);
  };

  const removeChurch = (index: number) => {
    if (churches.length > 1) {
      setChurches(churches.filter((_, i) => i !== index));
    }
  };

  const updateChurch = (index: number, field: 'name' | 'address' | 'type', value: string) => {
    const updated = [...churches];
    updated[index] = { ...updated[index], [field]: value };
    setChurches(updated);
  };

  const getDisplayName = (church: ChurchData) => {
    const suffix = church.type === 'igreja' ? '(i)' : '(g)';
    return church.name ? `${church.name} ${suffix}` : '';
  };

  const validateForm = () => {
    if (willImportFromPowerBI) {
      return true;
    }

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
      if (willImportFromPowerBI) {
        onNext([{ name: '__POWERBI_IMPORT__', address: '', isNew: false, type: 'igreja' }]);
      } else {
        onNext(churches);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
          <span className="text-xs sm:text-sm font-medium text-blue-700">Passo 3 de 6</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Suas Igrejas
        </h2>
        <p className="text-gray-500 mt-2 sm:mt-3 text-sm sm:text-base md:text-lg">
          Adicione as igrejas do seu distrito
        </p>
      </div>

      {errors && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {errors}
        </div>
      )}

      {/* Opção de importar do PowerBI */}
      <div
        className={`border-2 rounded-2xl p-5 cursor-pointer transition-all mb-6 ${
          willImportFromPowerBI
            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg'
            : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
        onClick={() => setWillImportFromPowerBI(!willImportFromPowerBI)}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
              willImportFromPowerBI
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 border-transparent'
                : 'border-gray-300'
            }`}
          >
            {willImportFromPowerBI && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">Irei importar a base de dados do PowerBI</p>
            <p className="text-sm text-blue-600">As igrejas serão cadastradas automaticamente</p>
          </div>
        </div>
      </div>

      {/* Lista de igrejas */}
      {!willImportFromPowerBI && (
        <>
          <div className="space-y-4 max-w-2xl mx-auto">
            {churches.map((church, index) => (
              <div
                key={index}
                className="border-2 border-blue-100 rounded-2xl p-5 bg-gradient-to-r from-blue-50/50 to-white relative shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <Church className="w-4 h-4 text-blue-600" />
                    </div>
                    {church.type === 'igreja' ? 'Igreja' : 'Grupo Organizado'} {index + 1}
                    {church.name && (
                      <span className="text-sm font-normal text-blue-600 ml-2 px-2 py-0.5 bg-blue-50 rounded-full">
                        → {getDisplayName(church)}
                      </span>
                    )}
                  </h3>
                  {churches.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChurch(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Seletor de Tipo */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block text-blue-800">Tipo</Label>
                    <div className="flex flex-col xs:flex-row gap-2">
                      <Button
                        type="button"
                        variant={church.type === 'igreja' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateChurch(index, 'type', 'igreja')}
                        className={`flex-1 h-10 xs:h-11 text-sm rounded-xl transition-all ${
                          church.type === 'igreja'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                            : '!border-blue-200 !bg-blue-50 !text-blue-700 hover:!border-blue-400 hover:!bg-blue-100'
                        }`}
                      >
                        <Building2 className="w-4 h-4 mr-1.5" />
                        Igreja
                      </Button>
                      <Button
                        type="button"
                        variant={church.type === 'grupo' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateChurch(index, 'type', 'grupo')}
                        className={`flex-1 h-10 xs:h-11 text-sm rounded-xl transition-all ${
                          church.type === 'grupo'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                            : '!border-blue-200 !bg-blue-50 !text-blue-700 hover:!border-blue-400 hover:!bg-blue-100'
                        }`}
                      >
                        <Users className="w-4 h-4 mr-1.5" />
                        Grupo Organizado
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor={`name-${index}`}
                      className="text-sm font-semibold text-blue-800"
                    >
                      Nome <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`name-${index}`}
                      value={church.name}
                      onChange={e => updateChurch(index, 'name', e.target.value)}
                      placeholder={
                        church.type === 'igreja'
                          ? 'Ex: Igreja Central'
                          : 'Ex: Grupo Jardim das Flores'
                      }
                      className="h-12 rounded-xl border-2 border-blue-400 !bg-white !text-gray-800 placeholder:text-blue-300 focus:border-blue-500 focus:ring-blue-500 mt-1"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`address-${index}`}
                      className="text-sm font-semibold text-blue-800"
                    >
                      Endereço
                    </Label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
                      <Input
                        id={`address-${index}`}
                        value={church.address}
                        onChange={e => updateChurch(index, 'address', e.target.value)}
                        placeholder="Rua, número, bairro"
                        className="pl-11 h-12 rounded-xl border-2 border-blue-400 !bg-white !text-gray-800 placeholder:text-blue-300 focus:border-blue-500 focus:ring-blue-500"
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
            className="w-full h-12 sm:h-14 text-base sm:text-lg border-dashed border-2 !border-blue-400 !bg-blue-50 !text-blue-700 hover:!border-blue-500 hover:!bg-blue-100 rounded-2xl mt-6 transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Nova Igreja ou Grupo
          </Button>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-5 mt-6">
            <p className="text-sm text-blue-800 flex items-start gap-2">
              <span className="text-xl">💡</span>
              <span>
                <strong>Dica:</strong> Você poderá importar os membros de cada igreja no próximo
                passo através de um arquivo Excel.
              </span>
            </p>
          </div>
        </>
      )}

      {/* Mensagem quando PowerBI está selecionado */}
      {willImportFromPowerBI && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-semibold text-green-800 text-lg mb-2">Importação do PowerBI</h3>
          <p className="text-sm text-green-700">
            Suas igrejas e grupos serão importados automaticamente da base de dados do PowerBI. Você
            não precisa cadastrá-los manualmente.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-gray-100">
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
