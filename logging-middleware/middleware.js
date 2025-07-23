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
exports.GenericMiddleware = exports.HttpLoggingMiddleware = void 0;
const logger_1 = require("./logger");
/**
 * HTTP request logging middleware for Express.js
 */
class HttpLoggingMiddleware {
    constructor(packageName = 'http-middleware', logger) {
        this.packageName = packageName;
        this.logger = logger || logger_1.Logger.getLogger(packageName);
    }
    /**
     * Express middleware function for request/response logging
     * @returns Express middleware function
     */
    middleware() {
        return (req, res, next) => {
            const start = Date.now();
            const requestId = this.generateRequestId();
            // Log incoming request
            this.logger.Log(false, logger_1.LogLevel.INFO, this.packageName, `Incoming ${req.method} ${req.path}`, {
                requestId,
                method: req.method,
                path: req.path,
                query: req.query,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                timestamp: new Date().toISOString()
            });
            // Override res.end to log response
            const originalEnd = res.end;
            res.end = function (chunk, encoding) {
                const duration = Date.now() - start;
                // Determine log level based on status code
                const level = res.statusCode >= 400 ? logger_1.LogLevel.ERROR : logger_1.LogLevel.INFO;
                // Log response
                this.logger.Log(false, level, this.packageName, `Response ${req.method} ${req.path} - ${res.statusCode}`, {
                    requestId,
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    contentLength: res.get('Content-Length'),
                    timestamp: new Date().toISOString()
                });
                // Call original end method
                originalEnd.call(res, chunk, encoding);
            }.bind(this);
            next();
        };
    }
    /**
     * Middleware for logging unhandled errors
     * @returns Express error middleware function
     */
    errorMiddleware() {
        return (error, req, res, next) => {
            this.logger.Log(true, logger_1.LogLevel.ERROR, this.packageName, `Unhandled error in ${req.method} ${req.path}: ${error.message}`, {
                method: req.method,
                path: req.path,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                },
                query: req.query,
                body: req.body,
                timestamp: new Date().toISOString()
            });
            next(error);
        };
    }
    /**
     * Generate unique request ID
     * @returns Unique request identifier
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.HttpLoggingMiddleware = HttpLoggingMiddleware;
/**
 * Generic middleware for other frameworks
 */
class GenericMiddleware {
    constructor(packageName = 'generic-middleware', logger) {
        this.packageName = packageName;
        this.logger = logger || logger_1.Logger.getLogger(packageName);
    }
    /**
     * Log function entry and exit
     * @param functionName Name of the function
     * @param args Function arguments
     * @returns Decorator function
     */
    logFunction(functionName, args) {
        return (target, propertyName, descriptor) => {
            const method = descriptor.value;
            descriptor.value = function (...functionArgs) {
                return __awaiter(this, void 0, void 0, function* () {
                    const startTime = Date.now();
                    // Log function entry
                    this.logger.Log(true, logger_1.LogLevel.DEBUG, this.packageName, `Entering function: ${functionName}`, {
                        function: functionName,
                        arguments: args || functionArgs,
                        timestamp: new Date().toISOString()
                    });
                    try {
                        const result = yield method.apply(this, functionArgs);
                        const duration = Date.now() - startTime;
                        // Log successful function exit
                        this.logger.Log(false, logger_1.LogLevel.DEBUG, this.packageName, `Exiting function: ${functionName} (${duration}ms)`, {
                            function: functionName,
                            duration: `${duration}ms`,
                            success: true,
                            timestamp: new Date().toISOString()
                        });
                        return result;
                    }
                    catch (error) {
                        const duration = Date.now() - startTime;
                        // Log function error
                        this.logger.Log(true, logger_1.LogLevel.ERROR, this.packageName, `Error in function: ${functionName} (${duration}ms)`, {
                            function: functionName,
                            duration: `${duration}ms`,
                            error: {
                                name: error.name,
                                message: error.message
                            },
                            timestamp: new Date().toISOString()
                        });
                        throw error;
                    }
                });
            }.bind(this);
            return descriptor;
        };
    }
    /**
     * Simple timing middleware
     * @param operation Operation name
     * @param fn Function to time
     * @returns Promise with function result
     */
    timeOperation(operation, fn) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            this.logger.Log(false, logger_1.LogLevel.DEBUG, this.packageName, `Starting operation: ${operation}`, { operation, timestamp: new Date().toISOString() });
            try {
                const result = yield fn();
                const duration = Date.now() - startTime;
                this.logger.Log(false, logger_1.LogLevel.INFO, this.packageName, `Completed operation: ${operation} (${duration}ms)`, { operation, duration: `${duration}ms`, success: true });
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                this.logger.Log(true, logger_1.LogLevel.ERROR, this.packageName, `Failed operation: ${operation} (${duration}ms)`, {
                    operation,
                    duration: `${duration}ms`,
                    error: {
                        name: error.name,
                        message: error.message
                    }
                });
                throw error;
            }
        });
    }
}
exports.GenericMiddleware = GenericMiddleware;
