/**
 * Passo 1: Dados Pessoais
 * Design elegante e moderno
 */

import React, { useState } from 'react';
import { User, Mail, Phone, Upload, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type PersonalData } from '@/types/pastor-invite';

interface Step1PersonalProps {
  data: PersonalData;
  email: string;
  onNext: (data: PersonalData) => void;
}

export function Step1Personal({ data, email, onNext }: Step1PersonalProps) {
  const [formData, setFormData] = useState<PersonalData>({
    name: data.name || '',
    email,
    phone: data.phone || '',
    photoUrl: data.photoUrl,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (!/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/.test(formData.phone)) {
      newErrors.phone = 'Formato inválido. Use: (00) 00000-0000';
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

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2');
    }
    return value.slice(0, 15);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
          <span className="text-xs sm:text-sm font-medium text-blue-700">Passo 1 de 6</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Seus Dados Pessoais
        </h2>
        <p className="text-gray-500 mt-2 sm:mt-3 text-sm sm:text-base md:text-lg">
          Vamos começar com suas informações básicas
        </p>
      </div>

      {/* Photo upload */}
      <div className="flex justify-center mb-6 sm:mb-10">
        <div className="relative group">
          {formData.photoUrl ? (
            <img
              src={formData.photoUrl}
              alt="Foto de perfil"
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-blue-100 shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center ring-4 ring-blue-50 shadow-lg">
              <User className="w-10 h-10 sm:w-14 sm:h-14 text-blue-400" />
            </div>
          )}
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-2 sm:p-3 rounded-full hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            onClick={() => alert('Upload de foto será implementado')}
          >
            <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base font-semibold text-gray-700">
            Nome Completo <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="pl-12 h-14 text-lg rounded-xl border-2 border-blue-400 !bg-white !text-gray-800 placeholder:text-blue-300 focus:border-blue-500 focus:ring-blue-500 transition-all"
              placeholder="Digite seu nome completo"
            />
          </div>
          {errors.name && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Email (readonly) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold text-gray-700">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              readOnly
              className="pl-12 pr-12 h-14 text-lg rounded-xl !bg-white/90 border-2 border-blue-300 cursor-not-allowed !text-gray-600"
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
              🔒
            </span>
          </div>
          <p className="text-sm text-gray-400">Este é o email do convite e não pode ser alterado</p>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-semibold text-gray-700">
            Telefone <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
              className="pl-12 h-14 text-lg rounded-xl border-2 border-blue-400 !bg-white !text-gray-800 placeholder:text-blue-300 focus:border-blue-500 focus:ring-blue-500 transition-all"
              placeholder="(00) 00000-0000"
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-gray-100">
        <Button
          type="submit"
          size="lg"
          className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-8 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 w-full sm:w-auto"
        >
          Próximo Passo
          <ArrowRight className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
        </Button>
      </div>
    </form>
  );
}
