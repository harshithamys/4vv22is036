import { Database } from './database';
import { URLRecord, CreateURLRequest, CreateURLResponse } from './types';
import { Logger, LogLevel, Log } from '../../logging-middleware/logger';

const logger = Logger.getLogger('service');

function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class URLShortenerService {
  private db: Database;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.db = new Database();
    this.baseUrl = baseUrl;
    
    Log('backend', LogLevel.INFO, 'service', 'URL Shortener Service initialized');
    
    setInterval(() => {
      this.cleanupExpiredURLs();
    }, 60000);
  }

  async createShortURL(request: CreateURLRequest): Promise<CreateURLResponse> {
    await Log('backend', LogLevel.INFO, 'service', `Creating short URL for: ${request.originalUrl}`);

    this.validateURL(request.originalUrl);
    
    if (request.validityMinutes && request.validityMinutes <= 0) {
      await Log('backend', LogLevel.WARN, 'service', 'Invalid validity period provided');
      throw new Error('Validity period must be positive');
    }

    let shortCode: string;
    if (request.preferredShortcode) {
      shortCode = request.preferredShortcode;
      const existing = await this.db.getURLByShortCode(shortCode);
      if (existing) {
        await Log('backend', LogLevel.WARN, 'service', `Shortcode ${shortCode} already exists`);
        throw new Error('Shortcode already exists');
      }
    } else {
      shortCode = generateShortCode();
      let attempts = 0;
      while (await this.db.getURLByShortCode(shortCode) && attempts < 10) {
        shortCode = generateShortCode();
        attempts++;
      }
      if (attempts >= 10) {
        await Log('backend', LogLevel.ERROR, 'service', 'Failed to generate unique shortcode');
        throw new Error('Unable to generate unique shortcode');
      }
    }

    const now = new Date();
    const expiresAt = request.validityMinutes 
      ? new Date(now.getTime() + request.validityMinutes * 60000)
      : undefined;

    const record: Omit<URLRecord, 'id' | 'accessCount' | 'isActive'> = {
      shortCode,
      originalUrl: request.originalUrl,
      validityMinutes: request.validityMinutes,
      createdAt: now,
      expiresAt
    };

    await this.db.createURL(record);

    await Log('backend', LogLevel.INFO, 'service', `Short URL created: ${shortCode}`);

    return {
      shortCode,
      shortUrl: `${this.baseUrl}/${shortCode}`,
      originalUrl: request.originalUrl,
      expiresAt: expiresAt?.toISOString()
    };
  }

  async getOriginalURL(shortCode: string): Promise<string | null> {
    await Log('backend', LogLevel.DEBUG, 'service', `Looking up shortCode: ${shortCode}`);

    const record = await this.db.getURLByShortCode(shortCode);
    
    if (!record) {
      await Log('backend', LogLevel.WARN, 'service', `ShortCode not found: ${shortCode}`);
      return null;
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      await Log('backend', LogLevel.WARN, 'service', `ShortCode expired: ${shortCode}`);
      return null;
    }

    await this.db.incrementAccessCount(shortCode);
    await Log('backend', LogLevel.INFO, 'service', `Redirecting ${shortCode} to ${record.originalUrl}`);

    return record.originalUrl;
  }

  async getAllURLStats(): Promise<URLRecord[]> {
    await Log('backend', LogLevel.DEBUG, 'service', 'Fetching all URL statistics');
    return await this.db.getAllURLs();
  }

  private validateURL(url: string): void {
    try {
      new URL(url);
    } catch (error) {
      Log('backend', LogLevel.ERROR, 'service', `Invalid URL format: ${url}`);
      throw new Error('Invalid URL format');
    }
  }

  private async cleanupExpiredURLs(): Promise<void> {
    try {
      await this.db.deactivateExpiredURLs();
      await Log('backend', LogLevel.DEBUG, 'service', 'Cleanup completed');
    } catch (error) {
      await Log('backend', LogLevel.ERROR, 'service', `Cleanup failed: ${error}`);
    }
  }

  close(): void {
    this.db.close();
  }
}
