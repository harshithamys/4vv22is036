"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.globalLogger = exports.Logger = exports.LogLevel = void 0;
exports.Log = Log;
const types_1 = require("./types");
var types_2 = require("./types");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return types_2.LogLevel; } });
const stack_parser_1 = require("./stack-parser");
const formatter_1 = require("./formatter");
const api_client_1 = require("./api-client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Logger {
    constructor(config = {}) {
        var _a, _b, _c;
        this.config = Object.assign({ level: types_1.LogLevel.INFO, format: 'structured', output: 'console', includeStack: true, dateFormat: 'default', apiConfig: {
                endpoint: 'http://20.244.56.144',
                timeout: 5000
            } }, config);
        this.apiClient = new api_client_1.LogApiClient((_a = this.config.apiConfig) === null || _a === void 0 ? void 0 : _a.endpoint, (_b = this.config.apiConfig) === null || _b === void 0 ? void 0 : _b.authToken, (_c = this.config.apiConfig) === null || _c === void 0 ? void 0 : _c.timeout);
    }
    static getLogger(packageName, config) {
        if (!this.instances.has(packageName)) {
            this.instances.set(packageName, new Logger(config));
        }
        return this.instances.get(packageName);
    }
    Log(stack, level, packageName, message, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            if (level < this.config.level) {
                return;
            }
            let stackType;
            if (typeof stack === 'boolean') {
                stackType = this.detectStackType();
            }
            else {
                stackType = stack;
            }
            let stackInfo;
            if (this.config.includeStack) {
                stackInfo = stack_parser_1.StackTraceParser.parseStack(3);
            }
            const entry = {
                timestamp: new Date(),
                level,
                package: packageName,
                message,
                stack: stackInfo,
                metadata
            };
            this.output(entry);
            if (this.config.output === 'api' || this.config.output === 'custom') {
                yield this.sendToApi(stackType, level, packageName, message);
            }
        });
    }
    detectStackType() {
        if (typeof window !== 'undefined') {
            return 'frontend';
        }
        return 'backend';
    }
    sendToApi(stack, level, packageName, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.apiClient.sendLog(stack, level, packageName, message);
                if (result) {
                    console.debug(`Log sent to API successfully. LogID: ${result.logID}`);
                }
            }
            catch (error) {
                console.error('Failed to send log to API:', error);
            }
        });
    }
    debug(packageName_1, message_1, metadata_1) {
        return __awaiter(this, arguments, void 0, function* (packageName, message, metadata, stack = true) {
            yield this.Log(stack, types_1.LogLevel.DEBUG, packageName, message, metadata);
        });
    }
    info(packageName_1, message_1, metadata_1) {
        return __awaiter(this, arguments, void 0, function* (packageName, message, metadata, stack = true) {
            yield this.Log(stack, types_1.LogLevel.INFO, packageName, message, metadata);
        });
    }
    warn(packageName_1, message_1, metadata_1) {
        return __awaiter(this, arguments, void 0, function* (packageName, message, metadata, stack = true) {
            yield this.Log(stack, types_1.LogLevel.WARN, packageName, message, metadata);
        });
    }
    error(packageName_1, message_1, metadata_1) {
        return __awaiter(this, arguments, void 0, function* (packageName, message, metadata, stack = true) {
            yield this.Log(stack, types_1.LogLevel.ERROR, packageName, message, metadata);
        });
    }
    fatal(packageName_1, message_1, metadata_1) {
        return __awaiter(this, arguments, void 0, function* (packageName, message, metadata, stack = true) {
            yield this.Log(stack, types_1.LogLevel.FATAL, packageName, message, metadata);
        });
    }
    configure(config) {
        var _a, _b, _c;
        this.config = Object.assign(Object.assign({}, this.config), config);
        if (config.apiConfig) {
            this.apiClient = new api_client_1.LogApiClient(config.apiConfig.endpoint || ((_a = this.config.apiConfig) === null || _a === void 0 ? void 0 : _a.endpoint), config.apiConfig.authToken || ((_b = this.config.apiConfig) === null || _b === void 0 ? void 0 : _b.authToken), config.apiConfig.timeout || ((_c = this.config.apiConfig) === null || _c === void 0 ? void 0 : _c.timeout));
        }
    }
    setAuthToken(token) {
        this.apiClient.setAuthToken(token);
        if (this.config.apiConfig) {
            this.config.apiConfig.authToken = token;
        }
    }
    getConfig() {
        return Object.assign({}, this.config);
    }
    output(entry) {
        const formattedLog = formatter_1.LogFormatter.format(entry, this.config);
        switch (this.config.output) {
            case 'console':
                this.outputToConsole(formattedLog, entry.level);
                break;
            case 'file':
                this.outputToFile(formattedLog);
                break;
            case 'api':
                break;
            case 'custom':
                if (this.config.customOutput) {
                    this.config.customOutput(formattedLog);
                }
                break;
        }
    }
    outputToConsole(message, level) {
        switch (level) {
            case types_1.LogLevel.DEBUG:
                console.debug(message);
                break;
            case types_1.LogLevel.INFO:
                console.info(message);
                break;
            case types_1.LogLevel.WARN:
                console.warn(message);
                break;
            case types_1.LogLevel.ERROR:
            case types_1.LogLevel.FATAL:
                console.error(message);
                break;
        }
    }
    outputToFile(message) {
        const logDir = path.join(process.cwd(), 'logs');
        const logFile = path.join(logDir, 'application.log');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(logFile, message + '\n');
    }
}
exports.Logger = Logger;
Logger.instances = new Map();
exports.globalLogger = new Logger();
function Log(stack, level, packageName, message, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.globalLogger.Log(stack, level, packageName, message, metadata);
    });
}
