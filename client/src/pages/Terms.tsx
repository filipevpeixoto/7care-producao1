/**
 * Página de Termos de Uso
 */

import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Termos de Uso</h1>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="prose prose-blue max-w-none">
            <p className="text-sm text-gray-500 mb-6">Última atualização: Janeiro de 2026</p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              1. Aceitação dos Termos
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Ao acessar e usar o aplicativo 7Care, você concorda em cumprir e estar vinculado a
              estes Termos de Uso. Se você não concordar com algum aspecto destes termos, não deve
              usar nosso aplicativo.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              2. Descrição do Serviço
            </h2>
            <p className="text-gray-600 leading-relaxed">
              O 7Care é um sistema de gerenciamento para igrejas que permite o cadastro e
              acompanhamento de membros, gestão de pequenos grupos, comunicação interna, e outras
              funcionalidades relacionadas à administração eclesiástica.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Cadastro e Conta</h2>
            <p className="text-gray-600 leading-relaxed">
              Para utilizar o 7Care, você deve criar uma conta fornecendo informações precisas e
              atualizadas. Você é responsável por manter a confidencialidade de sua senha e por
              todas as atividades que ocorram em sua conta.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4. Uso Adequado</h2>
            <p className="text-gray-600 leading-relaxed">
              Você concorda em usar o 7Care apenas para fins legais e de acordo com estes termos.
              Você não deve usar o serviço para:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li>Violar quaisquer leis ou regulamentos aplicáveis</li>
              <li>Infringir os direitos de terceiros</li>
              <li>Transmitir conteúdo ilegal, ofensivo ou prejudicial</li>
              <li>Tentar acessar sistemas ou dados sem autorização</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              5. Propriedade Intelectual
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Todo o conteúdo do 7Care, incluindo textos, gráficos, logotipos, ícones e software, é
              propriedade do 7Care ou de seus licenciadores e está protegido por leis de propriedade
              intelectual.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              6. Limitação de Responsabilidade
            </h2>
            <p className="text-gray-600 leading-relaxed">
              O 7Care é fornecido "como está" e "conforme disponível". Não garantimos que o serviço
              será ininterrupto, seguro ou livre de erros. Em nenhum caso seremos responsáveis por
              danos indiretos, incidentais ou consequenciais.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              7. Modificações dos Termos
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Podemos modificar estes termos a qualquer momento. As alterações entrarão em vigor
              após a publicação dos termos atualizados no aplicativo. O uso continuado do serviço
              após as alterações constitui sua aceitação dos novos termos.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8. Lei Aplicável</h2>
            <p className="text-gray-600 leading-relaxed">
              Estes termos serão regidos e interpretados de acordo com as leis do Brasil. Qualquer
              disputa decorrente destes termos será submetida à jurisdição exclusiva dos tribunais
              brasileiros.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco através do
              suporte disponível no aplicativo.
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
