/**
 * Basic usage example
 */

const { TraceHubClient } = require('@tracehub/sdk');

// Initialize the client
const tracer = new TraceHubClient({
  endpoint: 'http://localhost:8080',
  apiKey: 'th_your_api_key_here',
  projectId: 'your-project-uuid',
  serviceName: 'my-backend',
  environment: 'production',
  batchSize: 10,
  flushInterval: 5000,
});

// Log different levels
async function main() {
  // Info log
  await tracer.info('Application started', {
    version: '1.0.0',
  });

  // Warning
  await tracer.warn('High memory usage detected', {
    memory_mb: '1024',
    threshold_mb: '800',
  });

  // Error
  try {
    throw new Error('Database connection failed');
  } catch (error) {
    await tracer.error(error, {
      database: 'postgres',
      host: 'localhost',
    });
  }

  // Manual trace with custom fields
  await tracer.trace({
    level: 'info',
    message: 'Custom trace event',
    source: 'worker.js:45',
    context: {
      job_id: '12345',
      queue: 'email',
    },
  });

  // Flush and shutdown
  await tracer.shutdown();
}

main().catch(console.error);
