import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

const files = {
  conversations: path.join(config.dataDir, 'conversations.json'),
  messages: path.join(config.dataDir, 'messages.json'),
  users: path.join(config.dataDir, 'users.json'),
  theme: path.join(config.dataDir, 'theme.json'),
  pages: path.join(config.dataDir, 'pages.json'),
  quickReplies: path.join(config.dataDir, 'quickReplies.json')
};

async function readJSON(file, fallback) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (fallback !== undefined) {
      await writeJSON(file, fallback);
      return fallback;
    }
    return fallback ?? null;
  }
}

async function writeJSON(file, payload) {
  await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
}

export async function bootstrapStorage() {
  const now = new Date().toISOString();
  await readJSON(files.conversations, []);
  await readJSON(files.messages, []);
  const defaultUsers = [
    {
      id: 'admin-1',
      email: 'admin@example.com',
      nom: 'Admin principal',
      role: 'admin',
      permissions: ['conversations:read', 'conversations:write', 'users:manage', 'theme:manage'],
      hash: crypto.createHash('sha256').update('admin123!').digest('hex'),
      actif: true,
      createdAt: now
    }
  ];
  await readJSON(files.users, defaultUsers);
  await readJSON(files.theme, config.defaultTheme);
  await readJSON(files.pages, config.defaultPages);
  await readJSON(files.quickReplies, [
    'Bonjour, comment puis-je vous aider ?',
    'Pouvez-vous me donner plus de détails ?',
    'Je regarde cela immédiatement pour vous.'
  ]);
}

export async function getConversations() {
  return readJSON(files.conversations, []);
}

export async function saveConversations(conversations) {
  await writeJSON(files.conversations, conversations);
}

export async function getMessages() {
  return readJSON(files.messages, []);
}

export async function saveMessages(messages) {
  await writeJSON(files.messages, messages);
}

export async function getUsers() {
  return readJSON(files.users, []);
}

export async function saveUsers(users) {
  await writeJSON(files.users, users);
}

export async function getTheme() {
  return readJSON(files.theme, config.defaultTheme);
}

export async function saveTheme(theme) {
  await writeJSON(files.theme, theme);
}

export async function getPages() {
  return readJSON(files.pages, config.defaultPages);
}

export async function savePages(pages) {
  await writeJSON(files.pages, pages);
}

export async function getQuickReplies() {
  return readJSON(files.quickReplies, []);
}

export async function saveQuickReplies(list) {
  await writeJSON(files.quickReplies, list);
}
