import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Image as ImageIcon, Calendar, Eye, EyeOff } from 'lucide-react';
import { useActivities, type Activity } from '@/hooks/useActivities';
import { toast } from 'sonner';

export function ActivitiesManager() {
  const {
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    isAdding,
    isUpdating,
    isDeleting,
  } = useActivities();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    date: '',
    active: true,
    order: 0,
  });

  const handleOpenDialog = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        title: activity.title,
        description: activity.description || '',
        imageUrl: activity.imageUrl,
        date: activity.date || '',
        active: activity.active,
        order: activity.order,
      });
    } else {
      setEditingActivity(null);
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        date: '',
        active: true,
        order: activities.length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.imageUrl.trim()) {
      toast.error('Título e URL da imagem são obrigatórios');
      return;
    }

    try {
      if (editingActivity) {
        await updateActivity({
          ...editingActivity,
          ...formData,
        });
        toast.success('Atividade atualizada com sucesso!');
      } else {
        await addActivity(formData);
        toast.success('Atividade criada com sucesso!');
      }

      setIsDialogOpen(false);
      setEditingActivity(null);
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        date: '',
        active: true,
        order: 0,
      });
    } catch (error) {
      toast.error('Erro ao salvar atividade');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      try {
        await deleteActivity(id);
        toast.success('Atividade excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir atividade');
      }
    }
  };

  const sortedActivities = [...activities].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Atividades do Carrossel</h2>
          <p className="text-gray-600">Gerencie as atividades exibidas no banner do dashboard</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingActivity ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
              <DialogDescription>
                Configure as informações da atividade que será exibida no carrossel
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Culto de Domingo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order">Ordem</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={e =>
                      setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da atividade (opcional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem *</Label>
                  <div className="relative">
                    <Input
                      id="imageUrl"
                      value={formData.imageUrl}
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://exemplo.com/imagem.jpg"
                      required
                    />
                    <ImageIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <div className="relative">
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={checked => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Ativa</Label>
              </div>

              {formData.imageUrl && (
                <div className="space-y-2">
                  <Label>Preview da Imagem</Label>
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.currentTarget.src =
                          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCAxMDBDODAgODkuNTQ0NyA4OC4wMDAxIDgxIDEwMCA4MUMxMTEuOTU2IDgxIDEyMCA4OS41NDQ3IDEyMCAxMDBDMTIwIDExMC40NTUgMTExLjk1NiAxMTkgMTAwIDExOUM4OC4wMDAxIDExOSA4MCAxMTAuNDU1IDgwIDEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEwMCAxMzVDMTA4LjI4NCAxMzUgMTE1IDEyOC4yODQgMTE1IDEyMEMxMTUgMTExLjcxNiAxMDguMjg0IDEwNSAxMDAgMTA1QzkxLjcxNTcgMTA1IDg1IDExMS43MTYgODUgMTIwQzg1IDEyOC4yODQgOTEuNzE1NyAxMzUgMTAwIDEzNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                      }}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isAdding || isUpdating}>
                  {isAdding || isUpdating ? 'Salvando...' : editingActivity ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {sortedActivities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Nenhuma atividade cadastrada
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Crie sua primeira atividade para exibir no carrossel do dashboard
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Atividade
              </Button>
            </CardContent>
          </Card>
        ) : (
          sortedActivities.map(activity => (
            <Card key={activity.id} className="overflow-hidden">
              <div className="flex">
                <div className="w-32 h-24 flex-shrink-0">
                  <img
                    src={activity.imageUrl}
                    alt={activity.title}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.currentTarget.src =
                        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCAxMDBDODAgODkuNTQ0NyA4OC4wMDAxIDgxIDEwMCA4MUMxMTEuOTU2IDgxIDEyMCA4OS41NDQ3IDEyMCAxMDBDMTIwIDExMC40NTUgMTExLjk1NiAxMTkgMTAwIDExOUM4OC4wMDAxIDExOSA4MCAxMTAuNDU1IDgwIDEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEwMCAxMzVDMTA4LjI4NCAxMzUgMTE1IDEyOC4yODQgMTE1IDEyMEMxMTUgMTExLjcxNiAxMDguMjg0IDEwNSAxMDAgMTA1QzkxLjcxNTcgMTA1IDg1IDExMS43MTYgODUgMTIwQzg1IDEyOC4yODQgOTEuNzE1NyAxMzUgMTAwIDEzNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                    }}
                  />
                </div>

                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{activity.title}</h3>
                        <Badge variant={activity.active ? 'default' : 'secondary'}>
                          {activity.active ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Ativa
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Inativa
                            </>
                          )}
                        </Badge>
                        <Badge variant="outline">Ordem: {activity.order}</Badge>
                      </div>

                      {activity.description && (
                        <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                      )}

                      {activity.date && (
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(activity.date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(activity)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(activity.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
