import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  Send,
  RefreshCw,
  Users,
  AlertCircle,
  TrendingUp,
  Zap,
  Smile,
  Image,
  Mic,
  Play,
  Pause,
  Trash2,
  X,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { hasAdminAccess } from '@/lib/permissions';

// Service Worker agora atualiza automaticamente via main.tsx

export default function PushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [selectedUserId, setSelectedUserId] = useState<number | string | null>('all');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para mídia rica
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Refs para áudio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !hasAdminAccess(user)) return;
    loadUsers();
    loadSubscriptions();
  }, [user]);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return;
      const data = await res.json();
      // A API pode retornar { data: [], pagination: {} }, { users: [] } ou array diretamente
      const users = Array.isArray(data) ? data : data?.data || data?.users || [];
      setUsersList(users);
    } catch {}
  };

  const loadSubscriptions = async () => {
    try {
      const res = await fetch('/api/push/subscriptions');
      if (!res.ok) return;
      const data = await res.json();
      const allSubscriptions = data.subscriptions || data || [];

      // Agrupar por usuário (mostrar apenas o mais recente de cada)
      const userMap = new Map();
      allSubscriptions.forEach((sub: { user_id: number; created_at: string }) => {
        if (
          !userMap.has(sub.user_id) ||
          new Date(sub.created_at) > new Date(userMap.get(sub.user_id).created_at)
        ) {
          userMap.set(sub.user_id, sub);
        }
      });

      const uniqueSubscriptions = Array.from(userMap.values());
      setSubscriptionsList(uniqueSubscriptions);
    } catch {}
  };

  // Emojis populares
  const POPULAR_EMOJIS = [
    '😀',
    '😊',
    '😂',
    '🤗',
    '😍',
    '🥰',
    '😎',
    '🤩',
    '🥳',
    '🎉',
    '❤️',
    '💕',
    '💖',
    '💯',
    '🔥',
    '✨',
    '🌟',
    '🙏',
    '👍',
    '👏',
    '🎊',
    '🎈',
    '🎁',
    '🎂',
    '🍰',
    '☕',
    '🍕',
    '🎵',
    '🎶',
    '📱',
  ];

  // Funções de emoji
  const insertEmoji = (emoji: string) => {
    setNotificationMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Funções de imagem
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 5MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Funções de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: '🎤 Gravando...',
        description: 'Clique novamente para parar a gravação',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gravar',
        description: 'Não foi possível acessar o microfone',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      toast({
        title: '✅ Gravação concluída',
        description: 'Áudio pronto para envio',
      });
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
      }
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }
  };

  const pauseAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  const removeAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlayingAudio(false);
  };

  // Função para desativar/ativar subscription
  const toggleSubscription = async (subscriptionId: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/push/subscriptions/${subscriptionId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) {
        throw new Error('Falha ao atualizar subscription');
      }

      toast({
        title: isActive ? '🔕 Subscription desativada' : '🔔 Subscription ativada',
        description: isActive
          ? 'Usuário não receberá mais notificações'
          : 'Usuário voltará a receber notificações',
      });

      // Recarregar lista
      loadSubscriptions();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  // Função para excluir subscription
  const deleteSubscription = async (subscriptionId: number, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a subscription de ${userName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/push/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Falha ao excluir subscription');
      }

      toast({
        title: '🗑️ Subscription excluída',
        description: `${userName} foi removido das notificações`,
      });

      // Recarregar lista
      loadSubscriptions();
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título e mensagem',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Preparar payload JSON com informações de mídia
      const payload: any = {
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        userId: selectedUserId === 'all' ? null : Number(selectedUserId),
        hasImage: !!selectedImage,
        hasAudio: !!audioBlob,
        imageName: selectedImage?.name || null,
        audioSize: audioBlob?.size || null,
      };

      // Converter áudio para Base64 se houver
      if (audioBlob) {
        const audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        payload.audioData = audioBase64;

        console.log('🎵 Áudio convertido para Base64:', {
          size: audioBlob.size,
          type: audioBlob.type,
          base64Length: audioBase64.length,
        });
      }

      // Converter imagem para Base64 se houver
      if (selectedImage) {
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });
        payload.imageData = imageBase64;

        console.log('📷 Imagem convertida para Base64:', {
          name: selectedImage.name,
          size: selectedImage.size,
          type: selectedImage.type,
          base64Length: imageBase64.length,
        });
      }

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Falha ao enviar notificação');
      }

      const data = await res.json();

      toast({
        title: '🎉 Notificação enviada!',
        description: `Enviada para ${data.sentTo || subscriptionsList.length} usuário(s)`,
      });

      // Limpar formulário
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationType('general');
      setSelectedUserId('all');
      setShowNotificationModal(false);
      removeImage();
      removeAudio();
      setShowEmojiPicker(false);
    } catch (_e) {
      toast({
        title: 'Erro ao enviar',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !hasAdminAccess(user)) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
          <Card className="max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Acesso Restrito
              </h3>
              <p className="text-sm text-gray-600">Esta página é exclusiva para administradores.</p>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 p-4 md:p-6">
        {/* Header com gradiente */}
        <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Notificações Push</h1>
            </div>
            <p className="text-blue-100">Envie notificações para todos os usuários</p>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Subscriptions Ativas
                  </p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {subscriptionsList.length}
                  </p>
                </div>
                <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-xl">
                  <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Usuários Cadastrados
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {usersList.length}
                  </p>
                </div>
                <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Taxa de Cobertura
                  </p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {usersList.length > 0
                      ? Math.round((subscriptionsList.length / usersList.length) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <div className="p-4 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                  <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de ação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button
            onClick={() => setShowNotificationModal(true)}
            size="lg"
            className="h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-lg font-semibold"
          >
            <Bell className="h-6 w-6 mr-3" />
            Nova Notificação
          </Button>
          <Button
            onClick={loadSubscriptions}
            variant="outline"
            size="lg"
            className="h-16 border-2 hover:bg-gray-50 transition-all duration-300 text-lg font-semibold"
          >
            <RefreshCw className="h-6 w-6 mr-3" />
            Atualizar Lista
          </Button>
        </div>

        {/* Lista de subscriptions */}
        {subscriptionsList.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Subscriptions Ativas ({subscriptionsList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subscriptionsList.map((subscription, index) => {
                  const isActive = subscription.is_active !== false; // Por padrão, considerar ativo

                  // Extrair informação do dispositivo do user_agent ou endpoint
                  const getDeviceInfo = () => {
                    const ua = subscription.user_agent || '';

                    // Detectar dispositivo
                    if (ua.includes('iPhone') || ua.includes('iPad')) {
                      return { icon: '📱', name: 'iOS' };
                    }
                    if (ua.includes('Android')) return { icon: '📱', name: 'Android' };
                    if (ua.includes('Windows')) return { icon: '💻', name: 'Windows' };
                    if (ua.includes('Macintosh') || ua.includes('Mac OS')) {
                      return { icon: '💻', name: 'macOS' };
                    }
                    if (ua.includes('Linux')) return { icon: '💻', name: 'Linux' };

                    // Detectar navegador se não conseguir detectar dispositivo
                    if (ua.includes('Chrome')) return { icon: '🌐', name: 'Chrome' };
                    if (ua.includes('Safari')) return { icon: '🌐', name: 'Safari' };
                    if (ua.includes('Firefox')) return { icon: '🌐', name: 'Firefox' };
                    if (ua.includes('Edge')) return { icon: '🌐', name: 'Edge' };

                    return { icon: '📱', name: 'Dispositivo' };
                  };

                  const device = getDeviceInfo();

                  return (
                    <div
                      key={subscription.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {subscription.user_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {subscription.user_name}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-medium rounded-full flex items-center gap-1">
                              <span>{device.icon}</span>
                              <span>{device.name}</span>
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">{subscription.user_email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-400">
                          {new Date(subscription.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteSubscription(subscription.id, subscription.user_name)
                          }
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={isActive}
                          onCheckedChange={checked => toggleSubscription(subscription.id, isActive)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de envio */}
        <DialogWithModalTracking
          modalId="push-notification-modal"
          open={showNotificationModal}
          onOpenChange={setShowNotificationModal}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Bell className="h-6 w-6 text-blue-600" />
                Nova Notificação Rica
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Título */}
              <div>
                <Label className="text-sm font-semibold">Título da Notificação</Label>
                <Input
                  value={notificationTitle}
                  onChange={e => setNotificationTitle(e.target.value)}
                  placeholder="Ex: Novo evento esta semana!"
                  className="mt-1.5"
                />
              </div>

              {/* Mensagem com emoji picker */}
              <div>
                <Label className="text-sm font-semibold flex items-center justify-between">
                  <span>Mensagem</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="h-8 px-2"
                  >
                    <Smile className="h-4 w-4 mr-1" />
                    Emojis
                  </Button>
                </Label>

                {showEmojiPicker && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_EMOJIS.map((emoji, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="text-2xl hover:bg-white p-2 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  value={notificationMessage}
                  onChange={e => setNotificationMessage(e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  className="mt-1.5 min-h-[100px]"
                />
              </div>

              {/* Upload de imagem */}
              <div>
                <Label className="text-sm font-semibold">Imagem (opcional)</Label>
                <div className="mt-1.5">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeImage}
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <Image className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Clique para selecionar uma imagem</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG até 5MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Gravação de áudio */}
              <div>
                <Label className="text-sm font-semibold">Áudio (opcional)</Label>
                <div className="mt-1.5 space-y-2">
                  {audioUrl ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={isPlayingAudio ? pauseAudio : playAudio}
                      >
                        {isPlayingAudio ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Áudio gravado</p>
                        <p className="text-xs text-gray-500">Clique para ouvir</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={removeAudio}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant={isRecording ? 'destructive' : 'outline'}
                      onClick={isRecording ? stopRecording : startRecording}
                      className="w-full"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      {isRecording ? 'Parar Gravação' : 'Gravar Áudio'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Tipo e destinatário */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Tipo</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">📢 Geral</SelectItem>
                      <SelectItem value="announcement">📣 Anúncio</SelectItem>
                      <SelectItem value="reminder">⏰ Lembrete</SelectItem>
                      <SelectItem value="urgent">🚨 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Destinatário</Label>
                  <Select
                    value={String(selectedUserId)}
                    onValueChange={val => setSelectedUserId(val === 'all' ? 'all' : Number(val))}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">👥 Todos ({subscriptionsList.length})</SelectItem>
                      {subscriptionsList.map(sub => (
                        <SelectItem key={sub.id} value={String(sub.user_id)}>
                          {sub.user_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowNotificationModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={sendNotification}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Notificação
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogWithModalTracking>
      </div>
    </MobileLayout>
  );
}
