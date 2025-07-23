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
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLShortenerService = void 0;
const database_1 = require("./database");
const logger_1 = require("../../logging-middleware/logger");
const logger = logger_1.Logger.getLogger('service');
function generateShortCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
class URLShortenerService {
    constructor(baseUrl = 'http://localhost:3001') {
        this.db = new database_1.Database();
        this.baseUrl = baseUrl;
        (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'service', 'URL Shortener Service initialized');
        setInterval(() => {
            this.cleanupExpiredURLs();
        }, 60000);
    }
    createShortURL(request) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'service', `Creating short URL for: ${request.originalUrl}`);
            this.validateURL(request.originalUrl);
            if (request.validityMinutes && request.validityMinutes <= 0) {
                yield (0, logger_1.Log)('backend', logger_1.LogLevel.WARN, 'service', 'Invalid validity period provided');
                throw new Error('Validity period must be positive');
            }
            let shortCode;
            if (request.preferredShortcode) {
                shortCode = request.preferredShortcode;
                const existing = yield this.db.getURLByShortCode(shortCode);
                if (existing) {
                    yield (0, logger_1.Log)('backend', logger_1.LogLevel.WARN, 'service', `Shortcode ${shortCode} already exists`);
                    throw new Error('Shortcode already exists');
                }
            }
            else {
                shortCode = generateShortCode();
                let attempts = 0;
                while ((yield this.db.getURLByShortCode(shortCode)) && attempts < 10) {
                    shortCode = generateShortCode();
                    attempts++;
                }
                if (attempts >= 10) {
                    yield (0, logger_1.Log)('backend', logger_1.LogLevel.ERROR, 'service', 'Failed to generate unique shortcode');
                    throw new Error('Unable to generate unique shortcode');
                }
            }
            const now = new Date();
            const expiresAt = request.validityMinutes
                ? new Date(now.getTime() + request.validityMinutes * 60000)
                : undefined;
            const record = {
                shortCode,
                originalUrl: request.originalUrl,
                validityMinutes: request.validityMinutes,
                createdAt: now,
                expiresAt
            };
            yield this.db.createURL(record);
            yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'service', `Short URL created: ${shortCode}`);
            return {
                shortCode,
                shortUrl: `${this.baseUrl}/${shortCode}`,
                originalUrl: request.originalUrl,
                expiresAt: expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toISOString()
            };
        });
    }
    getOriginalURL(shortCode) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, logger_1.Log)('backend', logger_1.LogLevel.DEBUG, 'service', `Looking up shortCode: ${shortCode}`);
            const record = yield this.db.getURLByShortCode(shortCode);
            if (!record) {
                yield (0, logger_1.Log)('backend', logger_1.LogLevel.WARN, 'service', `ShortCode not found: ${shortCode}`);
                return null;
            }
            if (record.expiresAt && record.expiresAt < new Date()) {
                yield (0, logger_1.Log)('backend', logger_1.LogLevel.WARN, 'service', `ShortCode expired: ${shortCode}`);
                return null;
            }
            yield this.db.incrementAccessCount(shortCode);
            yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'service', `Redirecting ${shortCode} to ${record.originalUrl}`);
            return record.originalUrl;
        });
    }
    getAllURLStats() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, logger_1.Log)('backend', logger_1.LogLevel.DEBUG, 'service', 'Fetching all URL statistics');
            return yield this.db.getAllURLs();
        });
    }
    validateURL(url) {
        try {
            new URL(url);
        }
        catch (error) {
            (0, logger_1.Log)('backend', logger_1.LogLevel.ERROR, 'service', `Invalid URL format: ${url}`);
            throw new Error('Invalid URL format');
        }
    }
    cleanupExpiredURLs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db.deactivateExpiredURLs();
                yield (0, logger_1.Log)('backend', logger_1.LogLevel.DEBUG, 'service', 'Cleanup completed');
            }
            catch (error) {
                yield (0, logger_1.Log)('backend', logger_1.LogLevel.ERROR, 'service', `Cleanup failed: ${error}`);
            }
        });
    }
    close() {
        this.db.close();
    }
}
exports.URLShortenerService = URLShortenerService;
