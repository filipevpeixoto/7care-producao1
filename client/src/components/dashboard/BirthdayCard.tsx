import React from 'react';
import { Cake, MessageCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BirthdayUser {
  id: number;
  name: string;
  phone?: string;
  birthDate: string;
  profilePhoto?: string;
  church?: string | null;
}

interface BirthdayCardProps {
  birthdaysToday: BirthdayUser[];
  birthdaysThisMonth: BirthdayUser[];
  isLoading?: boolean;
}

export const BirthdayCard = ({ birthdaysToday, birthdaysThisMonth, isLoading = false }: BirthdayCardProps) => {
  const formatDate = (dateString: string) => {
    try {
      if (!dateString || typeof dateString !== 'string') {
        return 'Data inválida';
      }

      // Para formato YYYY-MM-DD simples, extrai diretamente os componentes
      if (dateString.includes('-') && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        
        // Validação básica
        if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12) {
          return `${String(parsedDay).padStart(2, '0')}/${String(parsedMonth).padStart(2, '0')}`;
        }
      }

      // Para formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ), extrai apenas a parte da data
      if (dateString.includes('T') && dateString.includes('Z')) {
        const datePart = dateString.split('T')[0]; // Pega apenas YYYY-MM-DD
        const [year, month, day] = datePart.split('-');
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        
        // Validação básica
        if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12) {
          return `${String(parsedDay).padStart(2, '0')}/${String(parsedMonth).padStart(2, '0')}`;
        }
      }
      
      // Para outros formatos, usa a lógica anterior
      const date = new Date(dateString);
      
      // Se a data for inválida, tenta parsear manualmente
      if (isNaN(date.getTime())) {
        // Tenta parsear formato DD/MM/YYYY
        if (dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            const parsedDay = parseInt(day);
            const parsedMonth = parseInt(month);
            let parsedYear = parseInt(year);
            
            // Se o ano tem 2 dígitos, converte para 4 dígitos
            if (parsedYear < 100) {
              parsedYear += parsedYear < 50 ? 2000 : 1900;
            }
            
            // Validação básica
            if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12) {
              // Cria a data usando data local para evitar problemas de fuso horário
              const localDate = new Date(parsedYear, parsedMonth - 1, parsedDay);
              if (!isNaN(localDate.getTime())) {
                return localDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              }
            }
          }
        }
        
        return 'Data inválida';
      }
      
      // Para datas válidas, usa data local para evitar problemas de fuso horário
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return localDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch (error) {
      console.error('Erro ao formatar data:', error, 'Data:', dateString);
      return 'Data inválida';
    }
  };

  const formatDayName = (dateString: string) => {
    try {
      if (!dateString || typeof dateString !== 'string') {
        return 'Dia inválido';
      }

      const today = new Date();
      const currentYear = today.getFullYear();
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      
      // Para formato YYYY-MM-DD simples ou ISO com Z/T
      if (dateString.includes('-')) {
        const datePart = dateString.split('T')[0]; // Remove parte do horário se existir
        const [year, month, day] = datePart.split('-');
        // SEMPRE usar data local para evitar problemas de fuso horário
        const localDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        return dayNames[localDate.getDay()];
      }
      
      // Para formato DD/MM/YYYY ou DD/MM
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length >= 2) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          
          // Validação básica
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            const localDate = new Date(currentYear, month - 1, day);
            return dayNames[localDate.getDay()];
          }
        }
      }
      
      return 'Dia inválido';
    } catch (error) {
      console.error('Erro ao formatar nome do dia:', error, 'Data:', dateString);
      return 'Dia inválido';
    }
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    
    // Para datas ISO, extrai apenas a parte da data para evitar problemas de fuso horário
    let dateToProcess = dateString;
    if (dateString.includes('T') && dateString.includes('Z')) {
      const datePart = dateString.split('T')[0]; // Pega apenas YYYY-MM-DD
      dateToProcess = datePart;
    }
    
    const birthDate = new Date(dateToProcess);
    
    // Se a data for inválida, tenta parsear manualmente
    if (isNaN(birthDate.getTime())) {
      // Tenta parsear formato DD/MM/YYYY
      if (dateString && typeof dateString === 'string' && dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const [day, month] = parts;
          const parsedDay = parseInt(day);
          const parsedMonth = parseInt(month);
          
          // Compara usando data local para evitar problemas de fuso horário
          return today.getDate() === parsedDay && today.getMonth() === parsedMonth - 1;
        }
      }
      
      // Tenta parsear formato YYYY-MM-DD
      if (dateString && typeof dateString === 'string' && dateString.includes('-') && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        
        // Compara usando data local para evitar problemas de fuso horário
        return today.getDate() === parsedDay && today.getMonth() === parsedMonth - 1;
      }
      
      return false;
    }
    
    // Para datas válidas, compara usando data local para evitar problemas de fuso horário
    return today.getDate() === birthDate.getDate() && today.getMonth() === birthDate.getMonth();
  };

  const isValidWhatsAppNumber = (phone?: string) => {
    if (!phone) return false;
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Verifica se tem 10 ou 11 dígitos (com ou sem DDD)
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Olá! Feliz aniversário! 🎂 Que Deus abençoe seu dia!`;
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Filtrar aniversariantes de hoje apenas do mês corrente
  const todayInCurrentMonth = birthdaysToday.filter(user => {
    const birthDate = new Date(user.birthDate);
    const today = new Date();
    return birthDate.getMonth() === today.getMonth();
  });

  // Sort other birthdays chronologically (excluding today's)
  const otherBirthdays = birthdaysThisMonth
    .filter(user => !isToday(user.birthDate))
    .sort((a, b) => {
      // Evita problemas de fuso horário criando as datas de forma explícita
      const dateA = new Date(a.birthDate);
      const dateB = new Date(b.birthDate);
      
      // Se as datas forem inválidas, tenta parsear manualmente
      let dayA = 0, dayB = 0;
      
      if (!isNaN(dateA.getTime())) {
        dayA = dateA.getDate();
      } else if (a.birthDate && typeof a.birthDate === 'string' && a.birthDate.includes('/')) {
        const parts = a.birthDate.split('/');
        if (parts.length === 3) {
          dayA = parseInt(parts[0]);
        }
      } else if (a.birthDate && typeof a.birthDate === 'string' && a.birthDate.includes('-') && a.birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = a.birthDate.split('-');
        dayA = parseInt(parts[2]);
      }
      
      if (!isNaN(dateB.getTime())) {
        dayB = dateB.getDate();
      } else if (b.birthDate && typeof b.birthDate === 'string' && b.birthDate.includes('/')) {
        const parts = b.birthDate.split('/');
        if (parts.length === 3) {
          dayB = parseInt(parts[0]);
        }
      } else if (b.birthDate && typeof b.birthDate === 'string' && b.birthDate.includes('-') && b.birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = b.birthDate.split('-');
        dayB = parseInt(parts[2]);
      }
      
      return dayA - dayB;
    });

  if (isLoading) {
    return (
      <Card className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-rose-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600/20 to-rose-800/30 opacity-100 group-hover:from-rose-600/30 group-hover:to-rose-800/40 transition-all duration-300"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-400/30 to-rose-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6 relative z-10">
          <CardTitle className="text-xs lg:text-sm font-semibold text-white drop-shadow-md flex items-center gap-1 lg:gap-2">
            <Cake className="h-3 w-3 lg:h-4 lg:w-4" />
            Aniversariantes do mês
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0 relative z-10">
          <div className="animate-pulse">
            <div className="h-2 lg:h-4 bg-white/20 rounded w-3/4 mb-1 lg:mb-2"></div>
            <div className="h-2 lg:h-4 bg-white/20 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBirthdays = todayInCurrentMonth.length + otherBirthdays.length;

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-rose-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-600/20 to-rose-800/30 opacity-100 group-hover:from-rose-600/30 group-hover:to-rose-800/40 transition-all duration-300"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-400/30 to-rose-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6 relative z-10">
        <CardTitle className="text-xs lg:text-sm font-semibold text-white drop-shadow-md flex items-center gap-1 lg:gap-2">
          <Cake className="h-3 w-3 lg:h-4 lg:w-4" />
          Aniversariantes do mês
        </CardTitle>
        <div className="flex items-center gap-1 lg:gap-2">
          {todayInCurrentMonth.length > 0 && (
            <Badge variant="destructive" className="text-[10px] lg:text-xs bg-red-500/80 text-white border-0">
              {todayInCurrentMonth.length} hoje
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] lg:text-xs bg-white/20 text-white border-white/30">
            {totalBirthdays} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0 relative z-10">
        {totalBirthdays === 0 ? (
          <div className="text-center py-2 lg:py-8">
            <Cake className="h-6 w-6 lg:h-12 lg:w-12 text-white/60 mx-auto mb-1 lg:mb-3" />
            <p className="text-[10px] lg:text-sm text-white/70">
              Nenhum aniversariante este mês
            </p>
          </div>
        ) : (
          <>
            {/* Layout compacto para mobile */}
            <div className="lg:hidden">
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-2">
                  {/* Aniversariantes de hoje - em destaque */}
                  {todayInCurrentMonth.length > 0 && (
                    <>
                      <div className="mb-2">
                        <h4 className="text-xs font-semibold text-white/90 mb-1 flex items-center gap-1">
                          <Cake className="h-3 w-3" />
                          Aniversariantes de Hoje
                        </h4>
                        <div className="space-y-1">
                          {todayInCurrentMonth.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.profilePhoto} />
                                  <AvatarFallback className="text-xs font-medium bg-white/20 text-white">
                                    {user.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate text-white">{user.name}</p>
                                  <div className="flex items-center gap-1 text-[10px] text-white/70">
                                    <Calendar className="h-2 w-2" />
                                    <span>{formatDate(user.birthDate)}</span>
                                    <span>•</span>
                                    <span>{formatDayName(user.birthDate)}</span>
                                    {user.church && (
                                      <>
                                        <span>•</span>
                                        <span className="text-white/50 truncate">{user.church}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="destructive" className="text-[10px] px-1 py-0 bg-red-500/80 text-white border-0">
                                  Hoje!
                                </Badge>
                                {isValidWhatsAppNumber(user.phone) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-white hover:text-white hover:bg-white/20"
                                    onClick={() => openWhatsApp(user.phone!)}
                                    title="Enviar mensagem no WhatsApp"
                                  >
                                    <MessageCircle className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Separador */}
                      {otherBirthdays.length > 0 && (
                        <div className="border-t border-white/30 my-2"></div>
                      )}
                    </>
                  )}

                  {/* Outros aniversariantes do mês */}
                  {otherBirthdays.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-white/80 mb-1">
                        Outros aniversariantes do mês
                      </h4>
                      <div className="space-y-1">
                        {otherBirthdays.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.profilePhoto} />
                                <AvatarFallback className="text-xs font-medium bg-white/20 text-white">
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate text-white/90">{user.name}</p>
                                <div className="flex items-center gap-1 text-[10px] text-white/60">
                                  <Calendar className="h-2 w-2" />
                                  <span>{formatDate(user.birthDate)}</span>
                                  <span>•</span>
                                  <span>{formatDayName(user.birthDate)}</span>
                                  {user.church && (
                                    <>
                                      <span>•</span>
                                        <span className="text-white/50 truncate">{user.church}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isValidWhatsAppNumber(user.phone) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-white hover:text-white hover:bg-white/20"
                                onClick={() => openWhatsApp(user.phone!)}
                                title="Enviar mensagem no WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Layout completo para desktop */}
            <div className="hidden lg:block">
              <ScrollArea className="h-96">
                <div className="space-y-3 pr-4">
                  {/* Aniversariantes de hoje - em destaque */}
                  {todayInCurrentMonth.length > 0 && (
                    <>
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
                          <Cake className="h-4 w-4" />
                          Aniversariantes de Hoje
                        </h4>
                        <div className="space-y-2">
                          {todayInCurrentMonth.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 shadow-sm"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={user.profilePhoto} />
                                  <AvatarFallback className="text-sm font-medium bg-white/20 text-white">
                                    {user.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                                    <Badge variant="destructive" className="text-xs px-2 py-0 bg-red-500/80 text-white border-0">
                                      Hoje!
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-white/70">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(user.birthDate)}</span>
                                    <span>•</span>
                                    <span>{formatDayName(user.birthDate)}</span>
                                    {user.church && (
                                      <>
                                        <span>•</span>
                                        <span className="text-white/50">{user.church}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isValidWhatsAppNumber(user.phone) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/20"
                                  onClick={() => openWhatsApp(user.phone!)}
                                  title="Enviar mensagem no WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Separador */}
                      {otherBirthdays.length > 0 && (
                        <div className="border-t border-white/30 my-4"></div>
                      )}
                    </>
                  )}

                  {/* Outros aniversariantes do mês */}
                  {otherBirthdays.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white/80 mb-2">
                        Outros aniversariantes do mês
                      </h4>
                      <div className="space-y-2">
                        {otherBirthdays.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.profilePhoto} />
                                <AvatarFallback className="text-sm font-medium bg-white/20 text-white">
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium truncate text-white/90">{user.name}</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(user.birthDate)}</span>
                                  <span>•</span>
                                  <span>{formatDayName(user.birthDate)}</span>
                                  {user.church && (
                                    <>
                                      <span>•</span>
                                        <span className="text-white/50">{user.church}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isValidWhatsAppNumber(user.phone) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/20"
                                onClick={() => openWhatsApp(user.phone!)}
                                title="Enviar mensagem no WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 