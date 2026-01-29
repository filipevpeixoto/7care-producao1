import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { FileDown, FileSpreadsheet, FileText, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getRoleDisplayName } from '@/lib/permissions';

interface ExportMenuProps {
  data: any[];
}

const AVAILABLE_COLUMNS = [
  { id: 'name', label: 'Nome' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Perfil' },
  { id: 'status', label: 'Status' },
  { id: 'church', label: 'Igreja' },
  { id: 'points', label: 'Pontos' },
  { id: 'phone', label: 'Telefone' },
  { id: 'createdAt', label: 'Data de Cadastro' },
];

export function ExportMenu({ data }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map(col => col.id)
  );
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const getUserId = (user: any) => user.id || user._id || user.email;

  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return data;
    const term = userSearchTerm.toLowerCase();
    return data.filter(
      user =>
        (user.name?.toLowerCase() || '').includes(term) ||
        (user.email?.toLowerCase() || '').includes(term)
    );
  }, [data, userSearchTerm]);

  const translateRole = (role: string) => {
    if (role === 'admin') return 'Administrador';
    const legacyRoles: { [key: string]: string } = {
      leader: 'Líder',
      disciple: 'Discípulo',
      visitor: 'Visitante',
    };
    return legacyRoles[role] || getRoleDisplayName(role);
  };

  const translateStatus = (status: string) => {
    const statuses: { [key: string]: string } = {
      active: 'Ativo',
      inactive: 'Inativo',
      pending: 'Pendente',
    };
    return statuses[status] || status;
  };

  const getFormattedValue = (user: any, columnId: string) => {
    switch (columnId) {
      case 'role':
        return translateRole(user.role);
      case 'status':
        return translateStatus(user.status);
      case 'church':
        return user.church || '-';
      case 'points':
        return user.points || 0;
      case 'phone':
        return user.phone || '-';
      case 'createdAt':
        return user.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy') : '-';
      default:
        return user[columnId];
    }
  };

  const handleOpenModal = (format: 'excel' | 'pdf') => {
    setExportFormat(format);
    setStep(1);
    setUserSearchTerm('');
    // Initialize with all users selected
    setSelectedUsers(data.map(getUserId));
    setIsOpen(true);
  };

  const handleConfirmExport = () => {
    if (exportFormat === 'excel') {
      exportExcel();
    } else if (exportFormat === 'pdf') {
      exportPDF();
    }
    setIsOpen(false);
  };

  const getExportData = () => {
    // Filter data based on selectedUsers
    const usersToExport = data.filter(user => selectedUsers.includes(getUserId(user)));

    return usersToExport.map(user => {
      const row: { [key: string]: any } = {};
      selectedColumns.forEach(colId => {
        const column = AVAILABLE_COLUMNS.find(c => c.id === colId);
        if (column) {
          row[column.label] = getFormattedValue(user, colId);
        }
      });
      return row;
    });
  };

  const exportExcel = async () => {
    const exportData = getExportData();
    await exportToExcel(
      exportData,
      `relatorio_usuarios_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
      'Usuários'
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const usersToExport = data.filter(user => selectedUsers.includes(getUserId(user)));

    doc.setFontSize(16);
    doc.text('Relatório de Usuários', 14, 20);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
    doc.text(`Total de registros: ${usersToExport.length}`, 14, 34);

    const exportData = getExportData();

    const headers = selectedColumns
      .map(colId => AVAILABLE_COLUMNS.find(c => c.id === colId)?.label)
      .filter(Boolean) as string[];

    const tableRows = exportData.map(item => headers.map(header => item[header]));

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save(`relatorio_usuarios_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId) ? prev.filter(id => id !== columnId) : [...prev, columnId]
    );
  };

  const toggleAllColumns = () => {
    if (selectedColumns.length === AVAILABLE_COLUMNS.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.id));
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    const filteredIds = filteredUsers.map(getUserId);
    const allFilteredSelected = filteredIds.every(id => selectedUsers.includes(id));

    if (allFilteredSelected) {
      // Deselect all visible users
      setSelectedUsers(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all visible users
      const newSelected = new Set([...selectedUsers, ...filteredIds]);
      setSelectedUsers(Array.from(newSelected));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Relatórios
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleOpenModal('pdf')} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenModal('excel')} className="cursor-pointer">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{step === 1 ? 'Selecionar Colunas' : 'Selecionar Usuários'}</DialogTitle>
            <DialogDescription>
              {step === 1
                ? `Escolha quais colunas incluir no relatório ${exportFormat === 'pdf' ? 'PDF' : 'Excel'}.`
                : 'Selecione quais usuários devem aparecer no relatório.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {step === 1 ? (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="select-all-cols"
                    checked={selectedColumns.length === AVAILABLE_COLUMNS.length}
                    onCheckedChange={toggleAllColumns}
                  />
                  <Label htmlFor="select-all-cols" className="font-bold">
                    Selecionar Todas
                  </Label>
                </div>

                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="space-y-4">
                    {AVAILABLE_COLUMNS.map(column => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={column.id}
                          checked={selectedColumns.includes(column.id)}
                          onCheckedChange={() => toggleColumn(column.id)}
                        />
                        <Label htmlFor={column.id} className="cursor-pointer">
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuários..."
                      value={userSearchTerm}
                      onChange={e => setUserSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-2 pb-2 border-b">
                  <Checkbox
                    id="select-all-users"
                    checked={
                      filteredUsers.length > 0 &&
                      filteredUsers.every(u => selectedUsers.includes(getUserId(u)))
                    }
                    onCheckedChange={toggleAllUsers}
                  />
                  <Label htmlFor="select-all-users" className="font-bold">
                    Selecionar Todos ({selectedUsers.length} selecionados)
                  </Label>
                </div>

                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="space-y-3">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        Nenhum usuário encontrado.
                      </div>
                    ) : (
                      filteredUsers.map(user => {
                        const userId = getUserId(user);
                        return (
                          <div key={userId} className="flex items-start space-x-2 py-1">
                            <Checkbox
                              id={`user-${userId}`}
                              checked={selectedUsers.includes(userId)}
                              onCheckedChange={() => toggleUser(userId)}
                              className="mt-1"
                            />
                            <div className="grid gap-0.5 leading-none">
                              <Label
                                htmlFor={`user-${userId}`}
                                className="font-medium cursor-pointer"
                              >
                                {user.name}
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                {user.email} • {translateRole(user.role)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {step === 1 ? (
              <>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setStep(2)} disabled={selectedColumns.length === 0}>
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleConfirmExport} disabled={selectedUsers.length === 0}>
                  Exportar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
