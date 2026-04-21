import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Users,
  Vote,
  Play,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2,
  BarChart3,
  Edit,
  Save,
  BarChart4,
  AlignLeft,
  RefreshCw,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MobileLayout } from '@/components/layout/MobileLayout';
import type { Candidate, ElectionData, ElectionPhase, Position } from './electionManageTypes';

export type GetZoomedSize = (size: string) => string;

export const LoadingState = ({ isFullscreen }: { isFullscreen: boolean }) => (
  <MobileLayout fullscreen={isFullscreen}>
    <div className="p-4 flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Carregando eleição...</span>
    </div>
  </MobileLayout>
);

export const ErrorState = ({ isFullscreen }: { isFullscreen: boolean }) => (
  <MobileLayout fullscreen={isFullscreen}>
    <div className="p-4 text-center">
      <Alert>
        <AlertDescription>Não foi possível carregar os dados da eleição.</AlertDescription>
      </Alert>
    </div>
  </MobileLayout>
);

export const ElectionManageHeader = ({
  churchName,
  autoRefresh,
  isFullscreen,
  zoomLevel,
  setAutoRefresh,
  toggleFullscreen,
  increaseZoom,
  decreaseZoom,
  getZoomedSize,
}: {
  churchName: string;
  autoRefresh: boolean;
  isFullscreen: boolean;
  zoomLevel: number;
  setAutoRefresh: (value: boolean) => void;
  toggleFullscreen: () => void;
  increaseZoom: () => void;
  decreaseZoom: () => void;
  getZoomedSize: GetZoomedSize;
}) => (
  <div className={`flex items-center justify-between ${isFullscreen ? 'mb-2' : ''}`}>
    <div className="flex items-center gap-3">
      <Settings className={`${isFullscreen ? 'h-6 w-6' : 'h-8 w-8'} text-purple-600`} />
      <div>
        <h1
          className="font-bold"
          style={{ fontSize: isFullscreen ? getZoomedSize('text-xl') : undefined }}
        >
          Gerenciar Eleição
        </h1>
        <p
          className="text-muted-foreground"
          style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
        >
          {churchName}
        </p>
      </div>
    </div>

    <div className="flex gap-2">
      {isFullscreen && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={decreaseZoom}
            className="h-8 px-2"
            disabled={zoomLevel <= 70}
            aria-label="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={increaseZoom}
            className="h-8 px-2"
            disabled={zoomLevel >= 150}
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="flex items-center px-2 text-sm text-muted-foreground">{zoomLevel}%</div>
        </>
      )}
      <Button
        variant="outline"
        size={isFullscreen ? 'sm' : 'sm'}
        onClick={toggleFullscreen}
        className={isFullscreen ? 'h-8 px-2' : ''}
        aria-label={isFullscreen ? 'Sair da tela cheia' : 'Abrir em tela cheia'}
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        <span className={isFullscreen ? 'hidden' : 'ml-2'}>
          {isFullscreen ? 'Sair' : 'Tela Cheia'}
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setAutoRefresh(!autoRefresh)}
        className={isFullscreen ? 'h-8 px-2' : ''}
        aria-label={autoRefresh ? 'Pausar atualização automática' : 'Ativar atualização automática'}
      >
        <Loader2
          className={`h-4 w-4 ${isFullscreen ? '' : 'mr-2'} ${autoRefresh ? 'animate-spin' : ''}`}
        />
        <span className={isFullscreen ? 'hidden' : ''}>{autoRefresh ? 'Pausar' : 'Atualizar'}</span>
      </Button>
    </div>
  </div>
);

export const ProgressOverview = ({
  electionData,
  isFullscreen,
  getPhaseProgress,
  getVoterTurnout,
  getZoomedSize,
}: {
  electionData: ElectionData;
  isFullscreen: boolean;
  getPhaseProgress: () => number;
  getVoterTurnout: () => number;
  getZoomedSize: GetZoomedSize;
}) => (
  <Card className={isFullscreen ? 'mb-2' : ''}>
    <CardHeader className={isFullscreen ? 'pb-2' : ''}>
      <CardTitle
        className="flex items-center gap-2"
        style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
      >
        <BarChart3 className={`${isFullscreen ? 'h-5 w-5' : 'h-5 w-5'}`} />
        Progresso da Eleição
      </CardTitle>
    </CardHeader>
    <CardContent className={`${isFullscreen ? 'space-y-2' : 'space-y-4'}`}>
      <div className={`grid ${isFullscreen ? 'grid-cols-4 gap-2' : 'grid-cols-2 gap-4'}`}>
        <div className="text-center">
          <div
            className="font-bold text-blue-600"
            style={{ fontSize: isFullscreen ? getZoomedSize('text-xl') : undefined }}
          >
            {electionData.currentPosition + 1} / {electionData.totalPositions}
          </div>
          <div
            className="text-muted-foreground"
            style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
          >
            Cargos
          </div>
        </div>
        <div className="text-center">
          <div
            className="font-bold text-green-600"
            style={{ fontSize: isFullscreen ? getZoomedSize('text-xl') : undefined }}
          >
            {electionData.votedVoters} / {electionData.totalVoters}
          </div>
          <div
            className="text-muted-foreground"
            style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
          >
            Votantes
          </div>
        </div>
        {isFullscreen && (
          <>
            <div className="text-center">
              <div
                className="font-bold text-purple-600"
                style={{ fontSize: getZoomedSize('text-xl') }}
              >
                {Math.round(getPhaseProgress())}%
              </div>
              <div className="text-muted-foreground" style={{ fontSize: getZoomedSize('text-sm') }}>
                Progresso
              </div>
            </div>
            <div className="text-center">
              <div
                className="font-bold text-orange-600"
                style={{ fontSize: getZoomedSize('text-xl') }}
              >
                {Math.round(getVoterTurnout())}%
              </div>
              <div className="text-muted-foreground" style={{ fontSize: getZoomedSize('text-sm') }}>
                Participação
              </div>
            </div>
          </>
        )}
      </div>

      {!isFullscreen && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso Geral</span>
              <span>{Math.round(getPhaseProgress())}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${getPhaseProgress()}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Participação</span>
              <span>{Math.round(getVoterTurnout())}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${getVoterTurnout()}%` }}
              ></div>
            </div>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

export const NominationConfig = ({
  currentPhase,
  isFullscreen,
  maxNominations,
  editingMaxNominations,
  tempMaxNominations,
  setEditingMaxNominations,
  setTempMaxNominations,
  handleSaveMaxNominations,
  getZoomedSize,
}: {
  currentPhase: ElectionPhase;
  isFullscreen: boolean;
  maxNominations: number;
  editingMaxNominations: boolean;
  tempMaxNominations: string;
  setEditingMaxNominations: (value: boolean) => void;
  setTempMaxNominations: (value: string) => void;
  handleSaveMaxNominations: () => void;
  getZoomedSize: GetZoomedSize;
}) =>
  currentPhase === 'nomination' ? (
    <Card className={`border-purple-200 bg-purple-50 ${isFullscreen ? 'mb-2' : ''}`}>
      <CardContent className={isFullscreen ? 'p-2' : 'p-4'}>
        <div
          className={`flex items-center justify-between gap-4 ${isFullscreen ? 'flex-col gap-2' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Settings className={`${isFullscreen ? 'h-4 w-4' : 'h-4 w-4'} text-purple-600`} />
            <span
              className="font-medium text-purple-900"
              style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
            >
              {isFullscreen ? 'Máx. indicações:' : 'Máximo de indicações por votante:'}
            </span>
          </div>

          {editingMaxNominations ? (
            <div
              className={`flex items-center gap-2 ${isFullscreen ? 'w-full justify-center' : ''}`}
            >
              <Input
                type="number"
                min="1"
                value={tempMaxNominations}
                onChange={(e) => setTempMaxNominations(e.target.value)}
                className={`${isFullscreen ? 'w-16 h-6 text-xs' : 'w-20 h-8'} text-center`}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSaveMaxNominations}
                className={`${isFullscreen ? 'h-8 px-3 text-sm' : 'h-8'} bg-purple-600 hover:bg-purple-700`}
              >
                <Save className={`${isFullscreen ? 'h-3 w-3' : 'h-3 w-3'} mr-1`} />
                {isFullscreen ? '' : 'Salvar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingMaxNominations(false);
                  setTempMaxNominations(maxNominations.toString());
                }}
                className={isFullscreen ? 'h-8 px-3 text-sm' : 'h-8'}
              >
                {isFullscreen ? '' : 'Cancelar'}
              </Button>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 ${isFullscreen ? 'w-full justify-center' : ''}`}
            >
              <Badge
                variant="secondary"
                className="px-2 py-1 font-bold"
                style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
              >
                {maxNominations}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingMaxNominations(true);
                  setTempMaxNominations(maxNominations.toString());
                }}
                className={isFullscreen ? 'h-8 px-3 text-sm' : 'h-8'}
              >
                <Edit className={`${isFullscreen ? 'h-3 w-3' : 'h-3 w-3'} mr-1`} />
                {isFullscreen ? '' : 'Editar'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  ) : null;

export const VerticalResults = ({
  results,
  electionData,
  isFullscreen,
  getZoomedSize,
}: {
  results: Candidate[];
  electionData: ElectionData;
  isFullscreen: boolean;
  getZoomedSize: GetZoomedSize;
}) => (
  <div className="space-y-4">
    {(() => {
      const maxVotes = Math.max(...results.map((c) => c.votes), 1);
      const maxBarHeight = maxVotes > 0 ? (maxVotes / maxVotes) * 300 + 20 : 20;
      const containerHeight = Math.max(400, maxBarHeight + 160);

      return (
        <div
          className="chart-container"
          style={{
            display: 'flex',
            alignItems: 'end',
            justifyContent: 'space-around',
            gap: '16px',
            height: `${containerHeight}px`,
            padding: '20px',
            backgroundColor: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            minHeight: '400px',
          }}
        >
          {results
            .sort((a, b) => b.votes - a.votes)
            .map((candidate, index) => {
              const barHeight =
                candidate.votes === 0 ? 20 : (candidate.votes / maxVotes) * 300 + 20;
              const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
              const color = colors[index % colors.length];

              return (
                <div
                  key={candidate.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    maxWidth: '120px',
                  }}
                >
                  <div
                    style={{
                      textAlign: 'center',
                      marginBottom: '8px',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'end',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: '4px',
                      }}
                    >
                      {candidate.votes}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                      }}
                    >
                      {candidate.percentage.toFixed(1)}%
                    </div>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'end',
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        backgroundColor: color,
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.5s ease',
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'center',
                        paddingBottom: '8px',
                        minHeight: candidate.votes === 0 ? '20px' : 'auto',
                        height: `${barHeight}px`,
                      }}
                    ></div>
                  </div>

                  <div
                    style={{
                      marginTop: '8px',
                      textAlign: 'center',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={candidate.name}
                    >
                      {candidate.name.split(' ')[0]}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={candidate.name}
                    >
                      {candidate.name.split(' ').slice(1).join(' ')}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      );
    })()}
    <div
      className="text-center text-muted-foreground"
      style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
    >
      <strong>{electionData.votedVoters}</strong> de <strong>{electionData.totalVoters}</strong>{' '}
      votantes já votaram
      {electionData.totalVoters - electionData.votedVoters > 0 &&
        ` • Faltam ${electionData.totalVoters - electionData.votedVoters} votos`}
    </div>
  </div>
);

export const HorizontalResults = ({
  results,
  currentPhase,
  electionData,
  isFullscreen,
  getZoomedSize,
}: {
  results: Candidate[];
  currentPhase: ElectionPhase;
  electionData: ElectionData;
  isFullscreen: boolean;
  getZoomedSize: GetZoomedSize;
}) => (
  <div className={`${isFullscreen ? 'space-y-2' : 'space-y-3'}`}>
    {results
      .sort((a, b) => {
        if (currentPhase === 'voting') {
          return b.votes - a.votes;
        }
        return a.name.localeCompare(b.name);
      })
      .map((candidate) => (
        <div key={candidate.id} className={`${isFullscreen ? 'p-2' : 'p-4'} bg-gray-50 rounded-lg`}>
          <div className={`flex items-center justify-between ${isFullscreen ? 'mb-1' : 'mb-2'}`}>
            <div className="flex items-center gap-3">
              <div
                className={`${isFullscreen ? 'w-7 h-7' : 'w-8 h-8'} bg-blue-100 rounded-full flex items-center justify-center`}
              >
                <span
                  className={`text-blue-600 font-semibold ${isFullscreen ? 'text-sm' : 'text-sm'}`}
                >
                  {candidate.nominations}
                </span>
              </div>
              <span
                className="font-medium"
                style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
              >
                {candidate.name}
              </span>
            </div>
            {currentPhase === 'voting' && (
              <div className="text-right">
                <div
                  className="font-bold text-green-600"
                  style={{ fontSize: isFullscreen ? getZoomedSize('text-xl') : undefined }}
                >
                  {candidate.votes}
                </div>
                <div
                  className="text-muted-foreground"
                  style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                >
                  {candidate.percentage.toFixed(1)}%
                </div>
              </div>
            )}
          </div>

          {currentPhase === 'voting' && (
            <div className={`${isFullscreen ? 'space-y-1' : 'space-y-2'}`}>
              <div
                className="flex justify-between"
                style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
              >
                <span>Votos</span>
                <span>
                  {candidate.votes} / {electionData.totalVoters}
                </span>
              </div>
              <div className={`w-full bg-gray-200 rounded-full ${isFullscreen ? 'h-2' : 'h-4'}`}>
                <div
                  className={`bg-green-500 ${isFullscreen ? 'h-2' : 'h-4'} rounded-full transition-all duration-500`}
                  style={{ width: `${candidate.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      ))}
    {currentPhase === 'voting' && electionData.totalVoters - electionData.votedVoters > 0 && (
      <div
        className="text-muted-foreground text-center bg-amber-50 rounded-lg border border-amber-200 py-1"
        style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
      >
        {electionData.totalVoters - electionData.votedVoters} votantes ainda não votaram
      </div>
    )}
  </div>
);

export const CurrentPositionCard = ({
  currentPosData,
  currentPhase,
  chartView,
  electionData,
  isFullscreen,
  isLastPosition,
  setChartView,
  handleAdvanceToVoting,
  handleAdvancePosition,
  handleSkipPosition,
  handleResetVoting,
  getZoomedSize,
}: {
  currentPosData: Position | null;
  currentPhase: ElectionPhase;
  chartView: 'horizontal' | 'vertical';
  electionData: ElectionData;
  isFullscreen: boolean;
  isLastPosition: boolean;
  setChartView: (value: 'horizontal' | 'vertical') => void;
  handleAdvanceToVoting: () => void;
  handleAdvancePosition: () => void;
  handleSkipPosition: () => void;
  handleResetVoting: () => void;
  getZoomedSize: GetZoomedSize;
}) => {
  if (!currentPosData) {
    return null;
  }

  return (
    <Card className={`${isFullscreen ? 'flex-1 flex flex-col' : ''}`}>
      <CardHeader className={isFullscreen ? 'pb-2' : ''}>
        <CardTitle
          className="flex items-center gap-2"
          style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
        >
          <Vote className={`${isFullscreen ? 'h-5 w-5' : 'h-5 w-5'}`} />
          {currentPosData.position}
          <Badge
            variant={currentPhase === 'completed' ? 'default' : 'secondary'}
            style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
          >
            {currentPhase === 'nomination' && 'Indicação'}
            {currentPhase === 'voting' && 'Votação'}
            {currentPhase === 'completed' && 'Concluído'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isFullscreen ? 'space-y-2 flex-1 overflow-auto' : 'space-y-4'}`}>
        <div className="space-y-3">
          <div className={`flex items-center justify-between ${isFullscreen ? 'mb-2' : 'mb-4'}`}>
            <h4
              className="font-semibold"
              style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
            >
              Candidatos Indicados
            </h4>

            {currentPhase === 'voting' && currentPosData.results.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={chartView === 'horizontal' ? 'default' : 'outline'}
                  onClick={() => setChartView('horizontal')}
                  className="h-8"
                >
                  <AlignLeft className={`h-4 w-4 ${isFullscreen ? '' : 'mr-1'}`} />
                  <span className={isFullscreen ? 'hidden' : ''}>Barras horizontal</span>
                </Button>
                <Button
                  size="sm"
                  variant={chartView === 'vertical' ? 'default' : 'outline'}
                  onClick={() => setChartView('vertical')}
                  className="h-8"
                >
                  <BarChart4 className={`h-4 w-4 ${isFullscreen ? '' : 'mr-1'}`} />
                  <span className={isFullscreen ? 'hidden' : ''}>Barra Vertical</span>
                </Button>
              </div>
            )}
          </div>

          {currentPosData.results.length === 0 ? (
            <p
              className="text-muted-foreground text-center py-2"
              style={{ fontSize: isFullscreen ? getZoomedSize('text-base') : undefined }}
            >
              Aguardando indicações...
            </p>
          ) : currentPhase === 'voting' && chartView === 'vertical' ? (
            <VerticalResults
              results={currentPosData.results}
              electionData={electionData}
              isFullscreen={isFullscreen}
              getZoomedSize={getZoomedSize}
            />
          ) : (
            <HorizontalResults
              results={currentPosData.results}
              currentPhase={currentPhase}
              electionData={electionData}
              isFullscreen={isFullscreen}
              getZoomedSize={getZoomedSize}
            />
          )}
        </div>

        <div className={`flex flex-wrap gap-2 ${isFullscreen ? 'pt-2' : 'pt-4'} border-t`}>
          {currentPhase === 'nomination' && (
            <div className="flex gap-2">
              {currentPosData.totalNominations > 0 && (
                <Button
                  onClick={handleAdvanceToVoting}
                  className={`bg-green-600 hover:bg-green-700 ${isFullscreen ? 'h-9 px-4 text-base' : ''}`}
                >
                  <Play className={`${isFullscreen ? 'h-4 w-4 mr-1' : 'h-4 w-4 mr-2'}`} />
                  {isFullscreen ? 'Iniciar' : 'Iniciar Votação'}
                </Button>
              )}
              <Button
                onClick={handleSkipPosition}
                variant="outline"
                className={`border-blue-300 text-blue-700 hover:bg-blue-50 ${isFullscreen ? 'h-9 px-4 text-base' : ''}`}
              >
                <ArrowRight className={`${isFullscreen ? 'h-4 w-4 mr-1' : 'h-4 w-4 mr-2'}`} />
                {isFullscreen
                  ? isLastPosition
                    ? 'Finalizar'
                    : 'Próximo'
                  : isLastPosition
                    ? 'Finalizar Eleição'
                    : 'Próximo Cargo'}
              </Button>
            </div>
          )}

          {currentPhase === 'voting' && (
            <>
              {electionData.votedVoters >= electionData.totalVoters && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleAdvancePosition}
                    className={`bg-blue-600 hover:bg-blue-700 ${isFullscreen ? 'h-9 px-4 text-base' : ''}`}
                  >
                    <ArrowRight className={`${isFullscreen ? 'h-4 w-4 mr-1' : 'h-4 w-4 mr-2'}`} />
                    {isFullscreen
                      ? isLastPosition
                        ? 'Finalizar'
                        : 'Próximo'
                      : isLastPosition
                        ? 'Finalizar Eleição'
                        : 'Próximo Cargo'}
                  </Button>

                  <Button
                    onClick={handleResetVoting}
                    variant="outline"
                    className={`border-orange-300 text-orange-700 hover:bg-orange-50 ${isFullscreen ? 'h-9 px-4 text-base' : ''}`}
                  >
                    <RefreshCw className={`${isFullscreen ? 'h-4 w-4 mr-1' : 'h-4 w-4 mr-2'}`} />
                    {isFullscreen ? 'Repetir' : 'Repetir Votação'}
                  </Button>
                </div>
              )}

              {electionData.votedVoters < electionData.totalVoters && (
                <div
                  className="text-amber-600 bg-amber-50 rounded-lg border border-amber-200 p-2"
                  style={{ fontSize: isFullscreen ? getZoomedSize('text-sm') : undefined }}
                >
                  <strong>Aguardando votos:</strong> {electionData.votedVoters} de{' '}
                  {electionData.totalVoters} votantes já votaram.
                  {!isFullscreen && (
                    <>
                      <br />
                      <span className="text-xs">
                        Todos os votantes devem votar antes de avançar.
                      </span>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {currentPhase === 'voting' && !isFullscreen && (
          <Alert
            className={
              electionData.votedVoters >= electionData.totalVoters
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }
          >
            <Clock className="h-4 w-4" />
            <AlertDescription
              className={
                electionData.votedVoters >= electionData.totalVoters
                  ? 'text-green-800'
                  : 'text-amber-800'
              }
            >
              <strong>Status da Votação:</strong> {electionData.votedVoters} de{' '}
              {electionData.totalVoters} votantes votaram
              {electionData.votedVoters >= electionData.totalVoters
                ? ' - Todos os votos foram computados!'
                : ` - Faltam ${electionData.totalVoters - electionData.votedVoters} votos`}
            </AlertDescription>
          </Alert>
        )}

        {currentPosData.winner && !isFullscreen && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Eleito:</strong> {currentPosData.winner.name} com{' '}
              {currentPosData.winner.votes} votos ({Math.round(currentPosData.winner.percentage)}%)
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const VoterInstructions = ({
  currentPhase,
  currentPosData,
}: {
  currentPhase: ElectionPhase;
  currentPosData: Position | null;
}) => (
  <Card className="bg-blue-50 border-blue-200">
    <CardHeader>
      <CardTitle className="text-blue-800 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Instruções para Votantes
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-blue-700 space-y-2">
        {currentPhase === 'nomination' && (
          <>
            <p>
              <strong>1.</strong> Acesse o link da eleição em seu celular
            </p>
            <p>
              <strong>2.</strong> Selecione quem você indica para{' '}
              <strong>{currentPosData?.position}</strong>
            </p>
            <p>
              <strong>3.</strong> Clique em "Indicar"
            </p>
            <p>
              <strong>4.</strong> Após as indicações, clique em "Iniciar Votação"
            </p>
          </>
        )}

        {currentPhase === 'voting' && (
          <>
            <p>
              <strong>1.</strong> Acesse o link da eleição em seu celular
            </p>
            <p>
              <strong>2.</strong> Selecione quem você escolhe para{' '}
              <strong>{currentPosData?.position}</strong>
            </p>
            <p>
              <strong>3.</strong> Clique em "Votar"
            </p>
            <p>
              <strong>4.</strong> Acompanhe os resultados em tempo real
            </p>
          </>
        )}

        {currentPhase === 'completed' && (
          <p>
            <strong>Eleição finalizada!</strong> Todos os cargos foram eleitos com sucesso.
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

export const RealtimeUpdates = () => (
  <Alert>
    <Clock className="h-4 w-4" />
    <AlertDescription>
      Esta tela é atualizada automaticamente a cada 2 segundos para mostrar os resultados em tempo
      real.
    </AlertDescription>
  </Alert>
);
