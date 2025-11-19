# Documentation API (REST + SSE)

Base URL : `http://localhost:4000`

## Chat public

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/api/chat/conversation` | Crée une conversation `{ clientName, clientEmail, message, gdprConsent }`. |
| POST | `/api/chat/message` | Ajoute un message `{ conversationId, authorRole, authorName, content, attachments }`. |
| GET | `/api/chat/messages/:conversationId` | Liste les messages. |
| POST | `/api/chat/typing` | Indicateur de saisie `{ conversationId, authorRole }`. |
| POST | `/api/chat/status` | Met à jour les statuts `sent/delivered/read`. |
| POST | `/api/chat/attachment` | Charge une pièce jointe `{ filename, contentType, base64 }`. Retourne `{ url }`. |
| GET | `/api/chat/stream/:conversationId` | Flux SSE (`message`, `typing`, `status`). |

## Pages / thème
| GET `/api/pages` | Récupère les contenus.
| GET `/api/theme` | Récupère le thème.

## Auth Admin
| POST `/api/auth/login` | Body `{ email, password }` → `{ user, csrfToken }` + cookie `sid`.
| POST `/api/auth/logout` | Supprime la session.

## Admin (auth + en-tête `x-csrf-token` pour les mutations)
| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/admin/conversations?status=&search=` | Liste paginée (tri inverse chrono). |
| POST | `/api/admin/conversations/:id` | Marque résolu. |
| GET | `/api/admin/quick-replies` | Réponses rapides. |
| PUT | `/api/admin/quick-replies` | Met à jour la liste. |
| PUT | `/api/admin/theme` | Met à jour le thème (couleurs/polices/logo/CSS). |
| PUT | `/api/admin/pages` | Met à jour titres + contenus. |
| GET | `/api/admin/users` | Liste les utilisateurs (sans hash). |
| POST | `/api/admin/users` | Crée un utilisateur `{ nom, email, password, role, permissions[] }`. |
| PUT | `/api/admin/users/:id` | Met à jour un utilisateur / active/désactive. |
| GET | `/api/admin/export` | Export complet (conversations + messages). |

## RGPD
| POST `/api/rgpd/export` | Body `{ email }` → JSON complet. |
| POST `/api/rgpd/delete` | Body `{ email }` → suppression des conversations/messages liés. |

## Scripts
- `node scripts/export_conversations.js` : export global identique à `/api/admin/export`.

## Sécurité
- CSP, cookies HttpOnly, CSRF double submit, sanitation des champs.
- Les pièces jointes sont stockées dans `UPLOAD_DIR` et servies via `/uploads/*`.
