import { ApiLogRequest, ApiLogResponse, LogLevel, StackType, LogLevelString, PackageName } from './types';
import axios from 'axios';


export class LogApiClient {
  private baseUrl: string;
  private authToken?: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://20.244.56.144', authToken?: string, timeout: number = 5000) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.timeout = timeout;
  }

  
  private logLevelToString(level: LogLevel): LogLevelString {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.FATAL:
        return 'fatal';
      default:
        return 'info';
    }
  }


  private validatePackageForStack(stack: StackType, packageName: string): boolean {
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

  async sendLog(
    stack: StackType,
    level: LogLevel,
    packageName: PackageName,
    message: string
  ): Promise<ApiLogResponse | null> {
    try {
      if (!this.validatePackageForStack(stack, packageName)) {
        console.error(`Package '${packageName}' is not valid for stack '${stack}'`);
        return null;
      }

      const logRequest: ApiLogRequest = {
        stack,
        level: this.logLevelToString(level),
        package: packageName,
        message
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await axios.post(
        `${this.baseUrl}/evaluation-service/log`,
        logRequest,
        {
          headers,
          timeout: this.timeout
        }
      );

      return response.data as ApiLogResponse;

    } catch (error: any) {
      if (error.response) {
        console.error(`Log API request failed: ${error.response.status} ${error.response.statusText}`);
      } else if (error instanceof Error) {
        console.error(`Failed to send log to API: ${error.message}`);
      } else {
        console.error('Failed to send log to API: Unknown error');
      }
      return null;
    }
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/evaluation-service/log`,
        {
          stack: 'backend',
          level: 'info',
          package: 'utils',
          message: 'Connection test'
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.status !== 404;
    } catch (error: any) {
      return error.response?.status !== 404;
    }
  }
}
