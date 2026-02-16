/**
 * Página de Termos de Uso
 */

import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Terms() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('terms.title')}</h1>
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
