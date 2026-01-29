import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, RefreshCw } from 'lucide-react';

interface VisitometerProps {
  visitsCompleted: number;
  visitsExpected: number;
  totalVisits?: number;
  visitedPeople?: number;
  percentage?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const Visitometer = ({
  visitsCompleted,
  visitsExpected,
  totalVisits = 0,
  visitedPeople = 0,
  percentage: apiPercentage = 0,
  isLoading = false,
  onRefresh,
}: VisitometerProps) => {
  // Usar o percentage da API ou calcular localmente
  const percentage =
    apiPercentage ||
    (visitsExpected > 0 ? Math.round((visitsCompleted / visitsExpected) * 100) : 0);

  // Log para debug
  console.log('📊 Visitômetro atualizado:', {
    visitsCompleted,
    visitsExpected,
    totalVisits,
    visitedPeople,
    percentage,
  });

  // Criar o SVG do velocímetro
  const radius = 60;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Para mobile, usar valores proporcionais
  const mobileRadius = 15;
  const mobileCircumference = 2 * Math.PI * mobileRadius;
  const mobileStrokeDasharray = mobileCircumference;
  const mobileStrokeDashoffset = mobileCircumference - (percentage / 100) * mobileCircumference;

  if (isLoading) {
    return (
      <Card className="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-teal-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-teal-800/30 opacity-100 group-hover:from-teal-600/30 group-hover:to-teal-800/40 transition-all duration-300"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-400/30 to-teal-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6 relative z-10">
          <CardTitle className="text-xs lg:text-sm font-semibold text-white drop-shadow-md flex items-center gap-1 lg:gap-2">
            <Users className="h-3 w-3 lg:h-4 lg:w-4" />
            Visitômetro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0 relative z-10">
          <div className="animate-pulse">
            <div className="h-8 lg:h-32 bg-white/20 rounded-full mb-2 lg:mb-4"></div>
            <div className="h-2 lg:h-4 bg-white/20 rounded w-3/4 mb-1 lg:mb-2"></div>
            <div className="h-2 lg:h-4 bg-white/20 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-teal-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-teal-800/30 opacity-100 group-hover:from-teal-600/30 group-hover:to-teal-800/40 transition-all duration-300"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-400/30 to-teal-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6 relative z-10">
        <CardTitle className="text-xs lg:text-sm font-semibold text-white drop-shadow-md flex items-center gap-1 lg:gap-2">
          <Users className="h-3 w-3 lg:h-4 lg:w-4" />
          Visitômetro
        </CardTitle>
        <div className="flex items-center gap-1 lg:gap-2">
          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              className="h-5 w-5 lg:h-6 lg:w-6 p-0 text-white hover:bg-white/20"
              title="Atualizar visitômetro"
            >
              <RefreshCw className="h-2 w-2 lg:h-3 lg:w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="h-auto lg:h-96 flex flex-col justify-center p-3 lg:p-6 pt-0 lg:pt-0 relative z-10">
        {/* Layout compacto para mobile */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between">
            {/* Velocímetro pequeno */}
            <div className="relative w-10 h-10">
              <svg width="100%" height="100%" className="transform -rotate-90" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={mobileStrokeDasharray}
                  strokeDashoffset={mobileStrokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease-in-out',
                  }}
                />
                <text
                  x="20"
                  y="20"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] font-bold fill-white"
                  style={{ transform: 'rotate(90deg)', transformOrigin: '20px 20px' }}
                >
                  {percentage}%
                </text>
              </svg>
            </div>

            {/* Estatísticas compactas */}
            <div className="flex-1 ml-2 text-left space-y-1">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-white/80" />
                <span className="text-[10px] font-medium text-white/80">
                  Pessoas visitadas:{' '}
                  <span className="font-bold text-white">
                    {visitedPeople || visitsCompleted}/{visitsExpected}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-white/80" />
                <span className="text-[10px] font-medium text-white/80">
                  Total de visitas realizadas:{' '}
                  <span className="font-bold text-white">{totalVisits}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Layout completo para desktop */}
        <div className="hidden lg:block">
          <div className="flex flex-col items-center space-y-4">
            {/* Velocímetro SVG */}
            <div className="relative">
              <svg width="140" height="140" className="transform -rotate-90">
                {/* Fundo do velocímetro */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progresso do velocímetro */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="white"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease-in-out',
                  }}
                />
                {/* Marcadores do velocímetro */}
                <g stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                  {/* 0% */}
                  <line x1="70" y1="10" x2="70" y2="20" />
                  {/* 25% */}
                  <line x1="110" y1="30" x2="105" y2="35" />
                  {/* 50% */}
                  <line x1="130" y1="70" x2="120" y2="70" />
                  {/* 75% */}
                  <line x1="110" y1="110" x2="105" y2="105" />
                  {/* 100% */}
                  <line x1="70" y1="130" x2="70" y2="120" />
                </g>
                {/* Texto central */}
                <text
                  x="70"
                  y="70"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-2xl font-bold fill-white"
                  style={{ transform: 'rotate(90deg)', transformOrigin: '70px 70px' }}
                >
                  {percentage}%
                </text>
              </svg>
            </div>

            {/* Estatísticas */}
            <div className="text-center space-y-4">
              {/* Pessoas Visitadas */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-4 w-4 text-white/80" />
                  <span className="text-sm font-medium text-white/80">Pessoas Visitadas</span>
                </div>
                <div className="text-2xl font-bold text-white drop-shadow-lg">
                  {visitedPeople || visitsCompleted} / {visitsExpected}
                </div>
                <p className="text-xs text-white/70">
                  {visitsExpected - (visitedPeople || visitsCompleted) > 0
                    ? `${visitsExpected - (visitedPeople || visitsCompleted)} pessoas pendentes`
                    : 'Todas as pessoas foram visitadas!'}
                </p>
              </div>

              {/* Separador visual */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

              {/* Total de Visitas Realizadas */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-4 w-4 text-white/80" />
                  <span className="text-sm font-medium text-white/80">Visitas Realizadas</span>
                </div>
                <div className="text-2xl font-bold text-white drop-shadow-lg">{totalVisits}</div>
                <p className="text-xs text-white/70">
                  {totalVisits > (visitedPeople || visitsCompleted)
                    ? `Média de ${(totalVisits / (visitedPeople || visitsCompleted)).toFixed(1)} visitas por pessoa`
                    : 'Uma visita por pessoa'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
