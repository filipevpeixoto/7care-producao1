import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cake } from 'lucide-react';
import { monthNames } from './monthlyCalendarUtils';
import type { BirthdayUser } from './calendar-types';

interface MonthBirthdaysCardProps {
  currentDate: Date;
  birthdaysLoading: boolean;
  allBirthdays: BirthdayUser[];
}

export const MonthBirthdaysCard = memo(({
  currentDate,
  birthdaysLoading,
  allBirthdays,
}: MonthBirthdaysCardProps) => {
  const currentMonthBirthdays = (allBirthdays || []).filter(birthday => {
    if (!birthday.birthDate) return false;
    const [_year, month] = birthday.birthDate.split('-');
    const birthMonth = parseInt(month) - 1;
    // CORRIGIDO: Usar UTC para evitar problemas de fuso horário
    return birthMonth === currentDate.getUTCMonth();
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-green-800">
          <Cake className="h-4 w-4 text-green-600" />
          Aniversariantes de {monthNames[currentDate.getMonth()]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {birthdaysLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Carregando aniversariantes...
          </div>
        ) : currentMonthBirthdays.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Nenhum aniversariante em {monthNames[currentDate.getMonth()]}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentMonthBirthdays.map(birthday => {
              const birthDate = birthday.birthDate;
              let day = '';
              let month = '';

              // Parse da data usando data local para evitar problemas de fuso horário
              if (birthDate.includes('-')) {
                const [_year, monthStr, dayStr] = birthDate.split('-');
                day = dayStr;
                month = monthStr;
              } else if (birthDate.includes('/')) {
                const [dayStr, monthStr, _year] = birthDate.split('/');
                day = dayStr;
                month = monthStr;
              }

              return (
                <div
                  key={birthday.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-200"
                  data-testid={`birthday-card-${birthday.id}`}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{day}</div>
                    <div className="text-xs text-green-500">
                      {monthNames[parseInt(month) - 1]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{birthday.name}</div>
                    {birthday.church && (
                      <div className="text-xs text-muted-foreground truncate">
                        {birthday.church}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
