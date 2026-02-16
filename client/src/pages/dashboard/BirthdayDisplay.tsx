/**
 * @fileoverview Componente para exibir aniversariante do dia ou próximo aniversário
 * Extraído do Dashboard para manter SRP
 */

import React from 'react';
import type { BirthdayUser } from '@/types/domain';

interface BirthdayDisplayProps {
  birthdays: { today?: BirthdayUser[]; all?: BirthdayUser[] };
  isLoading: boolean;
  getNextBirthday: ((birthdays: { today?: BirthdayUser[]; all?: BirthdayUser[] }) => { name: string; nextBirthday: Date } | null);
  formatBirthdayDate: (date: Date) => string;
}

/**
 * Componente auxiliar para exibir aniversariante do dia ou próximo aniversário
 */
export const BirthdayDisplay: React.FC<BirthdayDisplayProps> = ({
  birthdays,
  isLoading,
  getNextBirthday,
  formatBirthdayDate,
}) => {
  if (isLoading) {
    return <p className="text-xs text-gray-500">Carregando...</p>;
  }

  if (birthdays.today && birthdays.today.length > 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-pink-100/60 bg-gradient-to-br from-white to-pink-50/40 p-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10 text-pink-700">
          <span className="text-lg">🎂</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-pink-700/70">
            Aniversariante do dia
          </div>
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {birthdays.today[0].name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-500">Hoje</div>
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">🎉</div>
        </div>
      </div>
    );
  }

  const nextBirthday = getNextBirthday(birthdays);
  if (nextBirthday) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-pink-100/60 bg-gradient-to-br from-white to-pink-50/40 p-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10 text-pink-700">
          <span className="text-lg">🎂</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-pink-700/70">
            Próximo aniversário
          </div>
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {nextBirthday.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-500">Data</div>
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {formatBirthdayDate(nextBirthday.nextBirthday)}
          </div>
        </div>
      </div>
    );
  }

  return <p className="text-xs text-gray-500">Sem aniversários próximos</p>;
};
