import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import { config } from './config.js';
import {
  bootstrapStorage,
  getTheme,
  saveTheme,
  getPages,
  savePages,
  getUsers,
  saveUsers,
  getConversations,
  saveConversations,
  getMessages,
  saveMessages
} from './storage.js';
import {
  hashPassword,
  sanitize,
  createSession,
  getSession,
  destroySession,
  createCsrfToken,
  verifyCsrf,
  requireJson,
  parseCookies,
  setCookie
} from './security.js';
import {
  listConversations,
  createConversation,
  addMessage,
  getMessagesByConversation,
  markConversationResolved,
  updateMessageStatus,
  registerTyping,
  saveAttachment,
  listQuickReplies,
  updateQuickReplies,
  attachStream
} from './chatService.js';
import { readBody, sendJson, serveFile, guessContentType } from './utils.js';

const PUBLIC_DIR = path.resolve(process.cwd(), '../client/public');
const server = http.createServer(handleRequest);

bootstrapStorage();

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline'");
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', config.allowedOrigins[0]);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  setSecurityHeaders(res);
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': url.origin,
      'Access-Control-Allow-Headers': 'Content-Type, x-csrf-token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end();
    return;
  }

  if (pathname.startsWith('/uploads/')) {
    const filePath = path.join(config.uploadDir, pathname.replace('/uploads/', ''));
    try {
      await fs.access(filePath);
      res.writeHead(200, { 'Content-Type': guessContentType(filePath) });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      sendJson(res, 404, { error: 'Fichier introuvable' });
    }
    return;
  }

  if (pathname.startsWith('/api/chat/stream/')) {
    const conversationId = pathname.split('/').pop();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });
    res.write('\n');
    attachStream(conversationId, res);
    return;
  }

  if (pathname.startsWith('/api/')) {
    await routeApi(req, res, url);
    return;
  }

  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname === '/' ? '/index.html' : pathname));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Accès refusé' });
    return;
  }
  try {
    const stat = await fs.stat(safePath);
    if (stat.isDirectory()) {
      await serveFile(res, path.join(safePath, 'index.html'));
    } else {
      await serveFile(res, safePath, guessContentType(safePath));
    }
  } catch {
    try {
      await serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
    } catch {
      sendJson(res, 404, { error: 'Ressource introuvable' });
    }
  }
}

async function routeApi(req, res, url) {
  const pathname = url.pathname;
  const cookies = parseCookies(req.headers.cookie || '');
  const session = getSession(cookies.sid);

  const requireAuth = () => {
    if (!session) {
      sendJson(res, 401, { error: 'Authentification requise' });
      return false;
    }
    return true;
  };

  if (pathname === '/api/pages' && req.method === 'GET') {
    const pages = await getPages();
    sendJson(res, 200, { pages });
    return;
  }

  if (pathname === '/api/theme' && req.method === 'GET') {
    const theme = await getTheme();
    sendJson(res, 200, { theme });
    return;
  }

  if (pathname === '/api/chat/conversation' && req.method === 'POST') {
    if (!requireJson(req, res)) return;
    try {
      const payload = await readBody(req);
      const conversation = await createConversation({
        clientName: sanitize(payload.clientName || 'Visiteur'),
        clientEmail: sanitize(payload.clientEmail || ''),
        message: sanitize(payload.message || ''),
        gdprConsent: Boolean(payload.gdprConsent)
      });
      sendJson(res, 201, { conversation });
    } catch (error) {
      sendJson(res, 400, { error: 'Conversation non créée', details: error.message });
    }
    return;
  }

  if (pathname === '/api/chat/message' && req.method === 'POST') {
    if (!requireJson(req, res)) return;
    const payload = await readBody(req);
    if (!payload.conversationId) {
      sendJson(res, 422, { error: 'conversationId requis' });
      return;
    }
    const message = await addMessage({
      conversationId: payload.conversationId,
      authorRole: payload.authorRole || (session ? 'admin' : 'client'),
      authorName: sanitize(payload.authorName || 'Invité'),
      content: sanitize(payload.content || ''),
      attachments: payload.attachments || []
    });
    sendJson(res, 201, { message });
    return;
  }

  if (pathname.startsWith('/api/chat/messages/') && req.method === 'GET') {
    const conversationId = pathname.split('/').pop();
    const messages = await getMessagesByConversation(conversationId);
    sendJson(res, 200, { messages });
    return;
  }

  if (pathname === '/api/chat/typing' && req.method === 'POST') {
    if (!requireJson(req, res)) return;
    const payload = await readBody(req);
    await registerTyping(payload.conversationId, payload.authorRole || 'client');
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/chat/status' && req.method === 'POST') {
    if (!requireJson(req, res)) return;
    const payload = await readBody(req);
    await updateMessageStatus(payload.conversationId, payload.status || 'delivered');
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/chat/attachment' && req.method === 'POST') {
    if (!requireJson(req, res)) return;
    const payload = await readBody(req);
    const attachment = await saveAttachment(payload);
    sendJson(res, 201, { attachment });
    return;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    if (!requireJson(req, res)) return;
    const payload = await readBody(req);
    const users = await getUsers();
    const user = users.find((u) => u.email === payload.email && u.hash === hashPassword(payload.password));
    if (!user) {
      sendJson(res, 401, { error: 'Identifiants invalides' });
      return;
    }
    const sessionId = createSession(user.id);
    const csrfToken = createCsrfToken(sessionId);
    setCookie(res, 'sid', sessionId, { httpOnly: true, secure: false });
    sendJson(res, 200, { user: { id: user.id, nom: user.nom, role: user.role }, csrfToken });
    return;
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    if (session) {
      destroySession(cookies.sid);
    }
    setCookie(res, 'sid', '', { httpOnly: true, maxAge: 0 });
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/admin/conversations' && req.method === 'GET') {
    if (!requireAuth()) return;
    const conversations = await listConversations({
      status: url.searchParams.get('status'),
      search: url.searchParams.get('search')
    });
    sendJson(res, 200, { conversations });
    return;
  }

  if (pathname.startsWith('/api/admin/conversations/') && req.method === 'POST') {
    if (!requireAuth()) return;
    const conversationId = pathname.split('/').pop();
    if (!verifyCsrf(cookies.sid, req.headers['x-csrf-token'])) {
      sendJson(res, 403, { error: 'CSRF invalide' });
      return;
    }
    await markConversationResolved(conversationId, session.userId);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/admin/quick-replies' && req.method === 'GET') {
    if (!requireAuth()) return;
    const items = await listQuickReplies();
    sendJson(res, 200, { quickReplies: items });
    return;
  }

  if (pathname === '/api/admin/quick-replies' && req.method === 'PUT') {
    if (!requireAuth()) return;
    if (!verifyCsrf(cookies.sid, req.headers['x-csrf-token'])) {
      sendJson(res, 403, { error: 'CSRF invalide' });
      return;
    }
    const payload = await readBody(req);
    const list = payload.quickReplies?.map((item) => sanitize(item)) || [];
    await updateQuickReplies(list);
    sendJson(res, 200, { quickReplies: list });
    return;
  }

  if (pathname === '/api/admin/theme' && req.method === 'PUT') {
    if (!requireAuth()) return;
    if (!verifyCsrf(cookies.sid, req.headers['x-csrf-token'])) {
      sendJson(res, 403, { error: 'CSRF invalide' });
      return;
    }
    const payload = await readBody(req);
    const theme = { ...config.defaultTheme, ...payload };
    await saveTheme(theme);
    sendJson(res, 200, { theme });
    return;
  }

  if (pathname === '/api/admin/pages' && req.method === 'PUT') {
    if (!requireAuth()) return;
    if (!verifyCsrf(cookies.sid, req.headers['x-csrf-token'])) {
      sendJson(res, 403, { error: 'CSRF invalide' });
      return;
    }
    const payload = await readBody(req);
    await savePages(payload.pages || {});
    sendJson(res, 200, { pages: payload.pages });
    return;
  }

  if (pathname === '/api/admin/users' && req.method === 'GET') {
    if (!requireAuth()) return;
    const users = await getUsers();
    sendJson(res, 200, { users: users.map(({ hash, ...rest }) => rest) });
    return;
  }

  if (pathname === '/api/admin/users' && req.method === 'POST') {
    if (!requireAuth()) return;
    if (!verifyCsrf(cookies.sid, req.headers['x-csrf-token'])) {
      sendJson(res, 403, { error: 'CSRF invalide' });
      return;
    }
    const payload = await readBody(req);
    const users = await getUsers();
    const newUser = {
      id: crypto.randomUUID(),
      email: sanitize(payload.email),
      nom: sanitize(payload.nom),
      role: payload.role || 'agent',
      permissions: payload.permissions || [],
      hash: hashPassword(payload.password || 'changeme'),
      actif: true,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);
    sendJson(res, 201, { user: { ...newUser, hash: undefined } });
    return;
  }

  if (pathname.startsWith('/api/admin/users/') && req.method === 'PUT') {
    if (!requireAuth()) return;
    if (!verifyCsrf(cookies.sid, req.headers['x-csrf-token'])) {
      sendJson(res, 403, { error: 'CSRF invalide' });
      return;
    }
    const userId = pathname.split('/').pop();
    const payload = await readBody(req);
    const users = await getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      sendJson(res, 404, { error: 'Utilisateur introuvable' });
      return;
    }
    Object.assign(user, payload);
    await saveUsers(users);
    sendJson(res, 200, { user: { ...user, hash: undefined } });
    return;
  }

  if (pathname === '/api/rgpd/export' && req.method === 'POST') {
    if (!requireJson(req, res)) return;
    const payload = await readBody(req);
    const conversations = await listConversations({});
    const related = conversations.filter((c) => c.clientEmail === payload.email);
    const messages = [];
    for (const conv of related) {
      messages.push(...(await getMessagesByConversation(conv.id)));
    }
    sendJson(res, 200, { conversations: related, messages });
    return;
  }

  if (pathname === '/api/rgpd/delete' && req.method === 'POST') {
    if (!requireJson(req, res)) return;
    const payload = await readBody(req);
    const conversations = await getConversations();
    const targetIds = conversations.filter((c) => c.clientEmail === payload.email).map((c) => c.id);
    const others = conversations.filter((c) => !targetIds.includes(c.id));
    await saveConversations(others);
    const messages = await getMessages();
    const remainingMessages = messages.filter((msg) => !targetIds.includes(msg.conversationId));
    await saveMessages(remainingMessages);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/admin/export' && req.method === 'GET') {
    if (!requireAuth()) return;
    const conversations = await listConversations({});
    const exported = [];
    for (const conv of conversations) {
      const messages = await getMessagesByConversation(conv.id);
      exported.push({ ...conv, messages });
    }
    sendJson(res, 200, { conversations: exported });
    return;
  }

  sendJson(res, 404, { error: 'Route inconnue' });
}

server.listen(config.port, () => {
  console.log(`Serveur démarré sur http://localhost:${config.port}`);
});
