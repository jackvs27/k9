#!/usr/bin/env node
import path from 'node:path';
import { promises as fs } from 'node:fs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
process.env.DATA_DIR = DATA_DIR;
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const storage = await import('../server/src/storage.js');
const chat = await import('../server/src/chatService.js');

await storage.bootstrapStorage();
const conversations = await storage.getConversations();
const exportPayload = [];
for (const conv of conversations) {
  const messages = await chat.getMessagesByConversation(conv.id);
  exportPayload.push({ ...conv, messages });
}
const target = path.join(process.cwd(), 'conversation-export.json');
await fs.writeFile(target, JSON.stringify(exportPayload, null, 2), 'utf8');
console.log(`Export créé : ${target}`);
