import sqlite3 from 'sqlite3';
import { URLRecord } from './types';
import { Logger, LogLevel, Log } from '../../logging-middleware/logger';

const logger = Logger.getLogger('db');

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = './urls.db') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.Log('backend', LogLevel.FATAL, 'db', `Failed to connect to database: ${err.message}`);
      } else {
        logger.Log('backend', LogLevel.INFO, 'db', 'Connected to SQLite database');
      }
    });
    this.initTable();
  }

  private initTable(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortCode TEXT UNIQUE NOT NULL,
        originalUrl TEXT NOT NULL,
        validityMinutes INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME,
        accessCount INTEGER DEFAULT 0,
        isActive BOOLEAN DEFAULT 1
      )
    `;

    this.db.run(sql, (err) => {
      if (err) {
        logger.Log('backend', LogLevel.ERROR, 'db', `Failed to create table: ${err.message}`);
      } else {
        logger.Log('backend', LogLevel.INFO, 'db', 'URLs table initialized');
      }
    });
  }

  async createURL(record: Omit<URLRecord, 'id' | 'accessCount' | 'isActive'>): Promise<URLRecord> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO urls (shortCode, originalUrl, validityMinutes, createdAt, expiresAt)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        record.shortCode,
        record.originalUrl,
        record.validityMinutes,
        record.createdAt.toISOString(),
        record.expiresAt?.toISOString()
      ], function(err) {
        if (err) {
          logger.Log('backend', LogLevel.ERROR, 'db', `Failed to create URL: ${err.message}`);
          reject(err);
        } else {
          logger.Log('backend', LogLevel.INFO, 'db', `URL created with shortCode: ${record.shortCode}`);
          resolve({
            id: this.lastID,
            ...record,
            accessCount: 0,
            isActive: true
          });
        }
      });
    });
  }

  async getURLByShortCode(shortCode: string): Promise<URLRecord | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM urls WHERE shortCode = ? AND isActive = 1';
      
      this.db.get(sql, [shortCode], (err, row: any) => {
        if (err) {
          logger.Log('backend', LogLevel.ERROR, 'db', `Failed to get URL: ${err.message}`);
          reject(err);
        } else if (row) {
          resolve({
            id: row.id,
            shortCode: row.shortCode,
            originalUrl: row.originalUrl,
            validityMinutes: row.validityMinutes,
            createdAt: new Date(row.createdAt),
            expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
            accessCount: row.accessCount,
            isActive: row.isActive
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async incrementAccessCount(shortCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE urls SET accessCount = accessCount + 1 WHERE shortCode = ?';
      
      this.db.run(sql, [shortCode], (err) => {
        if (err) {
          logger.Log('backend', LogLevel.ERROR, 'db', `Failed to increment access count: ${err.message}`);
          reject(err);
        } else {
          logger.Log('backend', LogLevel.DEBUG, 'db', `Access count incremented for ${shortCode}`);
          resolve();
        }
      });
    });
  }

  async getAllURLs(): Promise<URLRecord[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM urls WHERE isActive = 1 ORDER BY createdAt DESC';
      
      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          logger.Log('backend', LogLevel.ERROR, 'db', `Failed to get all URLs: ${err.message}`);
          reject(err);
        } else {
          const urls = rows.map(row => ({
            id: row.id,
            shortCode: row.shortCode,
            originalUrl: row.originalUrl,
            validityMinutes: row.validityMinutes,
            createdAt: new Date(row.createdAt),
            expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
            accessCount: row.accessCount,
            isActive: row.isActive
          }));
          resolve(urls);
        }
      });
    });
  }

  async deactivateExpiredURLs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE urls SET isActive = 0 WHERE expiresAt < datetime("now") AND expiresAt IS NOT NULL';
      
      this.db.run(sql, [], (err) => {
        if (err) {
          logger.Log('backend', LogLevel.ERROR, 'db', `Failed to deactivate expired URLs: ${err.message}`);
          reject(err);
        } else {
          logger.Log('backend', LogLevel.INFO, 'db', 'Expired URLs deactivated');
          resolve();
        }
      });
    });
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        logger.Log('backend', LogLevel.ERROR, 'db', `Error closing database: ${err.message}`);
      } else {
        logger.Log('backend', LogLevel.INFO, 'db', 'Database connection closed');
      }
    });
  }
}
