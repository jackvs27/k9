import path from 'node:path';
import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import { config } from './config.js';
import {
  getConversations,
  saveConversations,
  getMessages,
  saveMessages,
  getUsers,
  saveUsers,
  getQuickReplies,
  saveQuickReplies
} from './storage.js';

const sseClients = new Map(); // conversationId -> Set(res)

function notify(conversationId, event, data) {
  const targets = sseClients.get(conversationId) || [];
  for (const res of targets) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

function registerStream(conversationId, res) {
  if (!sseClients.has(conversationId)) {
    sseClients.set(conversationId, new Set());
  }
  const bucket = sseClients.get(conversationId);
  bucket.add(res);
  res.on('close', () => {
    bucket.delete(res);
  });
}

export async function listConversations(filters = {}) {
  const conversations = await getConversations();
  return conversations
    .filter((conv) => {
      if (filters.status && conv.status !== filters.status) return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        return (
          conv.clientEmail?.toLowerCase().includes(term) ||
          conv.clientName?.toLowerCase().includes(term) ||
          conv.id.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function createConversation(payload) {
  const conversations = await getConversations();
  const conversation = {
    id: crypto.randomUUID(),
    clientName: payload.clientName,
    clientEmail: payload.clientEmail,
    topic: payload.topic || 'Support',
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: null,
    tags: payload.tags || [],
    gdprConsent: Boolean(payload.gdprConsent),
    lastMessagePreview: payload.message?.slice(0, 120) || ''
  };
  conversations.push(conversation);
  await saveConversations(conversations);
  if (payload.message) {
    await addMessage({
      conversationId: conversation.id,
      authorRole: 'client',
      authorName: payload.clientName,
      content: payload.message,
      attachments: payload.attachments || []
    });
  }
  return conversation;
}

export async function addMessage({ conversationId, authorRole, authorName, content, attachments = [] }) {
  const messages = await getMessages();
  const newMessage = {
    id: crypto.randomUUID(),
    conversationId,
    authorRole,
    authorName,
    content,
    attachments,
    status: 'sent',
    createdAt: new Date().toISOString()
  };
  messages.push(newMessage);
  await saveMessages(messages);
  const conversations = await getConversations();
  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation) {
    conversation.updatedAt = new Date().toISOString();
    conversation.lastMessagePreview = content.slice(0, 120);
    await saveConversations(conversations);
  }
  notify(conversationId, 'message', newMessage);
  return newMessage;
}

export async function getMessagesByConversation(conversationId) {
  const messages = await getMessages();
  return messages.filter((msg) => msg.conversationId === conversationId);
}

export async function markConversationResolved(conversationId, userId) {
  const conversations = await getConversations();
  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation) {
    conversation.status = 'resolved';
    conversation.resolvedBy = userId;
    conversation.resolvedAt = new Date().toISOString();
    await saveConversations(conversations);
    notify(conversationId, 'status', { status: 'resolved' });
  }
  return conversation;
}

export async function updateMessageStatus(conversationId, status) {
  const messages = await getMessages();
  let changed = false;
  for (const message of messages) {
    if (message.conversationId === conversationId) {
      message.status = status;
      changed = true;
    }
  }
  if (changed) {
    await saveMessages(messages);
    notify(conversationId, 'status', { status });
  }
}

export async function registerTyping(conversationId, authorRole) {
  notify(conversationId, 'typing', { authorRole, at: Date.now() });
}

export async function saveAttachment({ filename, base64, contentType }) {
  const fileId = `${Date.now()}-${filename}`.replace(/\s+/g, '-');
  const buffer = Buffer.from(base64, 'base64');
  const location = path.join(config.uploadDir, fileId);
  await fs.writeFile(location, buffer);
  return {
    url: `/uploads/${fileId}`,
    contentType,
    name: filename,
    size: buffer.length
  };
}

export async function listQuickReplies() {
  return getQuickReplies();
}

export async function updateQuickReplies(list) {
  await saveQuickReplies(list);
  return list;
}

export function attachStream(conversationId, res) {
  registerStream(conversationId, res);
}
