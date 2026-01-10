/**
 * TraceHub SDK Types
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'fatal' | 'debug';

export interface TraceHubConfig {
  /** TraceHub server endpoint */
  endpoint: string;

  /** API key for authentication */
  apiKey: string;

  /** Project ID (UUID) */
  projectId: string;

  /** Service name (optional, defaults to package name) */
  serviceName?: string;

  /** Environment (production, staging, development) */
  environment?: string;

  /** Enable/disable automatic error capture */
  captureErrors?: boolean;

  /** Enable/disable console log capture */
  captureLogs?: boolean;

  /** Batch size for sending traces */
  batchSize?: number;

  /** Flush interval in milliseconds */
  flushInterval?: number;

  /** Enable debug mode */
  debug?: boolean;
}

export interface TracePayload {
  /** Log level */
  level: LogLevel;

  /** Log message */
  message: string;

  /** Timestamp (ISO 8601) */
  timestamp?: string;

  /** Source file and line (e.g., "app.js:45") */
  source?: string;

  /** Stack trace for errors */
  stack_trace?: string;

  /** Additional context */
  context?: Record<string, string>;

  /** Service name */
  service_name?: string;

  /** Environment */
  environment?: string;
}

export interface BatchTracePayload {
  traces: TracePayload[];
}

export interface TraceHubResponse {
  status: string;
  count?: number;
}

export interface TraceHubError extends Error {
  code?: string;
  statusCode?: number;
}
