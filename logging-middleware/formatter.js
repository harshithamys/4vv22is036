"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogFormatter = void 0;
const types_1 = require("./types");
class LogFormatter {
    static format(entry, config) {
        if (config.customFormatter) {
            return config.customFormatter(entry);
        }
        switch (config.format) {
            case 'json':
                return this.formatJSON(entry);
            case 'structured':
                return this.formatStructured(entry, config);
            case 'text':
            default:
                return this.formatText(entry, config);
        }
    }
    static formatJSON(entry) {
        const logObject = Object.assign(Object.assign({ timestamp: entry.timestamp.toISOString(), level: types_1.LogLevel[entry.level], package: entry.package, message: entry.message }, (entry.stack && { stack: entry.stack })), (entry.metadata && { metadata: entry.metadata }));
        return JSON.stringify(logObject);
    }
    static formatStructured(entry, config) {
        const timestamp = this.formatTimestamp(entry.timestamp, config.dateFormat);
        const level = this.formatLevel(entry.level);
        const pkg = `[${entry.package}]`;
        let result = `${timestamp} ${level} ${pkg} ${entry.message}`;
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
            const metadataStr = Object.entries(entry.metadata)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join(' ');
            result += ` | ${metadataStr}`;
        }
        if (entry.stack && config.includeStack) {
            result += '\n' + this.formatStackForDisplay(entry.stack);
        }
        return result;
    }
    static formatText(entry, config) {
        const timestamp = this.formatTimestamp(entry.timestamp, config.dateFormat);
        const level = types_1.LogLevel[entry.level].padEnd(5);
        return `${timestamp} [${level}] [${entry.package}] ${entry.message}`;
    }
    static formatTimestamp(timestamp, format) {
        if (format === 'iso') {
            return timestamp.toISOString();
        }
        else if (format === 'locale') {
            return timestamp.toLocaleString();
        }
        else {
            const year = timestamp.getFullYear();
            const month = String(timestamp.getMonth() + 1).padStart(2, '0');
            const day = String(timestamp.getDate()).padStart(2, '0');
            const hours = String(timestamp.getHours()).padStart(2, '0');
            const minutes = String(timestamp.getMinutes()).padStart(2, '0');
            const seconds = String(timestamp.getSeconds()).padStart(2, '0');
            const milliseconds = String(timestamp.getMilliseconds()).padStart(3, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
        }
    }
    static formatLevel(level) {
        const levelName = types_1.LogLevel[level].padEnd(5);
        switch (level) {
            case types_1.LogLevel.DEBUG:
                return `\x1b[36m${levelName}\x1b[0m`;
            case types_1.LogLevel.INFO:
                return `\x1b[32m${levelName}\x1b[0m`;
            case types_1.LogLevel.WARN:
                return `\x1b[33m${levelName}\x1b[0m`;
            case types_1.LogLevel.ERROR:
                return `\x1b[31m${levelName}\x1b[0m`;
            case types_1.LogLevel.FATAL:
                return `\x1b[35m${levelName}\x1b[0m`;
            default:
                return levelName;
        }
    }
    static formatStackForDisplay(stack) {
        return stack.map((frame, index) => {
            const padding = '  '.repeat(index + 1);
            return `${padding}at ${frame.function} (${frame.file}:${frame.line}:${frame.column})`;
        }).join('\n');
    }
}
exports.LogFormatter = LogFormatter;
