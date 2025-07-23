import { LogLevel, LogEntry, LoggerConfig, StackInfo, StackType, PackageName } from './types';
export { LogLevel, StackType, PackageName } from './types';
import { StackTraceParser } from './stack-parser';
import { LogFormatter } from './formatter';
import { LogApiClient } from './api-client';
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private config: LoggerConfig;
  private static instances: Map<string, Logger> = new Map();
  private apiClient: LogApiClient;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      format: 'structured',
      output: 'console',
      includeStack: true,
      dateFormat: 'default',
      apiConfig: {
        endpoint: 'http://20.244.56.144',
        timeout: 5000
      },
      ...config
    };

    this.apiClient = new LogApiClient(
      this.config.apiConfig?.endpoint,
      this.config.apiConfig?.authToken,
      this.config.apiConfig?.timeout
    );
  }

  static getLogger(packageName: string, config?: Partial<LoggerConfig>): Logger {
    if (!this.instances.has(packageName)) {
      this.instances.set(packageName, new Logger(config));
    }
    return this.instances.get(packageName)!;
  }

  async Log(
    stack: StackType | boolean, 
    level: LogLevel, 
    packageName: PackageName, 
    message: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    if (level < this.config.level) {
      return;
    }

    let stackType: StackType;
    if (typeof stack === 'boolean') {
      stackType = this.detectStackType();
    } else {
      stackType = stack;
    }

    let stackInfo: StackInfo[] | undefined;
    if (this.config.includeStack) {
      stackInfo = StackTraceParser.parseStack(3);
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      package: packageName,
      message,
      stack: stackInfo,
      metadata
    };

    this.output(entry);

    if (this.config.output === 'api' || this.config.output === 'custom') {
      await this.sendToApi(stackType, level, packageName, message);
    }
  }

  private detectStackType(): StackType {
    if (typeof window !== 'undefined') {
      return 'frontend';
    }
    return 'backend';
  }

  private async sendToApi(
    stack: StackType,
    level: LogLevel,
    packageName: PackageName,
    message: string
  ): Promise<void> {
    try {
      const result = await this.apiClient.sendLog(stack, level, packageName, message);
      if (result) {
        console.debug(`Log sent to API successfully. LogID: ${result.logID}`);
      }
    } catch (error) {
      console.error('Failed to send log to API:', error);
    }
  }

  async debug(packageName: PackageName, message: string, metadata?: Record<string, any>, stack: StackType | boolean = true): Promise<void> {
    await this.Log(stack, LogLevel.DEBUG, packageName, message, metadata);
  }

  async info(packageName: PackageName, message: string, metadata?: Record<string, any>, stack: StackType | boolean = true): Promise<void> {
    await this.Log(stack, LogLevel.INFO, packageName, message, metadata);
  }

  async warn(packageName: PackageName, message: string, metadata?: Record<string, any>, stack: StackType | boolean = true): Promise<void> {
    await this.Log(stack, LogLevel.WARN, packageName, message, metadata);
  }

  async error(packageName: PackageName, message: string, metadata?: Record<string, any>, stack: StackType | boolean = true): Promise<void> {
    await this.Log(stack, LogLevel.ERROR, packageName, message, metadata);
  }

  async fatal(packageName: PackageName, message: string, metadata?: Record<string, any>, stack: StackType | boolean = true): Promise<void> {
    await this.Log(stack, LogLevel.FATAL, packageName, message, metadata);
  }

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.apiConfig) {
      this.apiClient = new LogApiClient(
        config.apiConfig.endpoint || this.config.apiConfig?.endpoint,
        config.apiConfig.authToken || this.config.apiConfig?.authToken,
        config.apiConfig.timeout || this.config.apiConfig?.timeout
      );
    }
  }

  setAuthToken(token: string): void {
    this.apiClient.setAuthToken(token);
    if (this.config.apiConfig) {
      this.config.apiConfig.authToken = token;
    }
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  private output(entry: LogEntry): void {
    const formattedLog = LogFormatter.format(entry, this.config);

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

  private outputToConsole(message: string, level: LogLevel): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message);
        break;
    }
  }

  private outputToFile(message: string): void {
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'application.log');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(logFile, message + '\n');
  }
}

export const globalLogger = new Logger();

export async function Log(
  stack: StackType | boolean, 
  level: LogLevel, 
  packageName: PackageName, 
  message: string, 
  metadata?: Record<string, any>
): Promise<void> {
  await globalLogger.Log(stack, level, packageName, message, metadata);
}
