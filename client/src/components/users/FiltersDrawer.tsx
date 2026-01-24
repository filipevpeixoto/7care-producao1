import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Church } from '@shared/schema';

interface FiltersDrawerProps {
  // Valores dos filtros
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
  churchFilter: string;
  mountainFilter: string;
  priorityFilter: string;
  interestedSituationFilter: string;
  spiritualCheckInFilter: string;
  missionaryProfileFilter: string;
  
  // Setters
  setSearchTerm: (value: string) => void;
  setRoleFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setChurchFilter: (value: string) => void;
  setMountainFilter: (value: string) => void;
  setPriorityFilter: (value: string) => void;
  setInterestedSituationFilter: (value: string) => void;
  setSpiritualCheckInFilter: (value: string) => void;
  setMissionaryProfileFilter: (value: string) => void;
  
  // Dados adicionais
  churches: Church[];
  activeFiltersCount: number;
  isAdmin: boolean;
}

export const FiltersDrawer = ({
  searchTerm,
  roleFilter,
  statusFilter,
  churchFilter,
  mountainFilter,
  priorityFilter,
  interestedSituationFilter,
  spiritualCheckInFilter,
  missionaryProfileFilter,
  setSearchTerm,
  setRoleFilter,
  setStatusFilter,
  setChurchFilter,
  setMountainFilter,
  setPriorityFilter,
  setInterestedSituationFilter,
  setSpiritualCheckInFilter,
  setMissionaryProfileFilter,
  churches,
  activeFiltersCount,
  isAdmin
}: FiltersDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [basicFiltersOpen, setBasicFiltersOpen] = useState(true);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const clearAllFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setChurchFilter('all');
    setMountainFilter('all');
    setPriorityFilter('all');
    setInterestedSituationFilter('all');
    setSpiritualCheckInFilter('all');
    setMissionaryProfileFilter('all');
  };

  const mountains = [
    { value: 'all', label: 'Todos os Montes' },
    { value: 'vale', label: 'Vale do Jordão (0-299)' },
    { value: 'sinai', label: 'Monte Sinai (300-399)' },
    { value: 'nebo', label: 'Monte Nebo (400-499)' },
    { value: 'moria', label: 'Monte Moriá (500-599)' },
    { value: 'carmelo', label: 'Monte Carmelo (600-699)' },
    { value: 'hermon', label: 'Monte Hermon (700-799)' },
    { value: 'siao', label: 'Monte Sião (800-899)' },
    { value: 'oliveiras', label: 'Monte das Oliveiras (900-999)' },
    { value: 'topo', label: 'O Topo (1000+)' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[350px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            Configure os filtros para encontrar usuários específicos
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4 space-y-4">
          {/* Busca rápida */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <Input
              placeholder="Nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Filtros Básicos - Colapsável */}
          <Collapsible open={basicFiltersOpen} onOpenChange={setBasicFiltersOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-b">
              <span>Filtros Básicos</span>
              {basicFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Perfil */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Perfil</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os perfis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os perfis</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                    <SelectItem value="missionary">Missionário</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="interested">Interessado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Igreja */}
              {isAdmin && churches.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Igreja</label>
                  <Select value={churchFilter} onValueChange={setChurchFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as igrejas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as igrejas</SelectItem>
                      {churches.map((church) => (
                        <SelectItem key={church.id} value={church.name}>
                          {church.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Filtros Avançados - Colapsável */}
          <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-b">
              <span>Filtros Avançados</span>
              {advancedFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Monte (Gamificação) */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Monte (Pontuação)</label>
                <Select value={mountainFilter} onValueChange={setMountainFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os montes" />
                  </SelectTrigger>
                  <SelectContent>
                    {mountains.map((mountain) => (
                      <SelectItem key={mountain.value} value={mountain.value}>
                        {mountain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prioridade */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Prioridade</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as prioridades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as prioridades</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Situação do Interessado */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Situação do Interessado</label>
                <Select value={interestedSituationFilter} onValueChange={setInterestedSituationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as situações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as situações</SelectItem>
                    <SelectItem value="A">Situação A</SelectItem>
                    <SelectItem value="B">Situação B</SelectItem>
                    <SelectItem value="C">Situação C</SelectItem>
                    <SelectItem value="D">Situação D</SelectItem>
                    <SelectItem value="no-situation">Sem situação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Check-in Espiritual */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Check-in Espiritual</label>
                <Select value={spiritualCheckInFilter} onValueChange={setSpiritualCheckInFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os check-ins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="score-1">⭐ (1)</SelectItem>
                    <SelectItem value="score-2">⭐⭐ (2)</SelectItem>
                    <SelectItem value="score-3">⭐⭐⭐ (3)</SelectItem>
                    <SelectItem value="score-4">⭐⭐⭐⭐ (4)</SelectItem>
                    <SelectItem value="score-5">⭐⭐⭐⭐⭐ (5)</SelectItem>
                    <SelectItem value="no-checkin">Sem check-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Perfil Missionário */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Perfil Missionário</label>
                <Select value={missionaryProfileFilter} onValueChange={setMissionaryProfileFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="missionary">Com perfil missionário</SelectItem>
                    <SelectItem value="non-missionary">Sem perfil missionário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Filtros ativos */}
          {activeFiltersCount > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Filtros ativos:</p>
              <div className="flex flex-wrap gap-1">
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Busca: {searchTerm}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSearchTerm('')} />
                  </Badge>
                )}
                {roleFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Perfil: {roleFilter}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setRoleFilter('all')} />
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {statusFilter}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setStatusFilter('all')} />
                  </Badge>
                )}
                {churchFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Igreja: {churchFilter}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setChurchFilter('all')} />
                  </Badge>
                )}
                {mountainFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Monte: {mountainFilter}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setMountainFilter('all')} />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botão Aplicar */}
        <div className="absolute bottom-4 left-4 right-4">
          <Button className="w-full" onClick={() => setIsOpen(false)}>
            Aplicar Filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
