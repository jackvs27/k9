async function loadTheme() {
  try {
    const [themeRes, pagesRes] = await Promise.all([
      fetch('/api/theme').then((res) => res.json()),
      fetch('/api/pages').then((res) => res.json())
    ]);
    const theme = themeRes.theme;
    const pages = pagesRes.pages;
    if (theme?.couleurs) {
      document.documentElement.style.setProperty('--color-primary', theme.couleurs.primaire);
      document.documentElement.style.setProperty('--color-secondary', theme.couleurs.secondaire);
      document.documentElement.style.setProperty('--color-bg', theme.couleurs.fond);
      document.documentElement.style.setProperty('--color-text', theme.couleurs.texte);
    }
    if (theme?.polices) {
      document.documentElement.style.setProperty('--font-titre', theme.polices.titre);
      document.documentElement.style.setProperty('--font-corps', theme.polices.corps);
    }
    if (theme?.logo) {
      const logos = document.querySelectorAll('.logo img');
      logos.forEach((img) => (img.src = theme.logo));
    }
    if (theme?.cssPerso) {
      let style = document.getElementById('custom-theme');
      if (!style) {
        style = document.createElement('style');
        style.id = 'custom-theme';
        document.head.appendChild(style);
      }
      style.textContent = theme.cssPerso;
    }
    applyPageContent(pages);
  } catch (error) {
    console.warn('Impossible de charger le thème', error);
  }
}

function applyPageContent(pages = {}) {
  const body = document.body;
  if (!body) return;
  const mapping = {
    'page-accueil': pages.accueil,
    'page-catalogue': pages.catalogue,
    'page-produit': pages.produit,
    'page-contact': pages.contact,
    'page-faq': pages.faq,
    'page-confidentialite': pages.confidentialite
  };
  for (const [cls, data] of Object.entries(mapping)) {
    if (!body.classList.contains(cls) || !data) continue;
    const h1 = document.querySelector('main h1');
    if (h1 && data.titre) h1.textContent = data.titre;
    const p = document.querySelector('main p');
    if (p && data.contenu) p.textContent = data.contenu;
    const hero = document.querySelector('.hero h1');
    if (hero && data.hero) hero.textContent = data.hero;
  }
  const footerYear = document.getElementById('year');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadTheme);
} else {
  loadTheme();
}
