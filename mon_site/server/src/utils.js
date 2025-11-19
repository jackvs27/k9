import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

export async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

export async function serveFile(res, filePath, contentType = 'text/html') {
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);
  await pipeline(createReadStream(filePath), res);
}

export function guessContentType(filePath) {
  const ext = path.extname(filePath);
  switch (ext) {
    case '.css':
      return 'text/css';
    case '.js':
      return 'text/javascript';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.json':
      return 'application/json';
    default:
      return 'text/plain';
  }
}
