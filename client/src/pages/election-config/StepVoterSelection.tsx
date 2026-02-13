import React from 'react';
import { formatEmailDisplay } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, AlertCircle, UserCheck } from 'lucide-react';
import type { ElectionMember, ElectionConfigData } from './types';

export interface StepVoterSelectionProps {
  config: ElectionConfigData;
  setConfig: React.Dispatch<React.SetStateAction<ElectionConfigData>>;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filteredMembers: ElectionMember[];
  selectedVoters: ElectionMember[];
  handleVoterToggle: (id: number) => void;
}

export function StepVoterSelection({
  config,
  setConfig,
  searchTerm,
  setSearchTerm,
  filteredMembers,
  selectedVoters,
  handleVoterToggle,
}: StepVoterSelectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Seleção de Votantes
        </CardTitle>
        <CardDescription>
          Selecione quais membros da igreja "{config.churchName || 'Selecione uma igreja'}"
          poderão votar na eleição
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!config.churchId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Selecione uma igreja na aba "Configuração Básica" para visualizar os membros
              disponíveis.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Barra de Busca */}
            <div className="space-y-2">
              <Label htmlFor="voter-search">Buscar membros</Label>
              <Input
                id="voter-search"
                type="text"
                placeholder="Digite o nome ou email do membro para pesquisar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Contadores */}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{filteredMembers.length} membro(s) encontrado(s)</span>
              <span>{selectedVoters.length} votante(s) selecionado(s)</span>
            </div>

            {/* Lista de Membros */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    id={`voter-${member.id}`}
                    checked={config.voters?.includes(member.id) || false}
                    onCheckedChange={() => handleVoterToggle(member.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm truncate">{member.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {formatEmailDisplay(member.email)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="secondary" className="text-xs">
                          {member.role}
                        </Badge>
                        <Badge
                          variant={
                            member.status === 'active' || member.status === 'approved'
                              ? 'default'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {member.status === 'active' || member.status === 'approved'
                            ? 'Ativo'
                            : 'Pendente'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {member.church}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredMembers.length === 0 && searchTerm && (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum membro encontrado para "{searchTerm}"</p>
                  <p className="text-xs mt-1">Tente usar um termo de busca diferente</p>
                </div>
              </div>
            )}

            {filteredMembers.length === 0 && !searchTerm && (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum membro encontrado para a igreja "{config.churchName}"</p>
                  <p className="text-xs mt-1">
                    Verifique se a igreja foi selecionada corretamente
                  </p>
                </div>
              </div>
            )}

            {/* Ações Rápidas */}
            {filteredMembers.length > 0 && (
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allMemberIds = filteredMembers.map(m => m.id);
                    setConfig(prev => ({
                      ...prev,
                      voters: allMemberIds,
                    }));
                  }}
                  className="flex-1"
                >
                  Selecionar Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfig(prev => ({
                      ...prev,
                      voters: [],
                    }));
                  }}
                  className="flex-1"
                >
                  Limpar Seleção
                </Button>
              </div>
            )}

            {/* Votantes Selecionados */}
            {selectedVoters.length > 0 && (
              <div className="space-y-2">
                <Label>Votantes selecionados ({selectedVoters.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedVoters.map(voter => (
                    <Badge
                      key={voter.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <UserCheck className="h-3 w-3" />
                      {voter.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
