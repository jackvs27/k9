import crypto from 'node:crypto';
import { config } from './config.js';

const csrfTokens = new Map(); // sessionId -> token
const sessions = new Map(); // sessionId -> { userId, createdAt }

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function sanitize(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function createSession(userId) {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

export function getSession(sessionId) {
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

export function destroySession(sessionId) {
  sessions.delete(sessionId);
  csrfTokens.delete(sessionId);
}

export function createCsrfToken(sessionId) {
  const token = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(sessionId + Date.now().toString())
    .digest('hex');
  csrfTokens.set(sessionId, token);
  return token;
}

export function verifyCsrf(sessionId, token) {
  if (!sessionId) return false;
  const stored = csrfTokens.get(sessionId);
  return stored && stored === token;
}

export function requireJson(req, res) {
  if (!req.headers['content-type']?.includes('application/json')) {
    res.writeHead(415, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Contenu JSON requis' }));
    return false;
  }
  return true;
}

export function parseCookies(header = '') {
  return header.split(';').reduce((acc, pair) => {
    const [key, value] = pair.split('=');
    if (key && value) acc[key.trim()] = decodeURIComponent(value.trim());
    return acc;
  }, {});
}

export function setCookie(res, name, value, options = {}) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    options.httpOnly !== false ? 'HttpOnly' : '',
    'Path=/',
    options.sameSite || 'SameSite=Strict',
    options.secure ? 'Secure' : '',
    options.maxAge ? `Max-Age=${options.maxAge}` : ''
  ].filter(Boolean);
  res.setHeader('Set-Cookie', attributes.join('; '));
}
