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
exports.LogApiClient = void 0;
const types_1 = require("./types");
const axios_1 = __importDefault(require("axios"));
class LogApiClient {
    constructor(baseUrl = 'http://20.244.56.144', authToken, timeout = 5000) {
        this.baseUrl = baseUrl;
        this.authToken = authToken;
        this.timeout = timeout;
    }
    logLevelToString(level) {
        switch (level) {
            case types_1.LogLevel.DEBUG:
                return 'debug';
            case types_1.LogLevel.INFO:
                return 'info';
            case types_1.LogLevel.WARN:
                return 'warn';
            case types_1.LogLevel.ERROR:
                return 'error';
            case types_1.LogLevel.FATAL:
                return 'fatal';
            default:
                return 'info';
        }
    }
    validatePackageForStack(stack, packageName) {
        const backendPackages = ['cache', 'controller', 'cron job', 'db', 'domain', 'handler', 'repository', 'route', 'service'];
        const frontendPackages = ['api', 'component', 'hook', 'page', 'state', 'style'];
        const sharedPackages = ['auth', 'config', 'middleware', 'utils'];
        if (sharedPackages.includes(packageName)) {
            return true;
        }
        if (stack === 'backend') {
            return backendPackages.includes(packageName);
        }
        if (stack === 'frontend') {
            return frontendPackages.includes(packageName);
        }
        return false;
    }
    sendLog(stack, level, packageName, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.validatePackageForStack(stack, packageName)) {
                    console.error(`Package '${packageName}' is not valid for stack '${stack}'`);
                    return null;
                }
                const logRequest = {
                    stack,
                    level: this.logLevelToString(level),
                    package: packageName,
                    message
                };
                const headers = {
                    'Content-Type': 'application/json',
                };
                if (this.authToken) {
                    headers['Authorization'] = `Bearer ${this.authToken}`;
                }
                const response = yield axios_1.default.post(`${this.baseUrl}/evaluation-service/log`, logRequest, {
                    headers,
                    timeout: this.timeout
                });
                return response.data;
            }
            catch (error) {
                if (error.response) {
                    console.error(`Log API request failed: ${error.response.status} ${error.response.statusText}`);
                }
                else if (error instanceof Error) {
                    console.error(`Failed to send log to API: ${error.message}`);
                }
                else {
                    console.error('Failed to send log to API: Unknown error');
                }
                return null;
            }
        });
    }
    setAuthToken(token) {
        this.authToken = token;
    }
    setBaseUrl(url) {
        this.baseUrl = url;
    }
    setTimeout(timeout) {
        this.timeout = timeout;
    }
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.post(`${this.baseUrl}/evaluation-service/log`, {
                    stack: 'backend',
                    level: 'info',
                    package: 'utils',
                    message: 'Connection test'
                }, {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                return response.status !== 404;
            }
            catch (error) {
                return ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) !== 404;
            }
        });
    }
}
exports.LogApiClient = LogApiClient;
