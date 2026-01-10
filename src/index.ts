/**
 * TraceHub JavaScript SDK
 *
 * Official SDK for sending traces and logs to TraceHub server
 */

export { TraceHubClient } from './client';
export { traceHubMiddleware, traceHubErrorHandler } from './middleware/express';
export type {
  TraceHubConfig,
  TracePayload,
  BatchTracePayload,
  TraceHubResponse,
  TraceHubError,
  LogLevel,
} from './types';
export type { ExpressMiddlewareOptions } from './middleware/express';

// Default export
import { TraceHubClient } from './client';
export default TraceHubClient;
