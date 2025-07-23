export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export type StackType = 'backend' | 'frontend';

export type LogLevelString = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type BackendPackage = 
  | 'cache' 
  | 'controller' 
  | 'cron job' 
  | 'db' 
  | 'domain' 
  | 'handler' 
  | 'repository' 
  | 'route' 
  | 'service';

export type FrontendPackage = 
  | 'api' 
  | 'component' 
  | 'hook' 
  | 'page' 
  | 'state' 
  | 'style';

export type SharedPackage = 
  | 'auth' 
  | 'config' 
  | 'middleware' 
  | 'utils';

export type PackageName = BackendPackage | FrontendPackage | SharedPackage;

export interface ApiLogRequest {
  stack: StackType;
  level: LogLevelString;
  package: PackageName;
  message: string;
}

export interface ApiLogResponse {
  logID: string;
  message: string;
}

export interface StackInfo {
  file: string;
  line: number;
  column: number;
  function: string;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  package: string;
  message: string;
  stack?: StackInfo[];
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'text' | 'structured';
  output: 'console' | 'file' | 'api' | 'custom';
  includeStack: boolean;
  dateFormat?: string;
  customFormatter?: (entry: LogEntry) => string;
  customOutput?: (formattedLog: string) => void;
  apiConfig?: {
    endpoint: string;
    authToken?: string;
    timeout?: number;
  };
}
