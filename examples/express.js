/**
 * Express middleware example
 */

const express = require('express');
const { TraceHubClient, traceHubMiddleware, traceHubErrorHandler } = require('@tracehub/sdk');

const app = express();

// Initialize TraceHub client
const tracer = new TraceHubClient({
  endpoint: 'http://localhost:8080',
  apiKey: 'th_your_api_key_here',
  projectId: 'your-project-uuid',
  serviceName: 'my-express-app',
  environment: process.env.NODE_ENV || 'development',
  captureErrors: true,
});

// Add TraceHub middleware (logs all requests/responses)
app.use(
  traceHubMiddleware({
    client: tracer,
    logRequests: true,
    errorsOnly: false,
  })
);

// Your routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.get('/error', (req, res) => {
  throw new Error('Something went wrong!');
});

app.post('/api/users', async (req, res) => {
  try {
    // Simulate database operation
    await tracer.info('Creating new user', {
      email: req.body.email,
    });

    res.json({ id: '123', created: true });
  } catch (error) {
    await tracer.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Add error handler (must be last)
app.use(traceHubErrorHandler(tracer));

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await tracer.shutdown();
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  tracer.info(`Server started on port ${PORT}`);
});
