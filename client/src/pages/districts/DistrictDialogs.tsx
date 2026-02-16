import { Building2, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Church } from '@/types/domain';

type PastorOption = {
  id: number;
  name: string;
  email?: string | null;
};

type District = {
  id: number;
  name: string;
  code: string;
  pastor_id: number | null;
  pastorId?: number | null;
  pastor_name?: string;
  pastor_email?: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  churchesCount?: number;
  churches?: Church[];
};

type DistrictFormData = {
  name: string;
  code: string;
  pastorId: string;
  description: string;
};

type CreateDistrictDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: DistrictFormData;
  setFormData: (data: DistrictFormData) => void;
  pastors: PastorOption[];
  onCreate: () => void;
};

export const CreateDistrictDialog = ({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  pastors,
  onCreate,
}: CreateDistrictDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Criar Distrito</DialogTitle>
        <DialogDescription>Crie um novo distrito para organizar igrejas</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Nome do Distrito</Label>
          <Input
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Santana do Livramento"
          />
        </div>
        <div>
          <Label>Código</Label>
          <Input
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="Ex: SLIV001"
          />
        </div>
        <div>
          <Label>Pastor (Opcional)</Label>
          <Select
            value={formData.pastorId || 'none'}
            onValueChange={value =>
              setFormData({ ...formData, pastorId: value === 'none' ? '' : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um pastor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {pastors.map(pastor => (
                <SelectItem key={pastor.id} value={pastor.id.toString()}>
                  {pastor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Descrição (Opcional)</Label>
          <Textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição do distrito"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={onCreate} disabled={!formData.name || !formData.code}>
          Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

type EditDistrictDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: DistrictFormData;
  setFormData: (data: DistrictFormData) => void;
  pastors: PastorOption[];
  onUpdate: () => void;
};

export const EditDistrictDialog = ({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  pastors,
  onUpdate,
}: EditDistrictDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar Distrito</DialogTitle>
        <DialogDescription>Atualize as informações do distrito</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Nome do Distrito</Label>
          <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div>
          <Label>Código</Label>
          <Input
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <Label>Pastor (Opcional)</Label>
          <Select
            value={formData.pastorId || 'none'}
            onValueChange={value =>
              setFormData({ ...formData, pastorId: value === 'none' ? '' : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um pastor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {pastors.map(pastor => (
                <SelectItem key={pastor.id} value={pastor.id.toString()}>
                  {pastor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Descrição (Opcional)</Label>
          <Textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={onUpdate} disabled={!formData.name || !formData.code}>
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

type DeleteDistrictDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  districtToDelete: District | null;
  onConfirm: () => void;
};

export const DeleteDistrictDialog = ({
  isOpen,
  onOpenChange,
  districtToDelete,
  onConfirm,
}: DeleteDistrictDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogDescription>
          Tem certeza que deseja deletar o distrito "{districtToDelete?.name}"? Esta ação não pode
          ser desfeita.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Deletar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

type LinkChurchesDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDistrictForLink: District | null;
  setSelectedDistrictForLink: (district: District | null) => void;
  selectedChurchIds: number[];
  setSelectedChurchIds: (churchIds: number[]) => void;
  districts: District[];
  unassignedChurches: Church[];
  toChurchId: (id: Church['id']) => number;
  handleToggleChurch: (churchId: number) => void;
  onLinkChurches: () => void;
  isLinking: boolean;
};

export const LinkChurchesDialog = ({
  isOpen,
  onOpenChange,
  selectedDistrictForLink,
  setSelectedDistrictForLink,
  selectedChurchIds,
  setSelectedChurchIds,
  districts,
  unassignedChurches,
  toChurchId,
  handleToggleChurch,
  onLinkChurches,
  isLinking,
}: LinkChurchesDialogProps) => (
  <Dialog
    open={isOpen}
    onOpenChange={open => {
      onOpenChange(open);
      if (!open) {
        setSelectedDistrictForLink(null);
        setSelectedChurchIds([]);
      }
    }}
  >
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Vincular Igrejas {selectedDistrictForLink ? `ao Distrito ${selectedDistrictForLink.name}` : 'sem Distrito'}
        </DialogTitle>
        <DialogDescription>
          {selectedDistrictForLink
            ? `Selecione as igrejas que deseja vincular ao distrito "${selectedDistrictForLink.name}".`
            : 'Selecione um distrito e as igrejas que deseja vincular.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-4 py-4">
        {!selectedDistrictForLink && districts.length > 0 && (
          <div>
            <Label>Selecione o Distrito</Label>
            <Select
              value=""
              onValueChange={value => {
                const found = districts.find(d => d.id === parseInt(value));
                setSelectedDistrictForLink(found || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um distrito" />
              </SelectTrigger>
              <SelectContent>
                {districts.map(district => (
                  <SelectItem key={district.id} value={district.id.toString()}>
                    {district.name} ({district.churchesCount || 0} igrejas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {unassignedChurches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Não há igrejas sem distrito para vincular.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Igrejas sem Distrito ({unassignedChurches.length})</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedChurchIds.length === unassignedChurches.length) {
                    setSelectedChurchIds([]);
                  } else {
                    setSelectedChurchIds(unassignedChurches.map(church => toChurchId(church.id)));
                  }
                }}
              >
                {selectedChurchIds.length === unassignedChurches.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </Button>
            </div>
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {unassignedChurches.map(church => {
                const churchId = toChurchId(church.id);
                return (
                  <div
                    key={church.id}
                    className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleToggleChurch(churchId)}
                  >
                    <Checkbox
                      id={`church-${church.id}`}
                      checked={selectedChurchIds.includes(churchId)}
                      onCheckedChange={() => handleToggleChurch(churchId)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{church.name}</p>
                      {church.address && <p className="text-sm text-muted-foreground">{church.address}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {church.code || 'Sem código'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="flex-shrink-0">
        <Button
          variant="outline"
          onClick={() => {
            onOpenChange(false);
            setSelectedDistrictForLink(null);
            setSelectedChurchIds([]);
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={onLinkChurches}
          disabled={!selectedDistrictForLink || selectedChurchIds.length === 0 || isLinking}
        >
          {isLinking ? 'Vinculando...' : `Vincular ${selectedChurchIds.length} Igreja(s)`}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
