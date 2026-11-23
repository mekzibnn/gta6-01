import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

function mimeFor(path) {
  const ext = extname(path);
  if (ext === '.html') return 'text/html';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript';
  if (ext === '.css') return 'text/css';
  if (ext === '.json') return 'application/json';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  const raw = req.url.split('?')[0];
  const path = raw === '/' ? '/index.html' : raw;
  try {
    const data = await readFile(join(root, 'game', path));
    res.writeHead(200, { 'Content-Type': mimeFor(path) });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(8126, () => {
  console.log('Solmar Heat at http://localhost:8126');
});
