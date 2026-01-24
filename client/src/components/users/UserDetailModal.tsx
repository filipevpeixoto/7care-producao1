import { useState } from 'react';
import { DialogWithModalTracking, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRoleDisplayName } from "@/lib/permissions";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Heart, 
  Star,
  Gift,
  Award,
  X,
  AlertTriangle,
  Church,
  GraduationCap,
  Briefcase,
  Users,
  Baby,
  Edit,
  Save,
  Check,
  X as XIcon
} from "lucide-react";

interface UserDetailModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (userId: number, data: any) => void;
}

export const UserDetailModal = ({ user, isOpen, onClose, onUpdate }: UserDetailModalProps) => {
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  if (!user) return null;

  const startEditing = (field: string, currentValue: any) => {
    setEditingFields(prev => ({ ...prev, [field]: true }));
    setEditValues(prev => ({ ...prev, [field]: currentValue }));
  };

  const cancelEditing = (field: string) => {
    setEditingFields(prev => ({ ...prev, [field]: false }));
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[field];
      return newValues;
    });
  };

  const saveField = async (field: string) => {
    const newValue = editValues[field];
    setIsUpdating(true);
    
    try {
      await onUpdate(user.id, { [field]: newValue });
      setEditingFields(prev => ({ ...prev, [field]: false }));
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[field];
        return newValues;
      });
    } catch (error) {
      console.error('Erro ao atualizar campo:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderEditableField = (field: string, label: string, value: any, type: 'text' | 'textarea' | 'select' = 'text', options?: string[]) => {
    const isEditing = editingFields[field];
    const currentValue = isEditing ? editValues[field] : value;

    if (isEditing) {
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{label}</label>
          <div className="flex gap-2">
            {type === 'textarea' ? (
              <Textarea
                value={currentValue || ''}
                onChange={(e) => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
                className="flex-1"
                rows={3}
              />
            ) : type === 'select' ? (
              <Select value={currentValue || ''} onValueChange={(value) => setEditValues(prev => ({ ...prev, [field]: value }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={currentValue || ''}
                onChange={(e) => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
                className="flex-1"
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => saveField(field)}
              disabled={isUpdating}
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancelEditing(field)}
              disabled={isUpdating}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{label}</label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEditing(field, value)}
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{value || 'Não informado'}</p>
      </div>
    );
  };

  // Helper functions
  // Sistema robusto de detecção de datas (mesmo da importação)
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    
    try {
      // Limpa a string (remove espaços, aspas)
      const dateStr = dateValue.toString().trim().replace(/['"]/g, '');
      
      // 1. Detecção de Números do Excel (serial dates)
      if (!isNaN(dateValue) && typeof dateValue === 'number') {
        const excelEpoch = new Date(1900, 0, 1);
        const daysSinceEpoch = dateValue - 2;
        const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
        
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
          return date;
        }
      }
      
      // 2. Formato DD/MM/YYYY (formato brasileiro padrão)
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const parsedDay = parseInt(day);
          const parsedMonth = parseInt(month);
          let parsedYear = parseInt(year);
          
          // Se o ano tem 2 dígitos, converte para 4 dígitos
          if (parsedYear < 100) {
            parsedYear += parsedYear < 50 ? 2000 : 1900;
          }
          
          if (parsedDay >= 1 && parsedDay <= 31 && 
              parsedMonth >= 1 && parsedMonth <= 12 && 
              parsedYear >= 1900 && parsedYear <= 2100) {
            const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
            if (date.getDate() === parsedDay && 
                date.getMonth() === parsedMonth - 1 && 
                date.getFullYear() === parsedYear) {
              return date;
            }
          }
        }
      }
      
      // 3. Formato DD-MM-YYYY
      if (dateStr.includes('-') && dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = dateStr.split('-');
        const [day, month, year] = parts;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        const parsedYear = parseInt(year);
        
        if (parsedDay >= 1 && parsedDay <= 31 && 
            parsedMonth >= 1 && parsedMonth <= 12 && 
            parsedYear >= 1900 && parsedYear <= 2100) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (date.getDate() === parsedDay && 
              date.getMonth() === parsedMonth - 1 && 
              date.getFullYear() === parsedYear) {
            return date;
          }
        }
      }
      
      // 4. Formato YYYY-MM-DD (formato ISO)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
          return date;
        }
      }
      
      // 5. Formato YYYY/MM/DD (formato alternativo)
      if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        const parts = dateStr.split('/');
        const [year, month, day] = parts;
        const parsedYear = parseInt(year);
        const parsedMonth = parseInt(month);
        const parsedDay = parseInt(day);
        
        if (parsedYear >= 1900 && parsedYear <= 2100 &&
            parsedMonth >= 1 && parsedMonth <= 12 &&
            parsedDay >= 1 && parsedDay <= 31) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (date.getDate() === parsedDay && 
              date.getMonth() === parsedMonth - 1 && 
              date.getFullYear() === parsedYear) {
            return date;
          }
        }
      }
      
      // 6. Formato DD.MM.YYYY
      if (dateStr.includes('.') && dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        const parts = dateStr.split('.');
        const [day, month, year] = parts;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        const parsedYear = parseInt(year);
        
        if (parsedDay >= 1 && parsedDay <= 31 && 
            parsedMonth >= 1 && parsedMonth <= 12 && 
            parsedYear >= 1900 && parsedYear <= 2100) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (date.getDate() === parsedDay && 
              date.getMonth() === parsedMonth - 1 && 
              date.getFullYear() === parsedYear) {
            return date;
          }
        }
      }
      
      // 7. Formato DD.MM.YY
      if (dateStr.includes('.') && dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{2}$/)) {
        const parts = dateStr.split('.');
        const [day, month, year] = parts;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        let parsedYear = parseInt(year);
        
        parsedYear += parsedYear < 50 ? 2000 : 1900;
        
        if (parsedDay >= 1 && parsedDay <= 31 && 
            parsedMonth >= 1 && parsedMonth <= 12 && 
            parsedYear >= 1900 && parsedYear <= 2100) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (date.getDate() === parsedDay && 
              date.getMonth() === parsedMonth - 1 && 
              date.getFullYear() === parsedYear) {
            return date;
          }
        }
      }
      
      // 8. Intervalos com ano (ex: "15/01-20/02/2024") - usa a primeira data
      if (dateStr.includes('-') && dateStr.includes('/')) {
        const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}\/(\d{4})$/);
        if (match) {
          const firstDate = match[1] + '/' + match[2];
          return parseDate(firstDate);
        }
      }
      
      // 9. Intervalos sem ano (ex: "24/07-03/08") - usa ano atual
      if (dateStr.includes('-') && dateStr.includes('/') && !dateStr.match(/\d{4}/)) {
        const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}$/);
        if (match) {
          const currentYear = new Date().getFullYear();
          const firstDate = match[1] + '/' + currentYear;
          return parseDate(firstDate);
        }
      }
      
      // 10. Data sem ano (ex: "03/12") - usa ano atual
      if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
        const currentYear = new Date().getFullYear();
        const dateWithYear = dateStr + '/' + currentYear;
        return parseDate(dateWithYear);
      }
      
      // 11. Fallback: tenta o construtor padrão do JavaScript
      const date = new Date(dateValue);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return 'Não informado';
    
    const dateObj = parseDate(birthDate);
    if (!dateObj) return 'Não informado';
    
    return Math.floor((new Date().getTime() - dateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' anos';
  };

  const formatDateForDisplay = (dateValue: any): string => {
    if (!dateValue) return 'Não informado';
    
    const dateObj = parseDate(dateValue);
    if (!dateObj) return 'Não informado';
    
    return dateObj.toLocaleDateString('pt-BR');
  };

  const calculateYearsSince = (date: string | null) => {
    if (!date) return 'Não informado';
    
    const dateObj = parseDate(date);
    if (!dateObj) return 'Não informado';
    
    return Math.floor((new Date().getTime() - dateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' anos';
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Não informado';
    
    const dateObj = parseDate(date);
    if (!dateObj) {
      console.log(`Data inválida detectada no frontend: ${date}`);
      return 'Não informado';
    }
    
    return dateObj.toLocaleDateString('pt-BR');
  };

  // Parse extraData from JSON string
  const getExtraData = () => {
    try {
      // Verificar tanto extra_data quanto extraData para compatibilidade
      const extraDataField = user.extra_data || user.extraData;
      if (extraDataField && typeof extraDataField === 'string') {
        return JSON.parse(extraDataField);
      }
      if (extraDataField && typeof extraDataField === 'object') {
        return extraDataField;
      }
      return {};
    } catch (error) {
      console.error('Erro ao parsear extra_data:', error);
      return {};
    }
  };

  const extraData = getExtraData();

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'interested') return 'Amigo';
    return getRoleDisplayName(role);
  };

  const getCivilStatusLabel = (status: string) => {
    switch (status) {
      case 'single': return 'Solteiro(a)';
      case 'married': return 'Casado(a)';
      case 'divorced': return 'Divorciado(a)';
      case 'widowed': return 'Viúvo(a)';
      default: return 'Não informado';
    }
  };

  const getDepartments = () => {
    if (!user.departments) return [];
    if (typeof user.departments === 'string') {
      return user.departments.split(',').map((d: string) => d.trim()).filter((d: string) => d);
    }
    if (Array.isArray(user.departments)) {
      return user.departments;
    }
    return [];
  };

  // Check if user has phone warning
  const getPhoneWarning = () => {
    try {
      if (user.extraData && typeof user.extraData === 'string') {
        const extraData = JSON.parse(user.extraData);
        return extraData.phoneWarning ? {
          hasWarning: true,
          originalPhone: extraData.originalPhone
        } : { hasWarning: false };
      }
      return { hasWarning: false };
    } catch {
      return { hasWarning: false };
    }
  };

  return (
    <DialogWithModalTracking 
      modalId="user-detail-modal"
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent 
        className="max-w-6xl w-[95vw]"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.profilePhoto} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl font-bold">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
              <Badge variant="outline" className="ml-2">
                {getRoleLabel(user.role)}
              </Badge>
            </DialogTitle>
            

          </div>
          <DialogDescription>
            Informações detalhadas do membro
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card className="shadow-divine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  {renderEditableField('church', 'Igreja', user.church)}
                </div>
                <div>
                  {renderEditableField('name', 'Nome', user.name)}
                </div>
                <div>
                  {renderEditableField('church_code', 'Código', user.church_code || user.churchCode)}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Tipo</label>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
                  </div>
                </div>
                <div>
                  {renderEditableField('extraData.sexo', 'Sexo', extraData.sexo)}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Idade</label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.idade || calculateAge(user.birth_date || user.birthDate)}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Nascimento</label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{formatDateForDisplay(user.birth_date || user.birthDate)}</p>
                </div>
                <div>
                  {renderEditableField('engajamento', 'Engajamento', user.engajamento)}
                </div>
                <div>
                  {renderEditableField('classificacao', 'Classificação', user.classificacao)}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Estado Civil</label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{getCivilStatusLabel(user.civil_status || user.civilStatus)}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Ocupação</label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{user.occupation || 'Não informado'}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Educação</label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{user.education || 'Não informado'}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Status</label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.status === 'approved' ? 'default' : 'secondary'}>
                      {user.status === 'approved' ? 'Aprovado' : user.status === 'pending' ? 'Pendente' : 'Recusado'}
                    </Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Financeiras */}
          <Card className="shadow-divine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Dízimos e Ofertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Classificação</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.level || 'Iniciante'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Dizimista</label>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.is_donor || user.isDonor ? "default" : "secondary"}>
                      {user.dizimista_type || (user.is_donor || user.isDonor ? 'Sim' : 'Não')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">É Dizimista (DB)</label>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.is_tither || user.isTither ? "default" : "secondary"}>
                      {user.is_tither || user.isTither ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">É Doador</label>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.is_donor || user.isDonor ? "default" : "secondary"}>
                      {user.is_donor || user.isDonor ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Dízimos - 12m</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.dizimos12m || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Último dízimo - 12m</label>
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(extraData.ultimoDizimo)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Valor dízimo - 12m</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.valorDizimo || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Número de meses s/ dizimar</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.numeroMesesSemDizimar || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Dizimista antes do últ. dízimo</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.dizimistaAntesUltimoDizimo || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Ofertante</label>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.isOffering ? "default" : "secondary"}>
                      {user.ofertante_type || (user.isOffering ? 'Sim' : 'Não')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Ofertas - 12m</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.ofertas12m || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Última oferta - 12m</label>
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(extraData.ultimaOferta)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Valor oferta - 12m</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.valorOferta || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Número de meses s/ ofertar</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.numeroMesesSemOfertar || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Ofertante antes da últ. oferta</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.ofertanteAntesUltimaOferta || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Último movimento</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.ultimoMovimento || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Data do último movimento</label>
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(extraData.dataUltimoMovimento)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de entrada</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.tipoEntrada || 'Não informado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Batismo */}
          <Card className="shadow-divine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Batismo e Vida Espiritual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Tempo de batismo</label>
                  <p className="text-sm text-muted-foreground mt-1">{calculateYearsSince(user.baptism_date || user.baptismDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Batismo</label>
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(user.baptism_date || user.baptismDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tempo de batismo</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.tempoBatismo || calculateYearsSince(user.baptism_date || user.baptismDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Localidade do batismo</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.localidadeBatismo || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Batizado por</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.batizadoPor || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Idade no Batismo</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.idadeBatismo || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tempo de batismo - anos</label>
                  <p className="text-sm text-muted-foreground mt-1">{calculateYearsSince(user.baptism_date || user.baptismDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Religião anterior</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.previousReligion || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Como conheceu a IASD</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.comoConheceu || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Fator decisivo</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.fatorDecisivo || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Como estudou a Bíblia</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.comoEstudou || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Entrada</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.tipoEntrada || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Instrutor bíblico</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.biblicalInstructor || extraData.instrutorBiblico || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Instrutor bíblico 2</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.instrutorBiblico2 || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tem cargo</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.temCargo || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Teen</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.teen || 'Não informado'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Departamentos e cargos</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getDepartments().length > 0 ? (
                      getDepartments().map((dept: string, index: number) => (
                        <Badge key={index} variant="secondary" data-testid={`badge-department-${index}`}>
                          {dept}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhum departamento</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Familiares */}
          <Card className="shadow-divine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Informações Familiares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome da mãe</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.nomeMae || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome do pai</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.nomePai || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estado civil</label>
                  <p className="text-sm text-muted-foreground mt-1">{getCivilStatusLabel(user.civilStatus)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Data de casamento</label>
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(extraData.dataCasamento)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Profissionais e Educacionais */}
          <Card className="shadow-divine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Educação e Profissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Grau de educação</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.education || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Ocupação</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.occupation || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Endereço Completo</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.address || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Religião Anterior</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.previous_religion || user.previousReligion || (extraData.comoConheceu === 'Família/parentes' ? 'Nenhuma' : 'Não informado')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Instrutor Bíblico</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.biblical_instructor || user.biblicalInstructor || extraData.batizadoPor || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Primeiro Acesso</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.first_access || user.firstAccess ? "default" : "secondary"}>
                      {user.first_access || user.firstAccess ? 'Sim' : 'Não'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Aluno educação Adv.</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.alunoEducacao || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Parentesco p/ c/ aluno</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.parentesco || 'Não informado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Contato */}
          <Card className="shadow-divine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contato e Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Celular
                      {getPhoneWarning().hasWarning && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing('phone', user.phone)}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mt-1">{user.phone || 'Não informado'}</p>
                    {getPhoneWarning().hasWarning && (
                      <div className="flex items-center gap-2 mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <div className="text-xs text-yellow-700 dark:text-yellow-300">
                          <strong>Telefone original:</strong> {getPhoneWarning().originalPhone}
                          <br />
                          <span className="text-muted-foreground">Telefone muito curto durante a importação</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {renderEditableField('email', 'Email', user.email)}
                </div>
                <div>
                  {renderEditableField('extraData.cidadeEstado', 'Cidade e Estado', extraData.cidadeEstado)}
                </div>
                <div>
                  {renderEditableField('extraData.bairro', 'Bairro', extraData.bairro)}
                </div>
                <div className="md:col-span-2">
                  {renderEditableField('address', 'Endereço', user.address, 'textarea')}
                </div>
                <div>
                  {renderEditableField('extraData.cidadeNascimento', 'Cidade de nascimento', extraData.cidadeNascimento)}
                </div>
                <div>
                  {renderEditableField('extraData.estadoNascimento', 'Estado de nascimento', extraData.estadoNascimento)}
                </div>
                <div>
                  {renderEditableField('cpf', 'CPF', user.cpf)}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">CPF válido</label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.cpf_valido ? "default" : "secondary"}>
                      {user.cpf_valido ? 'Sim' : 'Não'}
                    </Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Escola Sabatina */}
          <Card className="shadow-divine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Escola Sabatina
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome da unidade</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.nome_unidade || extraData.cidadeEstado || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Matriculado na ES</label>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.isEnrolledES ? "default" : "secondary"}>
                      {user.isEnrolledES ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Tem lição</label>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.tem_licao || user.hasLesson ? "default" : "secondary"}>
                      {user.tem_licao || user.hasLesson ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Período ES</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.esPeriod || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Comunhão</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.comunhao ?? 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Missão</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.missao ?? 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estudo bíblico</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.estudo_biblico ?? 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Batizou alguém</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.batizou_alguem ? 'Sim' : 'Não'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Disc. pós batismal</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.disc_pos_batismal ?? 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total presença no cartão</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.presencaTotal || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Presença no quiz local</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.presencaQuizLocal || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Presença no quiz outra unidade</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.presencaQuizOutraUnidade || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Presença no quiz online</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.presencaQuizOnline || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total de presença</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.total_presenca ?? user.attendance ?? 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Teve participação</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.teveParticipacao || 'Não informado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Adicionais */}
          <Card className="shadow-divine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Colaboração e Outros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Campo - colaborador</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.campoColaborador || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Área - colaborador</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.areaColaborador || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estabelecimento - colaborador</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.estabelecimentoColaborador || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Função - colaborador</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.funcaoColaborador || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Campos vazios/inválidos</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.campos_vazios ? "destructive" : "default"}>
                      {user.campos_vazios ? 'Tem campos vazios' : 'Completo'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome dos campos vazios no ACMS</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.nomeCamposVazios || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Pontos</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.points || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Nível</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.level || 'Iniciante'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Frequência</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.attendance || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Pontuação</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.points || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Código (extra)</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.codigo || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Bairro</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.bairro || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Cidade/Estado</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.cidadeEstado || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Valor Dízimo</label>
                  <p className="text-sm text-muted-foreground mt-1">{extraData.valorDizimo ? `R$ ${extraData.valorDizimo}` : 'Não informado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {user.observations && (
            <Card className="shadow-divine">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{user.observations}</p>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} data-testid="button-close">
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>

      </DialogContent>
    </DialogWithModalTracking>
  );
};

export default UserDetailModal;
