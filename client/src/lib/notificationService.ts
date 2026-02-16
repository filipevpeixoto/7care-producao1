// Serviço para gerenciar notificações automáticas do sistema
import { createLogger } from '@/lib/logger';

const notifLogger = createLogger('Notifications');

export interface NotificationData {
  title: string;
  message: string;
  type: 'general' | 'announcement' | 'reminder' | 'urgent';
  userId?: number;
}

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Enviar notificação para um usuário específico ou todos
  async sendNotification(data: NotificationData): Promise<boolean> {
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const result = await response.json();
      notifLogger.debug('Notificação enviada:', result);
      return true;
    } catch (error) {
      notifLogger.error('Erro ao enviar notificação:', error);
      return false;
    }
  }

  // Notificações para tarefas
  async notifyTaskCreated(taskTitle: string, assignedUserId?: number): Promise<void> {
    await this.sendNotification({
      title: 'Nova Tarefa Criada',
      message: `Uma nova tarefa foi criada: ${taskTitle}`,
      type: 'reminder',
      userId: assignedUserId
    });
  }

  async notifyTaskDue(taskTitle: string, assignedUserId: number): Promise<void> {
    await this.sendNotification({
      title: 'Tarefa Vencendo',
      message: `A tarefa "${taskTitle}" está próxima do vencimento`,
      type: 'reminder',
      userId: assignedUserId
    });
  }

  async notifyTaskOverdue(taskTitle: string, assignedUserId: number): Promise<void> {
    await this.sendNotification({
      title: 'Tarefa Atrasada',
      message: `A tarefa "${taskTitle}" está atrasada`,
      type: 'urgent',
      userId: assignedUserId
    });
  }

  // Notificações para eventos do calendário
  async notifyEventCreated(eventTitle: string, eventDate: string): Promise<void> {
    await this.sendNotification({
      title: 'Novo Evento Criado',
      message: `Um novo evento foi criado: ${eventTitle} em ${eventDate}`,
      type: 'announcement'
    });
  }

  async notifyEventReminder(eventTitle: string, eventDate: string, minutesBefore: number): Promise<void> {
    await this.sendNotification({
      title: 'Lembrete de Evento',
      message: `O evento "${eventTitle}" acontece em ${minutesBefore} minutos (${eventDate})`,
      type: 'reminder'
    });
  }

  // Notificações para aniversários
  async notifyBirthday(userName: string): Promise<void> {
    await this.sendNotification({
      title: '🎉 Aniversário Hoje!',
      message: `Hoje é aniversário de ${userName}! Vamos celebrar!`,
      type: 'announcement'
    });
  }

  // Notificações para visitas
  async notifyVisitReminder(personName: string, assignedUserId: number): Promise<void> {
    await this.sendNotification({
      title: 'Lembrete de Visita',
      message: `Não esqueça da visita para ${personName}`,
      type: 'reminder',
      userId: assignedUserId
    });
  }

  // Notificações para check-ins espirituais
  async notifySpiritualCheckIn(userName: string): Promise<void> {
    await this.sendNotification({
      title: 'Check-in Espiritual',
      message: `${userName} fez um check-in espiritual. Vamos acompanhar!`,
      type: 'general'
    });
  }

  // Notificações para pontos/gamificação
  async notifyPointsEarned(userName: string, points: number, reason: string): Promise<void> {
    await this.sendNotification({
      title: 'Pontos Conquistados!',
      message: `${userName} ganhou ${points} pontos por: ${reason}`,
      type: 'general'
    });
  }

  // Notificações para novos usuários
  async notifyNewUser(userName: string): Promise<void> {
    await this.sendNotification({
      title: 'Novo Membro',
      message: `${userName} se juntou à nossa comunidade!`,
      type: 'announcement'
    });
  }

  // Notificações para mensagens/chat
  async notifyNewMessage(senderName: string, messagePreview: string, recipientUserId: number): Promise<void> {
    await this.sendNotification({
      title: `Nova mensagem de ${senderName}`,
      message: messagePreview,
      type: 'general',
      userId: recipientUserId
    });
  }

  // Notificações de sistema
  async notifySystemMaintenance(): Promise<void> {
    await this.sendNotification({
      title: 'Manutenção do Sistema',
      message: 'O sistema passará por manutenção em breve. Salve seu trabalho.',
      type: 'urgent'
    });
  }

  async notifySystemUpdate(): Promise<void> {
    await this.sendNotification({
      title: 'Atualização do Sistema',
      message: 'Uma nova versão do sistema está disponível com melhorias!',
      type: 'announcement'
    });
  }
}

// Exportar instância singleton
export const notificationService = NotificationService.getInstance();

