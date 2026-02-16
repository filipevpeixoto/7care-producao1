/**
 * Push Notification Service
 * Serviço para envio de notificações push
 *
 * TODO: Refatorar para usar pushSubscriptionRepository diretamente
 * Mantido como wrapper temporário para não alterar a lógica existente
 */

import { NeonAdapter } from '../neonAdapter';

// Instância singleton compartilhada
const adapter = new NeonAdapter();

/**
 * Service for sending push notifications to users.
 */
export class PushNotificationService {
  /**
   * Envia push notifications para usuários
   */
  async sendPushNotifications(data: {
    userIds: number[];
    title: string;
    body: string;
    icon?: string;
    url?: string;
  }): Promise<{ sent: number; failed: number }> {
    return adapter.sendPushNotifications(data);
  }
}

/** Singleton instance of the push notification service. */
export const pushNotificationService = new PushNotificationService();
