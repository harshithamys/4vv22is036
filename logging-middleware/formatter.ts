import { LogEntry, LogLevel, LoggerConfig } from './types';

export class LogFormatter {
  static format(entry: LogEntry, config: LoggerConfig): string {
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

  private static formatJSON(entry: LogEntry): string {
    const logObject = {
      timestamp: entry.timestamp.toISOString(),
      level: LogLevel[entry.level],
      package: entry.package,
      message: entry.message,
      ...(entry.stack && { stack: entry.stack }),
      ...(entry.metadata && { metadata: entry.metadata })
    };

    return JSON.stringify(logObject);
  }

  private static formatStructured(entry: LogEntry, config: LoggerConfig): string {
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

  private static formatText(entry: LogEntry, config: LoggerConfig): string {
    const timestamp = this.formatTimestamp(entry.timestamp, config.dateFormat);
    const level = LogLevel[entry.level].padEnd(5);
    
    return `${timestamp} [${level}] [${entry.package}] ${entry.message}`;
  }

  private static formatTimestamp(timestamp: Date, format?: string): string {
    if (format === 'iso') {
      return timestamp.toISOString();
    } else if (format === 'locale') {
      return timestamp.toLocaleString();
    } else {
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

  private static formatLevel(level: LogLevel): string {
    const levelName = LogLevel[level].padEnd(5);
    
    switch (level) {
      case LogLevel.DEBUG:
        return `\x1b[36m${levelName}\x1b[0m`;
      case LogLevel.INFO:
        return `\x1b[32m${levelName}\x1b[0m`;
      case LogLevel.WARN:
        return `\x1b[33m${levelName}\x1b[0m`;
      case LogLevel.ERROR:
        return `\x1b[31m${levelName}\x1b[0m`;
      case LogLevel.FATAL:
        return `\x1b[35m${levelName}\x1b[0m`;
      default:
        return levelName;
    }
  }

  private static formatStackForDisplay(stack: any[]): string {
    return stack.map((frame, index) => {
      const padding = '  '.repeat(index + 1);
      return `${padding}at ${frame.function} (${frame.file}:${frame.line}:${frame.column})`;
    }).join('\n');
  }
}
