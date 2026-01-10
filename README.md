# TraceHub JavaScript SDK

Official JavaScript/TypeScript SDK for [TraceHub](https://github.com/tapiaw38/tracehub-server) - Send traces and logs from your Node.js applications to your TraceHub server.

## Features

- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Automatic Error Capture** - Catch uncaught exceptions and unhandled rejections
- ✅ **Express Middleware** - Easy integration with Express apps
- ✅ **Batch Sending** - Efficient batching with auto-flush
- ✅ **Flexible Configuration** - Customize batching, flush intervals, and more
- ✅ **Zero Dependencies** - Only axios for HTTP (production dependency)

## Installation

```bash
npm install @tracehub/sdk
# or
yarn add @tracehub/sdk
```

## Quick Start

```typescript
import { TraceHubClient } from '@tracehub/sdk';

const tracer = new TraceHubClient({
  endpoint: 'http://localhost:8080',
  apiKey: 'th_your_api_key_here',
  projectId: 'your-project-uuid',
  serviceName: 'my-backend',
  environment: 'production',
});

// Send logs
await tracer.info('Application started');
await tracer.error(new Error('Something went wrong'));
await tracer.warn('High memory usage', { memory_mb: '1024' });

// Graceful shutdown
await tracer.shutdown();
```

## Configuration

```typescript
interface TraceHubConfig {
  // Required
  endpoint: string;        // TraceHub server URL
  apiKey: string;          // API key (format: th_xxx)
  projectId: string;       // Project UUID

  // Optional
  serviceName?: string;    // Service name (default: package name)
  environment?: string;    // Environment (default: NODE_ENV or 'production')
  captureErrors?: boolean; // Auto-capture errors (default: true)
  captureLogs?: boolean;   // Auto-capture console logs (default: false)
  batchSize?: number;      // Batch size (default: 50)
  flushInterval?: number;  // Flush interval in ms (default: 5000)
  debug?: boolean;         // Enable debug mode (default: false)
}
```

## Usage

### Basic Logging

```typescript
// Info
await tracer.info('User logged in', { user_id: '123' });

// Warning
await tracer.warn('Slow query detected', { query_time_ms: '1500' });

// Error (with Error object)
try {
  throw new Error('Database connection failed');
} catch (error) {
  await tracer.error(error, { database: 'postgres' });
}

// Fatal (flushes immediately)
await tracer.fatal(new Error('Critical system failure'));

// Debug
await tracer.debug('Cache hit', { key: 'user:123' });
```

### Manual Trace

```typescript
await tracer.trace({
  level: 'info',
  message: 'Custom event',
  timestamp: new Date().toISOString(),
  source: 'worker.js:45',
  stack_trace: 'optional stack trace',
  context: {
    job_id: '12345',
    queue: 'email',
  },
});
```

### Express Middleware

```typescript
import express from 'express';
import { TraceHubClient, traceHubMiddleware, traceHubErrorHandler } from '@tracehub/sdk';

const app = express();
const tracer = new TraceHubClient({ /* config */ });

// Add middleware (logs all requests/responses)
app.use(traceHubMiddleware({
  client: tracer,
  logRequests: true,      // Log all requests
  errorsOnly: false,      // Or log only errors
  contextExtractor: (req) => ({
    user_id: req.user?.id,
    session_id: req.sessionID,
  }),
}));

// Your routes...

// Error handler (must be last)
app.use(traceHubErrorHandler(tracer));

// Graceful shutdown
process.on('SIGTERM', async () => {
  await tracer.shutdown();
  process.exit(0);
});
```

### Batch vs Immediate

```typescript
// Batching (efficient for high throughput)
const tracer = new TraceHubClient({
  // ...
  batchSize: 50,         // Send when 50 traces accumulated
  flushInterval: 5000,   // Or every 5 seconds
});

// Immediate (no batching)
const tracer = new TraceHubClient({
  // ...
  batchSize: 1,  // Send immediately
});
```

### Error Capture

```typescript
// Automatic capture (enabled by default)
const tracer = new TraceHubClient({
  // ...
  captureErrors: true,  // Captures uncaught exceptions and unhandled rejections
});

// Manual error logging
try {
  // Your code
} catch (error) {
  await tracer.error(error, {
    operation: 'payment_processing',
    transaction_id: '12345',
  });
}
```

## API Reference

### TraceHubClient

#### Methods

- `info(message: string, context?: Record<string, string>): Promise<void>`
- `warn(message: string, context?: Record<string, string>): Promise<void>`
- `error(error: Error | string, context?: Record<string, string>): Promise<void>`
- `fatal(error: Error | string, context?: Record<string, string>): Promise<void>`
- `debug(message: string, context?: Record<string, string>): Promise<void>`
- `trace(payload: TracePayload): Promise<void>`
- `flush(): Promise<void>` - Manually flush buffered traces
- `shutdown(): Promise<void>` - Flush and gracefully shutdown

### Middleware

#### `traceHubMiddleware(options)`

Logs HTTP requests and responses.

**Options:**
```typescript
{
  client: TraceHubClient;
  logRequests?: boolean;      // Log all requests (default: true)
  errorsOnly?: boolean;       // Log only errors (default: false)
  contextExtractor?: (req) => Record<string, string>;
}
```

#### `traceHubErrorHandler(client)`

Error handler middleware (should be last).

## Examples

See the [`examples/`](./examples) directory:

- [`basic.js`](./examples/basic.js) - Basic usage
- [`express.js`](./examples/express.js) - Express integration

## TypeScript

Full TypeScript support with type definitions included:

```typescript
import { 
  TraceHubClient, 
  TraceHubConfig, 
  LogLevel,
  TracePayload 
} from '@tracehub/sdk';
```

## Error Handling

The SDK handles errors gracefully:

- Failed API calls are logged to console (in debug mode)
- Buffered traces are preserved on flush failure
- Network errors don't crash your application

## Performance

- **Batching**: Reduces HTTP overhead by sending multiple traces in one request
- **Auto-flush**: Background timer ensures traces are sent even if batch size isn't reached
- **Async**: All operations are asynchronous and non-blocking

## Best Practices

1. **Always call `shutdown()`** on process exit to flush remaining traces
2. **Use batching** for high-throughput applications
3. **Add context** to traces for better debugging
4. **Use appropriate log levels** (don't overuse `fatal`)
5. **Handle errors** - wrap tracer calls in try-catch if needed

## Troubleshooting

### Traces not appearing in TraceHub

1. Check your `endpoint` URL is correct
2. Verify `apiKey` and `projectId` are valid
3. Enable `debug: true` to see SDK logs
4. Check network connectivity to TraceHub server

### High memory usage

1. Reduce `batchSize`
2. Lower `flushInterval`
3. Disable automatic captures if not needed

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Lint
npm run lint
```

## License

MIT

## Links

- [TraceHub Server](https://github.com/tapiaw38/tracehub-server)
- [TraceHub CLI](https://github.com/tapiaw38/tracehub-cli)
- [Documentation](https://github.com/tapiaw38/tracehub-server#readme)

---

Made with ❤️ by the TraceHub team
