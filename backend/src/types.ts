export interface URLRecord {
  id?: number;
  shortCode: string;
  originalUrl: string;
  validityMinutes?: number;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  isActive: boolean;
}

export interface CreateURLRequest {
  originalUrl: string;
  validityMinutes?: number;
  preferredShortcode?: string;
}

export interface CreateURLResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  expiresAt?: string;
}

export interface StatsResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt?: string;
  accessCount: number;
  isActive: boolean;
}
