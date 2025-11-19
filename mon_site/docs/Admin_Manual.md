# Manuel Admin (FR)

## Connexion
- Rendez-vous sur `/admin.html`.
- Identifiants par défaut : `admin@example.com` / `admin123!`.
- Les sessions sont sécurisées (cookies HttpOnly + CSRF). Déconnectez-vous en supprimant les cookies si nécessaire.

## Vue Conversations
- **Recherche** : champ texte + filtre de statut (ouvert/résolu).
- **Réponses rapides** : cliquez sur une suggestion pour remplir le champ de réponse.
- **Pièces jointes** : chargez un fichier via le champ prévu avant l'envoi.
- **Statuts** : utilisez « Marquer résolu » pour clore une conversation (statut synchronisé côté client).

## Personnalisation (Thème & Pages)
1. Onglet « Thème & Pages ».
2. Modifiez les couleurs, polices, logo ou CSS personnalisé. Une prévisualisation instantanée est affichée.
3. Sauvegardez pour appliquer sur toutes les pages publiques et le widget.
4. La section « Textes / Métadonnées » permet d'éditer titres, hero et contenu de chaque page. Les valeurs sont mises à jour immédiatement après validation.

## Gestion des utilisateurs
- La table liste les agents/Admins avec leurs permissions.
- Bouton « Désactiver » pour suspendre un compte.
- Formulaire « Nouvel utilisateur » : définissez nom, email, mot de passe, rôle et permissions (séparées par des virgules).

## Centre RGPD
- **Export** : renseignez l'email client, cliquez sur « Exporter » pour télécharger un JSON contenant conversations + messages.
- **Suppression** : même formulaire, le système purge conversations/messages associés.
- **Export global** : bouton « Télécharger toutes les conversations » (équivalent API `/api/admin/export`).

## Réponses rapides
- Bouton « Modifier… » dans l'onglet Conversations → saisir des réponses séparées par des virgules.

## Thème et titres depuis l'Admin
- Tous les changements sont persistés (fichiers `data/theme.json` et `data/pages.json`).
- Vous pouvez réinitialiser en supprimant ces fichiers avant redémarrage.
