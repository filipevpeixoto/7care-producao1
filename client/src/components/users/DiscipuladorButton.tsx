import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RelationshipsService } from '@/lib/relationshipsService';

interface DiscipuladorButtonProps {
  interestedId: number;
  currentDiscipuladores: any[];
  onDiscipuladoresChange: (discipuladores: any[]) => void;
}

export function DiscipuladorButton({ 
  interestedId, 
  currentDiscipuladores, 
  onDiscipuladoresChange 
}: DiscipuladorButtonProps) {
  const [open, setOpen] = useState(false);
  const [potentialMissionaries, setPotentialMissionaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Carregar membros disponíveis quando o modal abrir
  useEffect(() => {
    if (open) {
      loadPotentialMissionaries();
    }
  }, [open]);

  const loadPotentialMissionaries = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      
      const users = await response.json();
      console.log('🔍 Usuários carregados:', users.length);
      
      // Filtrar apenas membros/missionários (independente do status)
      const members = users.filter((user: any) => 
        user.role.includes('member') || user.role.includes('missionary')
      );
      
      console.log('🔍 Membros filtrados:', members.length);
      setPotentialMissionaries(members);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de membros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiscipulador = useCallback(async (missionaryId: number) => {
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
          status: 'active'
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar discipulador');
      }

      const newRelationship = await response.json();
      
      // Atualizar lista local
      const newDiscipulador = potentialMissionaries.find(m => m.id === missionaryId);
      if (newDiscipulador) {
        const updatedDiscipuladores = [
          ...currentDiscipuladores,
          {
            id: missionaryId,
            name: newDiscipulador.name,
            relationshipId: newRelationship.id
          }
        ];
        onDiscipuladoresChange(updatedDiscipuladores);
      }

      toast({
        title: "Sucesso",
        description: "Discipulador adicionado com sucesso",
      });

      setOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar discipulador:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o discipulador",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  }, [interestedId, potentialMissionaries, currentDiscipuladores, onDiscipuladoresChange, toast]);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full border border-blue-200"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Adicionar discipulador"
      >
        <UserPlus className="h-3 w-3" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="w-[95vw] max-w-[840px] flex flex-col p-0 overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 7rem)' }}
        >
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>Adicionar Discipulador</DialogTitle>
              <DialogDescription>
                Selecione um membro para ser o discipulador deste interessado.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex-1 min-h-0 px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Carregando membros...</span>
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
                  <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                  <CommandGroup>
                    {potentialMissionaries.map((member) => (
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
                            <div className="text-xs text-muted-foreground truncate">{member.email}</div>
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
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
