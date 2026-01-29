import React, { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface DiscipuladoresManagerProps {
  interestedId: number;
  interestedChurch: string;
  currentDiscipuladores: any[];
  onDiscipuladoresChange: (discipuladores: any[]) => void;
}

export function DiscipuladoresManager({
  interestedId,
  interestedChurch,
  currentDiscipuladores,
  onDiscipuladoresChange,
}: DiscipuladoresManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  const { toast } = useToast();

  // Buscar todos os usuários com cache (React Query)
  const { data: allUsersRaw, isLoading: loading } = useQuery<any>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Manter em cache por 10 minutos
  });

  // Normalizar dados - API pode retornar {data: [], pagination: {}} ou array direto
  const allUsers = useMemo(() => {
    if (Array.isArray(allUsersRaw)) return allUsersRaw;
    if (allUsersRaw?.data && Array.isArray(allUsersRaw.data)) return allUsersRaw.data;
    return [];
  }, [allUsersRaw]);

  // Filtrar membros disponíveis de forma otimizada (useMemo)
  const potentialMissionaries = useMemo(() => {
    console.log('🔍 Filtrando discipuladores para igreja:', interestedChurch);
    console.log('📊 Total de usuários carregados:', allUsers.length);

    const currentIds = currentDiscipuladores.map(d => d.id);

    const filtered = allUsers.filter((user: any) => {
      const isMemberOrMissionary = user.role === 'member' || user.role === 'missionary';
      const isNotCurrent = !currentIds.includes(user.id);
      const isSameChurch = user.church === interestedChurch;

      return isMemberOrMissionary && isNotCurrent && isSameChurch;
    });

    console.log('✅ Membros filtrados da mesma igreja:', filtered.length);
    console.log('📋 Igrejas únicas nos resultados:', [
      ...new Set(filtered.map((u: any) => u.church)),
    ]);

    return filtered;
  }, [allUsers, currentDiscipuladores, interestedChurch]);

  const handleAddDiscipulador = useCallback(
    async (missionaryId: number) => {
      setIsAdding(true);
      try {
        console.log('🔍 Adicionando discipulador via API...');

        const response = await fetch('/api/relationships', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            interestedId,
            missionaryId,
            status: 'active',
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao adicionar discipulador');
        }

        const newRelationship = await response.json();

        // Atualizar lista local
        const newDiscipulador = potentialMissionaries.find((m: any) => m.id === missionaryId);
        if (newDiscipulador) {
          const updatedDiscipuladores = [
            ...currentDiscipuladores,
            {
              id: missionaryId,
              name: newDiscipulador.name,
              relationshipId: newRelationship.id,
            },
          ];
          onDiscipuladoresChange(updatedDiscipuladores);
          // Lista de disponíveis será recalculada automaticamente pelo useMemo
        }

        toast({
          title: 'Sucesso',
          description: 'Discipulador adicionado com sucesso',
        });

        setShowAddModal(false);
      } catch (error) {
        console.error('Erro ao adicionar discipulador:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível adicionar o discipulador',
          variant: 'destructive',
        });
      } finally {
        setIsAdding(false);
      }
    },
    [interestedId, potentialMissionaries, currentDiscipuladores, onDiscipuladoresChange, toast]
  );

  const handleRemoveDiscipulador = useCallback(
    async (relationshipId: number) => {
      setIsRemoving(relationshipId);
      try {
        const response = await fetch(`/api/relationships/${relationshipId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Erro ao remover discipulador');
        }

        // Atualizar lista local
        const updatedDiscipuladores = currentDiscipuladores.filter(
          d => d.relationshipId !== relationshipId
        );
        onDiscipuladoresChange(updatedDiscipuladores);

        toast({
          title: 'Sucesso',
          description: 'Discipulador removido com sucesso',
        });

        // A lista de disponíveis será atualizada automaticamente pelo useMemo
      } catch (error) {
        console.error('Erro ao remover discipulador:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível remover o discipulador',
          variant: 'destructive',
        });
      } finally {
        setIsRemoving(null);
      }
    },
    [currentDiscipuladores, onDiscipuladoresChange, toast]
  );

  return (
    <div className="space-y-2">
      {/* Lista de discipuladores atuais */}
      {currentDiscipuladores.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-start">
          {currentDiscipuladores.map(discipulador => (
            <Badge
              key={discipulador.id}
              variant="secondary"
              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              {discipulador.name}
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 ml-1 hover:bg-blue-100"
                onClick={() => handleRemoveDiscipulador(discipulador.relationshipId)}
                disabled={isRemoving === discipulador.relationshipId}
              >
                {isRemoving === discipulador.relationshipId ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Botão para adicionar discipulador */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAddModal(true)}
        className="text-xs h-7"
      >
        + Adicionar Discipulador
      </Button>

      <DialogWithModalTracking
        modalId="discipuladores-add-modal"
        open={showAddModal}
        onOpenChange={setShowAddModal}
      >
        <DialogContent
          className="w-[95vw] max-w-[840px] flex flex-col p-0 overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
        >
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>Adicionar Discipulador</DialogTitle>
              <DialogDescription>
                Selecione um membro da igreja <strong>{interestedChurch}</strong> para ser o
                discipulador deste interessado.
                {!loading && potentialMissionaries.length > 0 && (
                  <span className="block mt-1 text-blue-600">
                    {potentialMissionaries.length}{' '}
                    {potentialMissionaries.length === 1
                      ? 'membro disponível'
                      : 'membros disponíveis'}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 min-h-0 px-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">
                  Carregando membros da {interestedChurch}...
                </span>
              </div>
            ) : potentialMissionaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <div className="text-gray-400 text-4xl">👥</div>
                <p className="text-sm text-gray-600">Nenhum membro disponível nesta igreja</p>
                <p className="text-xs text-gray-400">Todos os membros já são discipuladores</p>
              </div>
            ) : (
              <Command className="h-full">
                <CommandInput
                  placeholder="Buscar membros..."
                  id="search-members"
                  name="search-members"
                  className="border-0 focus:ring-0"
                />
                <CommandList className="max-h-[350px] overflow-auto">
                  <CommandEmpty>Nenhum membro disponível.</CommandEmpty>
                  <CommandGroup>
                    {potentialMissionaries.map((member: any) => (
                      <CommandItem
                        key={member.id}
                        value={member.name}
                        onSelect={() => handleAddDiscipulador(member.id)}
                        disabled={isAdding}
                        className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-blue-600">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="font-medium truncate text-sm">{member.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {member.email}
                              {member.church && (
                                <span className="ml-2 text-blue-600">• {member.church}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAdding && (
                          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 ml-2" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </div>

          <div className="p-6 pt-0">
            <DialogFooter className="flex justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </DialogWithModalTracking>
    </div>
  );
}
