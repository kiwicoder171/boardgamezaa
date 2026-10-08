import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { setupSocketServer } from './src/server/socket';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  setupSocketServer(io);

  server.listen(port, () => {
    console.log(`> 🎲 BoardgameZaa server ready on http://localhost:${port}`);
  });
});
