import path from 'node:path';
import { promises as fs } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATA_DIR = path.join(process.cwd(), 'tmp-data');
process.env.UPLOAD_DIR = path.join(process.cwd(), 'tmp-data', 'uploads');

await fs.rm(process.env.DATA_DIR, { recursive: true, force: true });
await fs.mkdir(process.env.DATA_DIR, { recursive: true });
await fs.mkdir(process.env.UPLOAD_DIR, { recursive: true });

const storage = await import('../src/storage.js');
await storage.bootstrapStorage();
const chat = await import('../src/chatService.js');

await test('crée une conversation avec message initial', async () => {
  const conversation = await chat.createConversation({
    clientName: 'Test',
    clientEmail: 'test@example.com',
    message: 'Bonjour',
    gdprConsent: true
  });
  assert.ok(conversation.id);
  const messages = await chat.getMessagesByConversation(conversation.id);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].content, 'Bonjour');
});

await test('ajoute un message et met à jour l\'aperçu', async () => {
  const conversation = await chat.createConversation({ clientName: 'User2', clientEmail: 'user2@demo.fr' });
  await chat.addMessage({ conversationId: conversation.id, authorRole: 'admin', authorName: 'Agent', content: 'Hello' });
  const conversations = await storage.getConversations();
  const updated = conversations.find((c) => c.id === conversation.id);
  assert.equal(updated.lastMessagePreview, 'Hello');
});
