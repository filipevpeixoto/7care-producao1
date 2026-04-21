import { ArrowLeft, FileText, Lock, Scale, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { PublicPageV2 } from '@/components/layout/v2/PublicPageV2';
import { LegalDocumentV2 } from '@/components/legal/LegalDocumentV2';

export default function Terms() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { skin } = useTheme();
  const title = t('terms.title');
  const subtitle = t('legalV2.terms.subtitle', {
    defaultValue: 'Transparência, responsabilidade e uso seguro da plataforma.',
  });
  const badge = t('legalV2.terms.badge', { defaultValue: 'Termos' });
  const kicker = t('legalV2.guidedReading', { defaultValue: 'Leitura guiada' });
  const intro = t('legalV2.terms.intro', {
    defaultValue:
      'Estes termos organizam o uso do 7care de forma clara para quem administra, acompanha e cuida da vida da igreja no dia a dia.',
  });
  const sections = [
    { id: 'aceitacao', title: t('terms.section1Title'), content: t('terms.section1Content') },
    { id: 'descricao', title: t('terms.section2Title'), content: t('terms.section2Content') },
    { id: 'cadastro', title: t('terms.section3Title'), content: t('terms.section3Content') },
    {
      id: 'uso-adequado',
      title: t('terms.section4Title'),
      content: t('terms.section4Content'),
      items: [
        t('terms.section4Item1'),
        t('terms.section4Item2'),
        t('terms.section4Item3'),
        t('terms.section4Item4'),
      ],
    },
    { id: 'propriedade', title: t('terms.section5Title'), content: t('terms.section5Content') },
    {
      id: 'responsabilidade',
      title: t('terms.section6Title'),
      content: t('terms.section6Content'),
    },
    { id: 'alteracoes', title: t('terms.section7Title'), content: t('terms.section7Content') },
    { id: 'legislacao', title: t('terms.section8Title'), content: t('terms.section8Content') },
    { id: 'contato', title: t('terms.section9Title'), content: t('terms.section9Content') },
  ];
  const summaryItems = [
    {
      icon: Scale,
      label: t('legalV2.terms.summaryUseLabel', {
        defaultValue: 'Regras de uso, responsabilidades e limites da plataforma.',
      }),
      value: t('legalV2.terms.summaryUseValue', { defaultValue: 'Uso responsável' }),
    },
    {
      icon: ShieldCheck,
      label: t('legalV2.terms.summarySafetyLabel', {
        defaultValue: 'Compromissos que ajudam a proteger a operação e a comunidade.',
      }),
      value: t('legalV2.terms.summarySafetyValue', { defaultValue: 'Proteção da rotina' }),
    },
    {
      icon: Lock,
      label: t('legalV2.terms.summaryLegalLabel', {
        defaultValue: 'Atualizações, governança e respaldo jurídico do serviço.',
      }),
      value: t('legalV2.terms.summaryLegalValue', { defaultValue: 'Transparência legal' }),
    },
  ];

  if (skin === 'v2') {
    return (
      <PublicPageV2 title={title} subtitle={subtitle} icon={FileText} backLabel={t('common.back')}>
        <LegalDocumentV2
          badge={badge}
          kicker={kicker}
          updatedLabel={t('terms.lastUpdated')}
          intro={intro}
          summaryItems={summaryItems}
          sections={sections}
          backLabel={t('common.back')}
          onBack={() => navigate(-1)}
        />
      </PublicPageV2>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('terms.title')}
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
          <div className="prose prose-blue max-w-none">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('terms.lastUpdated')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section1Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section1Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section2Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section2Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section3Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section3Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section4Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section4Content')}
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mt-2">
              <li>{t('terms.section4Item1')}</li>
              <li>{t('terms.section4Item2')}</li>
              <li>{t('terms.section4Item3')}</li>
              <li>{t('terms.section4Item4')}</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section5Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section5Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section6Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section6Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section7Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section7Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section8Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section8Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('terms.section9Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.section9Content')}
            </p>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={() => navigate(-1)} className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
