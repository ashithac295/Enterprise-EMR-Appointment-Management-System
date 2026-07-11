import { createServer } from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { initSocket } from './sockets';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  const httpServer = createServer(app);

  // Socket.IO shares the same HTTP server/port as Express rather than
  // running a separate process - simplest deployment story for this scope,
  // and sufficient since both scale together behind the same load balancer.
  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[server] EMR Appointment API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[server] Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
