import path from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const ROOT_DIR = path.resolve(process.cwd(), '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT_DIR, 'uploads');

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  dataDir: DATA_DIR,
  uploadDir: UPLOAD_DIR,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  sessionSecret: process.env.SESSION_SECRET || 'session-secret',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:4000').split(',').map((o) => o.trim()),
  defaultTheme: {
    nomSite: 'Atelier Dialogue',
    couleurs: {
      primaire: '#2b59c3',
      secondaire: '#fbb13c',
      fond: '#f5f7fb',
      texte: '#1a1a1a'
    },
    polices: {
      titre: 'Poppins, Arial, sans-serif',
      corps: 'Inter, system-ui'
    },
    logo: '/assets/logo.svg',
    cssPerso: ''
  },
  defaultPages: {
    accueil: {
      titre: 'Accueil',
      hero: 'Un service client réactif pour vos visiteurs',
      contenu: 'Présentez vos offres et accompagnez vos clients avec un chat en direct.'
    },
    catalogue: {
      titre: 'Catalogue & Services',
      contenu: 'Détaillez vos prestations phares, leurs bénéfices et les garanties.'
    },
    produit: {
      titre: 'Page Produit',
      contenu: 'Structurez une présentation claire : caractéristiques, preuves sociales, FAQ dédiée.'
    },
    contact: {
      titre: 'Contact',
      contenu: 'Formulaire, informations de contact et disponibilité du support.'
    },
    faq: {
      titre: 'FAQ',
      contenu: 'Répondez aux questions fréquentes pour rassurer vos prospects.'
    },
    confidentialite: {
      titre: 'Politique de confidentialité',
      contenu: 'Expliquez vos engagements RGPD, la durée de conservation et les droits utilisateurs.'
    }
  }
};
