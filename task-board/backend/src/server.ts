import { createServer } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { initSocket } from './sockets/socket.js';

async function main(): Promise<void> {
  if (process.env.SKIP_DB !== '1') {
    await connectDb();
    // eslint-disable-next-line no-console
    console.log('[db] connected');
  }

  const app = createApp();
  const httpServer = createServer(app);

  // Initialize WebSockets
  initSocket(httpServer);

  httpServer.listen(env.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on 0.0.0.0:${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[fatal]', err);
  process.exit(1);
});