/**
 * Página de Política de Privacidade
 */

import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Privacy() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
