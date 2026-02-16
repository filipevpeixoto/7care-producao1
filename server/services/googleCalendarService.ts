/**
 * Google Calendar Service
 *
 * Gerencia autenticação OAuth2, sincronização de eventos e mapeamento de campos
 * entre Google Calendar API e o sistema 7Care.
 */

import { google, type calendar_v3, type Auth } from 'googleapis';
import crypto from 'crypto';
import type { NeonAdapter } from '../neonAdapter';
import { logger } from '../utils/logger';

// ============================================
// TYPES & INTERFACES
// ============================================

/** Encrypted OAuth2 tokens for a user's Google Calendar connection. */
export interface GoogleCalendarTokens {
  userId: number;
  districtId?: number;
  accessToken: string; // Encrypted
  refreshToken: string; // Encrypted
  expiresAt: Date;
  scope: string;
}

/** User-specific configuration for Google Calendar sync behavior. */
export interface GoogleCalendarConfig {
  userId: number;
  calendarId: string;
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSync?: string;
}

/** Result of a Google Calendar event synchronization operation. */
export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

/** Summary information about a Google Calendar. */
export interface CalendarInfo {
  id: string;
  name: string;
  description?: string;
  primary: boolean;
}

// ============================================
// ENCRYPTION UTILITIES
// ============================================

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================
// COLOR MAPPING
// ============================================

// Mapeia colorId do Google Calendar para hex colors
const GOOGLE_COLOR_MAP: Record<string, string> = {
  '1': '#a4bdfc', // Lavender
  '2': '#7ae7bf', // Sage
  '3': '#dbadff', // Grape
  '4': '#ff887c', // Flamingo
  '5': '#fbd75b', // Banana
  '6': '#ffb878', // Tangerine
  '7': '#46d6db', // Peacock
  '8': '#e1e1e1', // Graphite
  '9': '#5484ed', // Blueberry
  '10': '#51b749', // Basil
  '11': '#dc2127', // Tomato
};

// Mapeia palavras-chave no título/descrição para tipos de evento
function categorizeEvent(summary: string, description?: string): string {
  const text = `${summary} ${description || ''}`.toLowerCase();

  if (text.includes('culto') || text.includes('worship')) return 'culto';
  if (text.includes('estudo') || text.includes('bible study')) return 'estudo_biblico';
  if (text.includes('reuni') || text.includes('meeting')) return 'reuniao';
  if (text.includes('batismo') || text.includes('baptism')) return 'batismo';
  if (text.includes('santa ceia') || text.includes('communion')) return 'santa_ceia';
  if (text.includes('visita') || text.includes('visit')) return 'visita';

  return 'evento_especial';
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

/**
 * Service for OAuth2 authentication and event synchronization with Google Calendar.
 */
export class GoogleCalendarService {
  private oauth2Client: Auth.OAuth2Client;
  private storage: NeonAdapter;

  constructor(storage: NeonAdapter) {
    this.storage = storage;

    const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      throw new Error('Google Calendar credentials not configured. Check .env file.');
    }

    this.oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  }

  // ============================================
  // OAUTH2 AUTHENTICATION
  // ============================================

  /**
   * Gera URL de autorização OAuth2 com state token (CSRF protection)
   */
  async getAuthUrl(userId: number): Promise<{ authUrl: string; state: string }> {
    // Generate random state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state temporarily (valid for 10 minutes)
    await this.storage.saveSystemConfig(`google_oauth_state_${userId}`, {
      state,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      state: `${userId}:${state}`,
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return { authUrl, state };
  }

  /**
   * Troca authorization code por tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<{ userId: number }> {
    // Validate state token
    const [userIdStr, stateToken] = state.split(':');
    const userId = parseInt(userIdStr, 10);

    if (isNaN(userId)) {
      throw new Error('Invalid state token');
    }

    const savedState = (await this.storage.getSystemConfig(`google_oauth_state_${userId}`)) as {
      state?: string;
      expiresAt?: string;
    } | null;

    if (!savedState || savedState.state !== stateToken) {
      throw new Error('Invalid or expired state token (CSRF protection)');
    }

    // Check expiration
    if (savedState.expiresAt && new Date(savedState.expiresAt) < new Date()) {
      throw new Error('State token expired');
    }

    // Exchange code for tokens
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens from Google');
    }

    // Get user's district
    const user = await this.storage.getUserById(userId);

    // Save encrypted tokens
    await this.saveTokens(userId, {
      userId,
      districtId: user?.districtId || undefined,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
      scope: tokens.scope || 'https://www.googleapis.com/auth/calendar.readonly',
    });

    // Clean up state token
    await this.storage.deleteSystemConfig(`google_oauth_state_${userId}`);

    return { userId };
  }

  /**
   * Atualiza access token usando refresh token
   */
  async refreshAccessToken(userId: number): Promise<void> {
    const tokens = await this.loadTokens(userId);

    if (!tokens) {
      throw new Error('No tokens found for user');
    }

    // Set refresh token
    this.oauth2Client.setCredentials({
      refresh_token: decrypt(tokens.refreshToken),
    });

    // Refresh access token
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    // Update tokens
    await this.updateTokens(userId, {
      accessToken: encrypt(credentials.access_token),
      expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
    });
  }

  /**
   * Revoga acesso e remove tokens
   */
  async revokeAccess(userId: number): Promise<void> {
    const tokens = await this.loadTokens(userId);

    if (tokens) {
      try {
        // Revoke tokens on Google
        this.oauth2Client.setCredentials({
          access_token: decrypt(tokens.accessToken),
        });
        await this.oauth2Client.revokeToken(decrypt(tokens.accessToken));
      } catch (error) {
        logger.error('Error revoking Google token:', error);
        // Continue anyway to clean up local tokens
      }
    }

    // Delete local tokens
    await this.deleteTokens(userId);

    // Delete config
    await this.storage.deleteSystemConfig(`google_calendar_config_${userId}`);
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  private async saveTokens(userId: number, tokens: GoogleCalendarTokens): Promise<void> {
    await this.storage.saveGoogleCalendarTokens(userId, tokens);
  }

  private async loadTokens(userId: number): Promise<GoogleCalendarTokens | null> {
    return this.storage.getGoogleCalendarTokens(userId);
  }

  private async updateTokens(userId: number, tokens: Partial<GoogleCalendarTokens>): Promise<void> {
    await this.storage.updateGoogleCalendarTokens(userId, tokens);
  }

  private async deleteTokens(userId: number): Promise<void> {
    await this.storage.deleteGoogleCalendarTokens(userId);
  }

  /**
   * Configura OAuth client com tokens do usuário e renova se necessário
   */
  private async setupOAuthClient(userId: number): Promise<void> {
    const tokens = await this.loadTokens(userId);

    if (!tokens) {
      throw new Error('User not connected to Google Calendar');
    }

    // Check if token is expired (with 5 min buffer)
    const now = new Date();
    const expiresAt = new Date(tokens.expiresAt);
    const shouldRefresh = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

    if (shouldRefresh) {
      await this.refreshAccessToken(userId);
      const refreshedTokens = await this.loadTokens(userId);
      if (!refreshedTokens) {
        throw new Error('Failed to refresh tokens');
      }
      tokens.accessToken = refreshedTokens.accessToken;
    }

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: decrypt(tokens.accessToken),
      refresh_token: decrypt(tokens.refreshToken),
    });
  }

  // ============================================
  // CALENDAR OPERATIONS
  // ============================================

  /**
   * Lista calendários disponíveis do usuário
   */
  async listCalendars(userId: number): Promise<CalendarInfo[]> {
    await this.setupOAuthClient(userId);

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.calendarList.list();

    return (response.data.items || []).map(cal => ({
      id: cal.id || '',
      name: cal.summary || '',
      description: cal.description || undefined,
      primary: cal.primary || false,
    }));
  }

  /**
   * Sincroniza eventos do Google Calendar para o 7Care
   */
  async syncEvents(userId: number, calendarId: string): Promise<SyncResult> {
    await this.setupOAuthClient(userId);

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    // Get user info for churchId and districtId
    const user = await this.storage.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const result: SyncResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // List events from today onwards
      const now = new Date();
      const response = await calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      for (const googleEvent of events) {
        try {
          await this.syncSingleEvent(
            googleEvent,
            userId,
            user.churchId ?? undefined,
            user.districtId ?? undefined
          );

          // Check if it's new or updated
          const existing = await this.storage.getEventByGoogleId(googleEvent.id || '');
          if (existing) {
            result.updated++;
          } else {
            result.imported++;
          }
        } catch (error) {
          result.errors?.push(
            `Error syncing event "${googleEvent.summary}": ${(error as Error).message}`
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to sync events: ${error.message}`, { cause: error });
      }
      throw new Error(`Failed to sync events: ${String(error)}`, { cause: error });
    }

    // Update last sync time
    await this.storage.saveGoogleCalendarConfig(userId, {
      userId,
      calendarId,
      lastSync: new Date().toISOString(),
    } as GoogleCalendarConfig);

    return result;
  }

  /**
   * Sincroniza um único evento
   */
  private async syncSingleEvent(
    googleEvent: calendar_v3.Schema$Event,
    userId: number,
    churchId?: number,
    districtId?: number
  ): Promise<void> {
    if (!googleEvent.summary || !googleEvent.start) {
      return; // Skip events without title or start time
    }

    // Map Google event to 7Care event
    const event7Care = {
      title: googleEvent.summary,
      description: googleEvent.description || '',
      date: googleEvent.start.dateTime || googleEvent.start.date || new Date().toISOString(),
      endDate: googleEvent.end?.dateTime || googleEvent.end?.date || undefined,
      location: googleEvent.location || '',
      type: categorizeEvent(googleEvent.summary, googleEvent.description || undefined),
      color: googleEvent.colorId ? GOOGLE_COLOR_MAP[googleEvent.colorId] || '#3b82f6' : '#3b82f6',
      isRecurring: !!googleEvent.recurrence,
      recurrencePattern: googleEvent.recurrence?.join(';') || undefined,
      createdBy: userId,
      churchId: churchId || undefined,
      districtId: districtId || undefined,
      googleCalendarEventId: googleEvent.id || '',
      syncSource: 'google_calendar' as const,
      lastSyncedAt: new Date(),
    };

    // Check if event already exists
    const existing = await this.storage.getEventByGoogleId(googleEvent.id || '');

    if (existing) {
      // Update existing event
      await this.storage.updateEvent(existing.id, event7Care);
    } else {
      // Create new event
      await this.storage.createEvent(event7Care);
    }
  }

  // ============================================
  // STATUS & CONFIG
  // ============================================

  /**
   * Retorna status de conexão do usuário
   */
  async getConnectionStatus(userId: number): Promise<{
    connected: boolean;
    email?: string;
    lastSync?: string;
  }> {
    const tokens = await this.loadTokens(userId);

    if (!tokens) {
      return { connected: false };
    }

    // Try to get user email from Google
    try {
      await this.setupOAuthClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const settings = await calendar.settings.get({ setting: 'timezone' });

      // Get config for last sync
      const config = await this.storage.getGoogleCalendarConfig(userId);

      return {
        connected: true,
        email: settings.data.value || undefined,
        lastSync: config?.lastSync,
      };
    } catch (error) {
      return { connected: false };
    }
  }
}

export default GoogleCalendarService;
