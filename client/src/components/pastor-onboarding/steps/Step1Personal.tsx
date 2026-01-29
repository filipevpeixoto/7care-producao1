/**
 * Passo 1: Dados Pessoais
 */

import React, { useState } from 'react';
import { User, Mail, Phone, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PersonalData } from '@/types/pastor-invite';

interface Step1PersonalProps {
  data: PersonalData;
  email: string;
  onNext: (data: PersonalData) => void;
}

export function Step1Personal({ data, email, onNext }: Step1PersonalProps) {
  const [formData, setFormData] = useState<PersonalData>({
    name: data.name || '',
    email: email,
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
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Passo 1 de 6 - Seus Dados</h2>
        <p className="text-gray-600 mt-2">Vamos começar com suas informações pessoais</p>
      </div>

      {/* Photo upload */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          {formData.photoUrl ? (
            <img
              src={formData.photoUrl}
              alt="Foto de perfil"
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          )}
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
            onClick={() => {
              // TODO: Implementar upload de foto
              alert('Upload de foto será implementado');
            }}
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base font-medium">
          Nome Completo <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="pl-10 h-12 text-lg"
            placeholder="Digite seu nome completo"
          />
        </div>
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Email (readonly) */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base font-medium">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            id="email"
            type="email"
            value={formData.email}
            readOnly
            className="pl-10 h-12 text-lg bg-gray-50 cursor-not-allowed"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔒
          </span>
        </div>
        <p className="text-sm text-gray-500">Este é o email do convite e não pode ser alterado</p>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-base font-medium">
          Telefone <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
            className="pl-10 h-12 text-lg"
            placeholder="(00) 00000-0000"
          />
        </div>
        {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
        <p className="text-sm text-gray-500">Formato: (00) 00000-0000</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-6">
        <Button type="submit" size="lg" className="min-w-[150px] text-lg h-12">
          Próximo Passo →
        </Button>
      </div>
    </form>
  );
}
