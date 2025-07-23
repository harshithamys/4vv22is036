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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const service_1 = require("./service");
const logger_1 = require("../../logging-middleware/logger");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const logger = logger_1.Logger.getLogger('server');
const urlService = new service_1.URLShortenerService(BASE_URL);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', `${req.method} ${req.path}`);
    next();
});
app.post('/api/shorten', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', 'Processing URL shortening request');
        const { urls } = req.body;
        if (!urls || !Array.isArray(urls)) {
            yield (0, logger_1.Log)('backend', logger_1.LogLevel.WARN, 'handler', 'Invalid request body - urls array required');
            return res.status(400).json({ error: 'urls array is required' });
        }
        if (urls.length > 5) {
            yield (0, logger_1.Log)('backend', logger_1.LogLevel.WARN, 'handler', `Too many URLs requested: ${urls.length}`);
            return res.status(400).json({ error: 'Maximum 5 URLs allowed' });
        }
        const results = [];
        for (const urlRequest of urls) {
            try {
                const result = yield urlService.createShortURL(urlRequest);
                results.push(result);
            }
            catch (error) {
                yield (0, logger_1.Log)('backend', logger_1.LogLevel.ERROR, 'handler', `Failed to create short URL: ${error}`);
                results.push({
                    error: error instanceof Error ? error.message : 'Unknown error',
                    originalUrl: urlRequest.originalUrl
                });
            }
        }
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', `Successfully processed ${results.length} URLs`);
        res.json({ results });
    }
    catch (error) {
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.ERROR, 'handler', `Unexpected error: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
app.get('/api/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', 'Fetching URL statistics');
        const urls = yield urlService.getAllURLStats();
        const stats = urls.map(url => {
            var _a;
            return ({
                shortCode: url.shortCode,
                shortUrl: `${BASE_URL}/${url.shortCode}`,
                originalUrl: url.originalUrl,
                createdAt: url.createdAt.toISOString(),
                expiresAt: (_a = url.expiresAt) === null || _a === void 0 ? void 0 : _a.toISOString(),
                accessCount: url.accessCount,
                isActive: url.isActive
            });
        });
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', `Returning ${stats.length} URL statistics`);
        res.json({ stats });
    }
    catch (error) {
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.ERROR, 'handler', `Error fetching stats: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
app.get('/:shortCode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { shortCode } = req.params;
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', `Redirect request for: ${shortCode}`);
        const originalUrl = yield urlService.getOriginalURL(shortCode);
        if (!originalUrl) {
            yield (0, logger_1.Log)('backend', logger_1.LogLevel.WARN, 'handler', `Short URL not found: ${shortCode}`);
            return res.status(404).json({ error: 'Short URL not found or expired' });
        }
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', `Redirecting to: ${originalUrl}`);
        res.redirect(originalUrl);
    }
    catch (error) {
        yield (0, logger_1.Log)('backend', logger_1.LogLevel.ERROR, 'handler', `Redirect error: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
app.use((req, res) => {
    (0, logger_1.Log)('backend', logger_1.LogLevel.WARN, 'handler', `404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Route not found' });
});
app.use((error, req, res, next) => {
    (0, logger_1.Log)('backend', logger_1.LogLevel.ERROR, 'handler', `Unhandled error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(PORT, () => {
    (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', `Server running on port ${PORT}`);
});
process.on('SIGINT', () => {
    (0, logger_1.Log)('backend', logger_1.LogLevel.INFO, 'handler', 'Shutting down server...');
    urlService.close();
    process.exit(0);
});
