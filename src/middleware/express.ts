import { Request, Response, NextFunction } from 'express';
import { TraceHubClient } from '../client';

export interface ExpressMiddlewareOptions {
  /** TraceHub client instance */
  client: TraceHubClient;

  /** Log all requests (default: true) */
  logRequests?: boolean;

  /** Log only errors (default: false) */
  errorsOnly?: boolean;

  /** Custom context extractor */
  contextExtractor?: (req: Request) => Record<string, string>;
}

/**
 * Express middleware for automatic trace logging
 */
export function traceHubMiddleware(options: ExpressMiddlewareOptions) {
  const {
    client,
    logRequests = true,
    errorsOnly = false,
    contextExtractor = defaultContextExtractor,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const context = contextExtractor(req);

    // Log request start
    if (logRequests && !errorsOnly) {
      client
        .info(`${req.method} ${req.path}`, {
          ...context,
          method: req.method,
          path: req.path,
          type: 'request_start',
        })
        .catch(() => {});
    }

    // Capture original res.json to log response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log response
      if (statusCode >= 500) {
        client
          .error(`${req.method} ${req.path} - ${statusCode}`, {
            ...context,
            method: req.method,
            path: req.path,
            status_code: statusCode.toString(),
            duration_ms: duration.toString(),
            type: 'request_error',
          })
          .catch(() => {});
      } else if (statusCode >= 400) {
        client
          .warn(`${req.method} ${req.path} - ${statusCode}`, {
            ...context,
            method: req.method,
            path: req.path,
            status_code: statusCode.toString(),
            duration_ms: duration.toString(),
            type: 'request_warning',
          })
          .catch(() => {});
      } else if (logRequests && !errorsOnly) {
        client
          .info(`${req.method} ${req.path} - ${statusCode}`, {
            ...context,
            method: req.method,
            path: req.path,
            status_code: statusCode.toString(),
            duration_ms: duration.toString(),
            type: 'request_complete',
          })
          .catch(() => {});
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Express error handler middleware
 */
export function traceHubErrorHandler(client: TraceHubClient) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const context = defaultContextExtractor(req);

    // Log the error
    client
      .error(err, {
        ...context,
        method: req.method,
        path: req.path,
        type: 'express_error',
      })
      .catch(() => {});

    // Pass to next error handler
    next(err);
  };
}

/**
 * Default context extractor
 */
function defaultContextExtractor(req: Request): Record<string, string> {
  return {
    user_agent: req.get('user-agent') || 'unknown',
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    request_id: (req as any).id || req.get('x-request-id') || 'unknown',
  };
}
