# Guide d'installation

## Prérequis
- Node.js 18+ (22 recommandé)
- npm (optionnel, aucune dépendance externe n'est requise mais les scripts sont fournis)
- Docker / docker compose (optionnel)

## Installation locale
1. Clonez le dépôt.
2. Initialisez les dossiers de données (créés automatiquement au premier lancement) :
   ```bash
   mkdir -p data uploads
   ```
3. Lancez le serveur :
   ```bash
   cd server
   npm run dev
   ```
   Le site et l'API sont servis sur http://localhost:4000

## Variables d'environnement
| Variable | Description | Valeur par défaut |
| --- | --- | --- |
| `PORT` | Port HTTP de l'API/site | `4000` |
| `DATA_DIR` | Chemin vers le stockage JSON (conversations, utilisateurs…) | `../data` |
| `UPLOAD_DIR` | Dossier pour les pièces jointes | `../uploads` |
| `ALLOWED_ORIGINS` | Liste CSV des origines autorisées pour CORS | `http://localhost:4000` |
| `SESSION_SECRET` | Secret pour CSRF/sessions | `session-secret` |
| `JWT_SECRET` | Secret utilisé pour la génération des tokens éventuels | `dev-secret` |

## Docker
```
docker compose up --build
```
- `web` sert le site + API.
- `db` (PostgreSQL) et `minio` sont disponibles pour une intégration future.

## Tests
```
cd server
npm test
```

## Export des conversations
```
node scripts/export_conversations.js
```
Le script écrit `conversation-export.json` à la racine du projet.
