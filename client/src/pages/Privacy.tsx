import { ArrowLeft, Database, Eye, Shield, UserRoundCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { PublicPageV2 } from '@/components/layout/v2/PublicPageV2';
import { LegalDocumentV2 } from '@/components/legal/LegalDocumentV2';

export default function Privacy() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { skin } = useTheme();
  const title = t('privacy.title');
  const subtitle = t('legalV2.privacy.subtitle', {
    defaultValue: 'Como protegemos dados, acessos e informações sensíveis.',
  });
  const badge = t('legalV2.privacy.badge', { defaultValue: 'Privacidade' });
  const kicker = t('legalV2.guidedReading', { defaultValue: 'Leitura guiada' });
  const intro = t('legalV2.privacy.intro', {
    defaultValue:
      'Este resumo mostra como o 7care coleta, protege e usa informações para apoiar o cuidado pastoral com segurança, clareza e responsabilidade.',
  });
  const sections = [
    {
      id: 'dados-coletados',
      title: t('privacy.section1Title'),
      content: t('privacy.section1Content'),
      items: [
        t('privacy.section1Item1'),
        t('privacy.section1Item2'),
        t('privacy.section1Item3'),
        t('privacy.section1Item4'),
      ],
    },
    {
      id: 'uso-dos-dados',
      title: t('privacy.section2Title'),
      content: t('privacy.section2Content'),
      items: [
        t('privacy.section2Item1'),
        t('privacy.section2Item2'),
        t('privacy.section2Item3'),
        t('privacy.section2Item4'),
        t('privacy.section2Item5'),
      ],
    },
    {
      id: 'compartilhamento',
      title: t('privacy.section3Title'),
      content: t('privacy.section3Content'),
      items: [t('privacy.section3Item1'), t('privacy.section3Item2'), t('privacy.section3Item3')],
    },
    {
      id: 'seguranca',
      title: t('privacy.section4Title'),
      content: t('privacy.section4Content'),
      items: [
        t('privacy.section4Item1'),
        t('privacy.section4Item2'),
        t('privacy.section4Item3'),
        t('privacy.section4Item4'),
        t('privacy.section4Item5'),
        t('privacy.section4Item6'),
      ],
    },
    { id: 'retencao', title: t('privacy.section5Title'), content: t('privacy.section5Content') },
    { id: 'direitos', title: t('privacy.section6Title'), content: t('privacy.section6Content') },
    { id: 'cookies', title: t('privacy.section7Title'), content: t('privacy.section7Content') },
    { id: 'menores', title: t('privacy.section8Title'), content: t('privacy.section8Content') },
    { id: 'mudancas', title: t('privacy.section9Title'), content: t('privacy.section9Content') },
    { id: 'contato', title: t('privacy.section10Title'), content: t('privacy.section10Content') },
  ];
  const summaryItems = [
    {
      icon: Database,
      label: t('legalV2.privacy.summaryDataLabel', {
        defaultValue: 'Quais dados podem ser coletados e por quanto tempo são mantidos.',
      }),
      value: t('legalV2.privacy.summaryDataValue', { defaultValue: 'Coleta e retenção' }),
    },
    {
      icon: Eye,
      label: t('legalV2.privacy.summaryUsageLabel', {
        defaultValue: 'Como as informações ajudam no cuidado pastoral e na operação.',
      }),
      value: t('legalV2.privacy.summaryUsageValue', { defaultValue: 'Uso com contexto' }),
    },
    {
      icon: UserRoundCheck,
      label: t('legalV2.privacy.summaryRightsLabel', {
        defaultValue: 'Direitos do usuário, visibilidade e canais para solicitar mudanças.',
      }),
      value: t('legalV2.privacy.summaryRightsValue', { defaultValue: 'Controle do titular' }),
    },
  ];

  if (skin === 'v2') {
    return (
      <PublicPageV2 title={title} subtitle={subtitle} icon={Shield} backLabel={t('common.back')}>
        <LegalDocumentV2
          badge={badge}
          kicker={kicker}
          updatedLabel={t('privacy.lastUpdated')}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-950">
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
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('privacy.title')}
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
          <div className="prose prose-purple max-w-none">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('privacy.lastUpdated')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section1Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section1Content')}
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mt-2">
              <li>{t('privacy.section1Item1')}</li>
              <li>{t('privacy.section1Item2')}</li>
              <li>{t('privacy.section1Item3')}</li>
              <li>{t('privacy.section1Item4')}</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section2Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section2Content')}
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mt-2">
              <li>{t('privacy.section2Item1')}</li>
              <li>{t('privacy.section2Item2')}</li>
              <li>{t('privacy.section2Item3')}</li>
              <li>{t('privacy.section2Item4')}</li>
              <li>{t('privacy.section2Item5')}</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section3Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section3Content')}
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mt-2">
              <li>{t('privacy.section3Item1')}</li>
              <li>{t('privacy.section3Item2')}</li>
              <li>{t('privacy.section3Item3')}</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section4Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section4Content')}
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mt-2">
              <li>{t('privacy.section4Item1')}</li>
              <li>{t('privacy.section4Item2')}</li>
              <li>{t('privacy.section4Item3')}</li>
              <li>{t('privacy.section4Item4')}</li>
              <li>{t('privacy.section4Item5')}</li>
              <li>{t('privacy.section4Item6')}</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section5Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section5Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section6Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section6Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section7Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section7Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section8Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section8Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section9Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section9Content')}
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {t('privacy.section10Title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.section10Content')}
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
