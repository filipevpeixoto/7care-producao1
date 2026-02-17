import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Heart, Phone, MessageCircle, MapPin, Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useQuery } from '@tanstack/react-query';

interface InterestedPerson {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  status: string;
  assignedTo?: string;
  lastContact?: string;
  source?: string;
}

const statusColors = {
  new: 'bg-yellow-500 text-white',
  contacted: 'bg-blue-500 text-white',
  studying: 'bg-green-500 text-white',
  baptized: 'bg-purple-500 text-white',
  inactive: 'bg-gray-500 text-white',
};

const Interested = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const statusLabels: Record<string, string> = {
    new: t('interested.statusNew'),
    contacted: t('interested.statusContacted'),
    studying: t('interested.statusStudying'),
    baptized: t('interested.statusBaptized'),
    inactive: t('interested.statusInactive'),
  };

  const canManage = hasAdminAccess(user) || user?.role === 'missionary';

  const [interestedOverrides, setInterestedOverrides] = useState<
    Record<number, Partial<InterestedPerson>>
  >({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Buscar dados reais da API
  const { data: interestedData = [], isLoading: dataLoading } = useQuery({
    queryKey: ['/api/users', 'interested'],
    queryFn: async () => {
      const res = await fetch('/api/users?role=interested');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: canManage,
    staleTime: 30 * 1000,
  });

  const baseInterested = useMemo(() => {
    if (!Array.isArray(interestedData)) return [];
    return interestedData.map((u) => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      address: u.address || '',
      status: u.status || 'new',
      assignedTo: u.assignedTo || '',
      lastContact: u.lastContact || '',
      source: u.source || '',
    }));
  }, [interestedData]);

  const interested = useMemo(
    () =>
      baseInterested.map((person) => ({
        ...person,
        ...(interestedOverrides[person.id] || {}),
      })),
    [baseInterested, interestedOverrides]
  );

  const filteredInterested = interested.filter((person) => {
    const matchesSearch =
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || person.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAssignToMe = (personId: number) => {
    setInterestedOverrides((prev) => ({
      ...prev,
      [personId]: { ...prev[personId], assignedTo: user?.name || '' },
    }));
  };

  const handleUpdateStatus = (personId: number, newStatus: string) => {
    setInterestedOverrides((prev) => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        status: newStatus,
        lastContact: new Date().toISOString().split('T')[0],
      },
    }));
  };

  const stats = {
    total: interested.length,
    new: interested.filter((p) => p.status === 'new').length,
    studying: interested.filter((p) => p.status === 'studying').length,
    myAssigned: interested.filter((p) => p.assignedTo === user?.name).length,
  };

  if (!canManage) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">{t('interested.restrictedAccess')}</h2>
          <p className="text-muted-foreground">{t('interested.restrictedMessage')}</p>
        </div>
      </MobileLayout>
    );
  }

  if (dataLoading) {
    return (
      <MobileLayout>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t('interested.friends')}</h1>
            <p className="text-muted-foreground">{t('interested.manageFriends')}</p>
          </div>
          <Button className="bg-gradient-primary hover:opacity-90">
            <UserPlus className="w-4 h-4 mr-2" />
            {t('interested.new')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="text-center shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{t('interested.total')}</p>
            </CardContent>
          </Card>
          <Card className="text-center shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.new}</div>
              <p className="text-xs text-muted-foreground">{t('interested.newCount')}</p>
            </CardContent>
          </Card>
          <Card className="text-center shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.studying}</div>
              <p className="text-xs text-muted-foreground">{t('interested.studyingLabel')}</p>
            </CardContent>
          </Card>
          <Card className="text-center shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.myAssigned}</div>
              <p className="text-xs text-muted-foreground">{t('interested.mine')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label={t('interested.searchFriends')}
              placeholder={t('interested.searchFriendsPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'new', 'contacted', 'studying', 'baptized'].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="whitespace-nowrap"
              >
                {status === 'all'
                  ? t('interested.all')
                  : statusLabels[status as keyof typeof statusLabels]}
              </Button>
            ))}
          </div>
        </div>

        {/* Interested List */}
        <div className="space-y-3">
          {filteredInterested.map((person) => (
            <Card key={person.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{person.name}</h3>
                        <p className="text-sm text-muted-foreground">{person.email}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[person.status as keyof typeof statusColors]}>
                      {statusLabels[person.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {person.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {person.address}
                    </div>
                    {person.assignedTo && (
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        {t('interested.responsible')}: {person.assignedTo}
                      </div>
                    )}
                    {person.lastContact && (
                      <div>
                        {t('interested.lastContact')}:{' '}
                        {new Date(person.lastContact).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="w-4 h-4 mr-2" />
                      {t('interested.call')}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>

                  {!person.assignedTo && (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-primary hover:opacity-90"
                      onClick={() => handleAssignToMe(person.id)}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {t('interested.takeResponsibility')}
                    </Button>
                  )}

                  {person.assignedTo === user?.name && (
                    <div className="flex gap-2">
                      {person.status === 'new' && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdateStatus(person.id, 'contacted')}
                        >
                          {t('interested.markAsContacted')}
                        </Button>
                      )}
                      {person.status === 'contacted' && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdateStatus(person.id, 'studying')}
                        >
                          {t('interested.startStudy')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInterested.length === 0 && (
          <Card className="text-center py-8 shadow-sm">
            <CardContent>
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('interested.noFriendsFound')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
};

export default Interested;
