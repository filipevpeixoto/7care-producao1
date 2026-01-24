import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Vote, 
  Clock, 
  Users,
  ArrowRight,
  AlertCircle,
  Loader2,
  Church,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';

interface ActiveElection {
  election_id: number;
  config_id: number;
  church_name: string;
  status: string;
  current_position: number;
  positions: string[];
  voters: number[];
  created_at: string;
}

export default function ElectionVoting() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeElections, setActiveElections] = useState<ActiveElection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveElections();
  }, [user?.id]);

  const loadActiveElections = async () => {
    try {
      if (!user?.id) {
        console.log('Usuário não autenticado');
        setActiveElections([]);
        return;
      }

      const response = await fetch('/api/elections/active', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'x-user-id': user.id.toString()
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveElections(data.elections || []);
      } else if (response.status === 400) {
        const errorData = await response.json();
        console.log('Erro de validação:', errorData.error);
        setActiveElections([]);
      } else {
        setActiveElections([]);
      }
    } catch (error) {
      console.error('Erro ao carregar eleições ativas:', error);
      setActiveElections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessElection = (election: ActiveElection) => {
    // Redirecionar para a interface de votação mobile usando config_id
    window.location.href = `/election-vote/${election.config_id}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  if (loading) {
    return (
      <MobileLayout>
        <div className="p-4 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando nomeações...</span>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Vote className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Nomeações de Liderança</h1>
            <p className="text-muted-foreground">Acesse as eleições ativas da sua igreja</p>
          </div>
        </div>

        {/* Lista de eleições ativas */}
        {activeElections.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Nenhuma Nomeação Disponível</h2>
              <p className="text-muted-foreground mb-4">
                {!user?.id 
                  ? "Você precisa estar logado para ver suas nomeações."
                  : "Você não está incluído em nenhuma nomeação ativa no momento."
                }
              </p>
              {!user?.id && (
                <Button 
                  onClick={() => window.location.href = '/login'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Fazer Login
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeElections.map((election) => (
              <Card key={election.election_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Church className="h-6 w-6 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{election.church_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          Iniciada em {formatDate(election.created_at)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      Nomeação Ativa
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Progresso */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cargo Atual</span>
                      <span>{election.current_position + 1} de {election.positions.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${((election.current_position + 1) / election.positions.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {election.positions[election.current_position] || 'Aguardando início'}
                    </p>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {election.voters.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Votantes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {election.positions.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Cargos</div>
                    </div>
                  </div>

                  {/* Botão de acesso */}
                  <Button 
                    onClick={() => handleAccessElection(election)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Acessar Nomeação
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Instruções */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Como Participar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-700 space-y-2">
              <p><strong>1.</strong> Clique em "Acessar Nomeação" na eleição da sua igreja</p>
              <p><strong>2.</strong> Siga as instruções na tela do seu celular</p>
              <p><strong>3.</strong> Indique ou vote conforme solicitado</p>
              <p><strong>4.</strong> Acompanhe os resultados em tempo real</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
