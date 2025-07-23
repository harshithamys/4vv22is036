"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const logger_1 = require("../../logging-middleware/logger");
const logger = logger_1.Logger.getLogger('db');
class Database {
    constructor(dbPath = './urls.db') {
        this.db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                logger.Log('backend', logger_1.LogLevel.FATAL, 'db', `Failed to connect to database: ${err.message}`);
            }
            else {
                logger.Log('backend', logger_1.LogLevel.INFO, 'db', 'Connected to SQLite database');
            }
        });
        this.initTable();
    }
    initTable() {
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
                logger.Log('backend', logger_1.LogLevel.ERROR, 'db', `Failed to create table: ${err.message}`);
            }
            else {
                logger.Log('backend', logger_1.LogLevel.INFO, 'db', 'URLs table initialized');
            }
        });
    }
    createURL(record) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                var _a;
                const sql = `
        INSERT INTO urls (shortCode, originalUrl, validityMinutes, createdAt, expiresAt)
        VALUES (?, ?, ?, ?, ?)
      `;
                this.db.run(sql, [
                    record.shortCode,
                    record.originalUrl,
                    record.validityMinutes,
                    record.createdAt.toISOString(),
                    (_a = record.expiresAt) === null || _a === void 0 ? void 0 : _a.toISOString()
                ], function (err) {
                    if (err) {
                        logger.Log('backend', logger_1.LogLevel.ERROR, 'db', `Failed to create URL: ${err.message}`);
                        reject(err);
                    }
                    else {
                        logger.Log('backend', logger_1.LogLevel.INFO, 'db', `URL created with shortCode: ${record.shortCode}`);
                        resolve(Object.assign(Object.assign({ id: this.lastID }, record), { accessCount: 0, isActive: true }));
                    }
                });
            });
        });
    }
    getURLByShortCode(shortCode) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const sql = 'SELECT * FROM urls WHERE shortCode = ? AND isActive = 1';
                this.db.get(sql, [shortCode], (err, row) => {
                    if (err) {
                        logger.Log('backend', logger_1.LogLevel.ERROR, 'db', `Failed to get URL: ${err.message}`);
                        reject(err);
                    }
                    else if (row) {
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
                    }
                    else {
                        resolve(null);
                    }
                });
            });
        });
    }
    incrementAccessCount(shortCode) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const sql = 'UPDATE urls SET accessCount = accessCount + 1 WHERE shortCode = ?';
                this.db.run(sql, [shortCode], (err) => {
                    if (err) {
                        logger.Log('backend', logger_1.LogLevel.ERROR, 'db', `Failed to increment access count: ${err.message}`);
                        reject(err);
                    }
                    else {
                        logger.Log('backend', logger_1.LogLevel.DEBUG, 'db', `Access count incremented for ${shortCode}`);
                        resolve();
                    }
                });
            });
        });
    }
    getAllURLs() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const sql = 'SELECT * FROM urls WHERE isActive = 1 ORDER BY createdAt DESC';
                this.db.all(sql, [], (err, rows) => {
                    if (err) {
                        logger.Log('backend', logger_1.LogLevel.ERROR, 'db', `Failed to get all URLs: ${err.message}`);
                        reject(err);
                    }
                    else {
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
        });
    }
    deactivateExpiredURLs() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const sql = 'UPDATE urls SET isActive = 0 WHERE expiresAt < datetime("now") AND expiresAt IS NOT NULL';
                this.db.run(sql, [], (err) => {
                    if (err) {
                        logger.Log('backend', logger_1.LogLevel.ERROR, 'db', `Failed to deactivate expired URLs: ${err.message}`);
                        reject(err);
                    }
                    else {
                        logger.Log('backend', logger_1.LogLevel.INFO, 'db', 'Expired URLs deactivated');
                        resolve();
                    }
                });
            });
        });
    }
    close() {
        this.db.close((err) => {
            if (err) {
                logger.Log('backend', logger_1.LogLevel.ERROR, 'db', `Error closing database: ${err.message}`);
            }
            else {
                logger.Log('backend', logger_1.LogLevel.INFO, 'db', 'Database connection closed');
            }
        });
    }
}
exports.Database = Database;
