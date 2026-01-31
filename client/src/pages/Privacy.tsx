/**
 * Página de Política de Privacidade
 */

import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="prose prose-purple max-w-none">
            <p className="text-sm text-gray-500 mb-6">Última atualização: Janeiro de 2026</p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              1. Informações que Coletamos
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Coletamos informações que você nos fornece diretamente, incluindo:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li>Nome completo e dados de contato</li>
              <li>Informações de perfil (foto, data de nascimento)</li>
              <li>Dados de participação em atividades da igreja</li>
              <li>Informações de comunicação e interação no aplicativo</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              2. Como Usamos suas Informações
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos as informações coletadas para:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li>Fornecer e manter nossos serviços</li>
              <li>Personalizar sua experiência no aplicativo</li>
              <li>Comunicar atualizações e informações relevantes</li>
              <li>Melhorar e desenvolver novos recursos</li>
              <li>Garantir a segurança e prevenir fraudes</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              3. Compartilhamento de Informações
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Não vendemos suas informações pessoais. Podemos compartilhar dados com:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li>Líderes e administradores da sua igreja (conforme necessário para gestão)</li>
              <li>Provedores de serviços que nos auxiliam na operação do aplicativo</li>
              <li>Autoridades legais quando exigido por lei</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              4. Proteção de Dados (LGPD)
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes
              direitos:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li>Confirmar a existência de tratamento de dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados</li>
              <li>Solicitar a portabilidade dos dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              5. Segurança dos Dados
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas
              informações, incluindo criptografia, controle de acesso e monitoramento contínuo. No
              entanto, nenhum método de transmissão pela internet é 100% seguro.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6. Retenção de Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e
              cumprir obrigações legais. Você pode solicitar a exclusão de seus dados a qualquer
              momento, sujeito a requisitos legais de retenção.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              7. Cookies e Tecnologias Similares
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar a experiência do usuário,
              analisar o uso do aplicativo e personalizar conteúdo. Você pode gerenciar suas
              preferências de cookies nas configurações do navegador.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8. Menores de Idade</h2>
            <p className="text-gray-600 leading-relaxed">
              O 7Care não é destinado a menores de 13 anos. Não coletamos intencionalmente
              informações de crianças. Se você é pai ou responsável e acredita que seu filho nos
              forneceu dados, entre em contato conosco.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              9. Alterações nesta Política
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Podemos atualizar esta política periodicamente. Notificaremos sobre alterações
              significativas através do aplicativo ou por email. Recomendamos revisar esta política
              regularmente.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">10. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato
              através do suporte disponível no aplicativo ou pelo email de contato da sua igreja.
            </p>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <Button onClick={() => navigate(-1)} className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
