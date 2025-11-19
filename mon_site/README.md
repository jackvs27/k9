# Atelier Dialogue

Plateforme web responsive (FR) combinant site marketing, widget de chat temps réel client↔admin, console d'administration, conformité RGPD et API REST. Le projet fonctionne sans dépendances externes pour faciliter l'audit et inclut un déploiement Docker prêt à l'emploi.

## Fonctionnalités clés

- Pages publiques : Accueil, Catalogue/Services, Page produit, Contact, FAQ et Politique de confidentialité.
- Widget de chat 1:1 accessible sur chaque page avec SSE, pièces jointes, indicateurs de saisie et accusés (envoyé/réception/lu).
- Espace Admin : filtres, recherche, réponses rapides, suivi des statuts, marquage résolu, gestion utilisateurs/permissions.
- Personnalisation : modification des textes, métadonnées, couleurs, polices, logo et CSS personnalisé avec prévisualisation en direct.
- Sécurité : cookies HttpOnly, CSRF double-submit, CSP stricte, validation/sanitation de toutes les entrées.
- RGPD : export/suppression, consentement explicite, script CLI `scripts/export_conversations.js`.
- Documentation : API détaillée, manuel Admin et guide d'installation.
- Tests Node natifs (`node --test`).

## Structure

```
client/              # Pages statiques + widget + scripts Admin
server/              # API REST + SSE + stockage JSON
scripts/             # Utilitaires CLI
Dockerfile           # Image unique Node 22
```

## Démarrage rapide

```bash
# 1. Installer les dépendances système (Node 22 est fourni dans l'environnement)
cd server
npm install   # (facultatif, aucune dépendance externe requise)

# 2. Lancer l'API + site statique
npm run dev
# Le site est accessible sur http://localhost:4000
```

### Compte Admin par défaut

- Email : `admin@example.com`
- Mot de passe : `admin123!`

### Tests

```
cd server
npm test
```

### Docker / docker-compose

```
docker compose up --build
```

La composition démarre :
- `web` (Node) sur `http://localhost:4000`
- `db` (PostgreSQL 16) prêt pour une migration future
- `minio` (stockage S3-compatible) pour les pièces jointes

## Documentation

- [Guide d'installation](docs/Installation.md)
- [Manuel Admin](docs/Admin_Manual.md)
- [Documentation API](docs/API.md)

## Export des conversations

```
node scripts/export_conversations.js
```

Un fichier `conversation-export.json` est généré à la racine.
