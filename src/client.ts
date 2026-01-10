import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  TraceHubConfig,
  TracePayload,
  BatchTracePayload,
  TraceHubResponse,
  LogLevel,
  TraceHubError,
} from './types';

export class TraceHubClient {
  private config: Required<TraceHubConfig>;
  private httpClient: AxiosInstance;
  private buffer: TracePayload[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: TraceHubConfig) {
    this.config = {
      serviceName: this.getDefaultServiceName(),
      environment: process.env.NODE_ENV || 'production',
      captureErrors: true,
      captureLogs: false,
      batchSize: 50,
      flushInterval: 5000,
      debug: false,
      ...config,
    };

    this.httpClient = axios.create({
      baseURL: this.config.endpoint,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      timeout: 10000,
    });

    this.setupAutoFlush();
    this.setupErrorCapture();

    if (this.config.debug) {
      console.log('[TraceHub] Initialized with config:', {
        endpoint: this.config.endpoint,
        projectId: this.config.projectId,
        serviceName: this.config.serviceName,
        environment: this.config.environment,
      });
    }
  }

  /**
   * Send a single trace
   */
  async trace(payload: Omit<TracePayload, 'service_name' | 'environment'>): Promise<void> {
    const trace: TracePayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
      service_name: this.config.serviceName,
      environment: this.config.environment,
    };

    if (this.config.batchSize > 1) {
      this.buffer.push(trace);
      if (this.buffer.length >= this.config.batchSize) {
        await this.flush();
      }
    } else {
      await this.sendTrace(trace);
    }
  }

  /**
   * Log methods
   */
  async info(message: string, context?: Record<string, string>): Promise<void> {
    return this.trace({ level: 'info', message, context });
  }

  async warn(message: string, context?: Record<string, string>): Promise<void> {
    return this.trace({ level: 'warn', message, context });
  }

  async error(error: Error | string, context?: Record<string, string>): Promise<void> {
    if (typeof error === 'string') {
      return this.trace({ level: 'error', message: error, context });
    }

    const source = this.extractErrorSource(error);
    return this.trace({
      level: 'error',
      message: error.message,
      stack_trace: error.stack,
      source,
      context,
    });
  }

  async fatal(error: Error | string, context?: Record<string, string>): Promise<void> {
    if (typeof error === 'string') {
      return this.trace({ level: 'fatal', message: error, context });
    }

    const source = this.extractErrorSource(error);
    await this.trace({
      level: 'fatal',
      message: error.message,
      stack_trace: error.stack,
      source,
      context,
    });

    // Force flush on fatal errors
    await this.flush();
  }

  async debug(message: string, context?: Record<string, string>): Promise<void> {
    return this.trace({ level: 'debug', message, context });
  }

  /**
   * Flush buffered traces
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const traces = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendBatch({ traces });
      if (this.config.debug) {
        console.log(`[TraceHub] Flushed ${traces.length} traces`);
      }
    } catch (error) {
      // Re-add failed traces to buffer
      this.buffer.unshift(...traces);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the client
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
    if (this.config.debug) {
      console.log('[TraceHub] Client shutdown complete');
    }
  }

  /**
   * Private methods
   */

  private async sendTrace(trace: TracePayload): Promise<void> {
    try {
      const url = `/api/v1/traces?project_id=${this.config.projectId}`;
      await this.httpClient.post<TraceHubResponse>(url, trace);
    } catch (error) {
      this.handleError(error);
    }
  }

  private async sendBatch(batch: BatchTracePayload): Promise<void> {
    try {
      const url = `/api/v1/traces/batch?project_id=${this.config.projectId}`;
      await this.httpClient.post<TraceHubResponse>(url, batch);
    } catch (error) {
      this.handleError(error);
    }
  }

  private setupAutoFlush(): void {
    if (this.config.batchSize > 1 && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch((error) => {
          if (this.config.debug) {
            console.error('[TraceHub] Auto-flush error:', error);
          }
        });
      }, this.config.flushInterval);
    }
  }

  private setupErrorCapture(): void {
    if (!this.config.captureErrors) return;

    // Capture unhandled errors
    process.on('uncaughtException', (error: Error) => {
      this.error(error, { type: 'uncaughtException' })
        .catch(() => {})
        .finally(() => {
          process.exit(1);
        });
    });

    // Capture unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.error(error, { type: 'unhandledRejection' }).catch(() => {});
    });
  }

  private extractErrorSource(error: Error): string | undefined {
    if (!error.stack) return undefined;

    // Parse stack trace to find the first relevant line
    const lines = error.stack.split('\n');
    for (const line of lines.slice(1)) {
      const match = line.match(/\((.+):(\d+):(\d+)\)/) || line.match(/at (.+):(\d+):(\d+)/);
      if (match) {
        const [, file, lineNum] = match;
        // Skip node_modules
        if (!file.includes('node_modules')) {
          return `${file}:${lineNum}`;
        }
      }
    }
    return undefined;
  }

  private getDefaultServiceName(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require('../package.json');
      return pkg.name || 'unknown-service';
    } catch {
      return 'unknown-service';
    }
  }

  private handleError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const traceHubError: TraceHubError = new Error(
        `TraceHub API Error: ${axiosError.message}`
      ) as TraceHubError;
      traceHubError.code = axiosError.code;
      traceHubError.statusCode = axiosError.response?.status;

      if (this.config.debug) {
        console.error('[TraceHub] API Error:', {
          message: axiosError.message,
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
      }
    } else {
      if (this.config.debug) {
        console.error('[TraceHub] Unknown error:', error);
      }
    }
  }
}
