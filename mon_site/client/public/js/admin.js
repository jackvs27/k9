const state = {
  csrf: null,
  user: null,
  conversations: [],
  selectedConversation: null,
  stream: null
};

const loginForm = document.getElementById('login-form');
const loginPanel = document.getElementById('login-panel');
const adminPanels = document.getElementById('admin-panels');
const conversationList = document.getElementById('conversation-list');
const messagesEl = document.getElementById('messages');
const quickRepliesEl = document.getElementById('quick-replies');
const replyForm = document.getElementById('reply-form');
const replyAttachment = document.getElementById('reply-attachment');
const markResolvedBtn = document.getElementById('mark-resolved');
const searchInput = document.getElementById('search-conv');
const statusSelect = document.getElementById('filter-status');
const refreshBtn = document.getElementById('refresh-conv');
const tabs = document.querySelectorAll('.tabs button');

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') })
  });
  if (!res.ok) {
    alert('Identifiants incorrects');
    return;
  }
  const data = await res.json();
  state.user = data.user;
  state.csrf = data.csrfToken;
  loginPanel.classList.add('hidden');
  adminPanels.classList.remove('hidden');
  fetchConversations();
  loadQuickReplies();
  loadThemeAndPages();
  loadUsers();
});

async function fetchConversations() {
  const url = new URL('/api/admin/conversations', window.location.origin);
  if (searchInput.value) url.searchParams.set('search', searchInput.value);
  if (statusSelect.value) url.searchParams.set('status', statusSelect.value);
  const res = await fetch(url);
  const data = await res.json();
  state.conversations = data.conversations;
  renderConversations();
}

function renderConversations() {
  conversationList.innerHTML = '';
  state.conversations.forEach((conv) => {
    const div = document.createElement('div');
    div.className = 'conversation-item';
    if (state.selectedConversation?.id === conv.id) {
      div.classList.add('active');
    }
    div.innerHTML = `
      <strong>${conv.clientName || 'Visiteur'}</strong>
      <p>${conv.lastMessagePreview || '—'}</p>
      <small>${conv.status}</small>
    `;
    div.addEventListener('click', () => selectConversation(conv));
    conversationList.appendChild(div);
  });
}

async function selectConversation(conversation) {
  state.selectedConversation = conversation;
  renderConversations();
  const res = await fetch(`/api/chat/messages/${conversation.id}`);
  const data = await res.json();
  renderMessages(data.messages);
  subscribe(conversation.id);
}

function renderMessages(messages = []) {
  messagesEl.innerHTML = '';
  messages.forEach((msg) => {
    const div = document.createElement('div');
    div.className = `message ${msg.authorRole}`;
    div.innerHTML = `<strong>${msg.authorName || msg.authorRole}</strong><p>${msg.content}</p>`;
    if (msg.attachments?.length) {
      const list = document.createElement('ul');
      msg.attachments.forEach((att) => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${att.url}" target="_blank">${att.name}</a>`;
        list.appendChild(li);
      });
      div.appendChild(list);
    }
    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = msg.status;
    div.appendChild(status);
    messagesEl.appendChild(div);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function subscribe(conversationId) {
  if (state.stream) state.stream.close();
  state.stream = new EventSource(`/api/chat/stream/${conversationId}`);
  state.stream.addEventListener('message', async () => {
    const res = await fetch(`/api/chat/messages/${conversationId}`);
    const data = await res.json();
    renderMessages(data.messages);
  });
}

replyForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selectedConversation) return;
  const formData = new FormData(replyForm);
  let attachments = [];
  if (replyAttachment?.files[0]) {
    attachments = [await uploadAttachment(replyAttachment.files[0])];
  }
  await fetch('/api/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: state.selectedConversation.id,
      authorRole: 'admin',
      authorName: state.user.nom,
      content: formData.get('message'),
      attachments
    })
  });
  replyForm.reset();
  if (replyAttachment) {
    replyAttachment.value = '';
  }
});

markResolvedBtn?.addEventListener('click', async () => {
  if (!state.selectedConversation) return;
  await fetch(`/api/admin/conversations/${state.selectedConversation.id}`, {
    method: 'POST',
    headers: { 'x-csrf-token': state.csrf }
  });
  fetchConversations();
});

async function uploadAttachment(file) {
  const base64 = await fileToBase64(file);
  const res = await fetch('/api/chat/attachment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, base64 })
  });
  const data = await res.json();
  return data.attachment;
}

async function loadQuickReplies() {
  const res = await fetch('/api/admin/quick-replies');
  const data = await res.json();
  renderQuickReplies(data.quickReplies);
}

function renderQuickReplies(list = []) {
  quickRepliesEl.innerHTML = '';
  list.forEach((reply) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = reply;
    btn.addEventListener('click', () => {
      replyForm.message.value = reply;
      replyForm.message.focus();
    });
    quickRepliesEl.appendChild(btn);
  });
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Modifier…';
  editBtn.type = 'button';
  editBtn.addEventListener('click', async () => {
    const updated = prompt('Entrez les réponses rapides séparées par des virgules');
    if (!updated) return;
    const items = updated.split(',').map((item) => item.trim()).filter(Boolean);
    await fetch('/api/admin/quick-replies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': state.csrf },
      body: JSON.stringify({ quickReplies: items })
    });
    renderQuickReplies(items);
  });
  quickRepliesEl.appendChild(editBtn);
}

searchInput?.addEventListener('input', debounce(fetchConversations, 400));
statusSelect?.addEventListener('change', fetchConversations);
refreshBtn?.addEventListener('click', fetchConversations);

tabs.forEach((tab) =>
  tab.addEventListener('click', () => {
    tabs.forEach((btn) => btn.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((panel) => panel.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
  })
);

const themeForm = document.getElementById('theme-form');
const pagesForm = document.getElementById('pages-form');
const pagesGrid = document.getElementById('pages-grid');
const themePreview = document.getElementById('theme-preview');

async function loadThemeAndPages() {
  const [themeRes, pagesRes] = await Promise.all([
    fetch('/api/theme').then((r) => r.json()),
    fetch('/api/pages').then((r) => r.json())
  ]);
  populateThemeForm(themeRes.theme);
  populatePagesForm(pagesRes.pages);
}

function populateThemeForm(theme) {
  if (!themeForm) return;
  themeForm.nomSite.value = theme.nomSite || '';
  themeForm['couleurs.primaire'].value = theme.couleurs.primaire;
  themeForm['couleurs.secondaire'].value = theme.couleurs.secondaire;
  themeForm['couleurs.fond'].value = theme.couleurs.fond;
  themeForm['couleurs.texte'].value = theme.couleurs.texte;
  themeForm['polices.titre'].value = theme.polices.titre;
  themeForm['polices.corps'].value = theme.polices.corps;
  themeForm.logo.value = theme.logo;
  themeForm.cssPerso.value = theme.cssPerso;
  themeForm.addEventListener('input', () => previewTheme(themeForm));
  previewTheme(themeForm);
}

function previewTheme(form) {
  themePreview.style.setProperty('--color-primary', form['couleurs.primaire'].value);
  themePreview.innerHTML = `
    <div class="preview-card">
      <strong>${form.nomSite.value || 'Aperçu'}</strong>
      <p style="color:${form['couleurs.texte'].value}">Couleurs mises à jour en direct.</p>
    </div>`;
}

themeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    nomSite: themeForm.nomSite.value,
    couleurs: {
      primaire: themeForm['couleurs.primaire'].value,
      secondaire: themeForm['couleurs.secondaire'].value,
      fond: themeForm['couleurs.fond'].value,
      texte: themeForm['couleurs.texte'].value
    },
    polices: {
      titre: themeForm['polices.titre'].value,
      corps: themeForm['polices.corps'].value
    },
    logo: themeForm.logo.value,
    cssPerso: themeForm.cssPerso.value
  };
  await fetch('/api/admin/theme', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': state.csrf },
    body: JSON.stringify(payload)
  });
  alert('Thème mis à jour');
});

function populatePagesForm(pages) {
  pagesGrid.innerHTML = '';
  Object.entries(pages).forEach(([key, data]) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'page-card';
    wrapper.innerHTML = `
      <label>Titre<input data-field="titre" data-key="${key}" value="${data.titre || ''}" /></label>
      ${data.hero !== undefined ? `<label>Hero<input data-field="hero" data-key="${key}" value="${data.hero}" /></label>` : ''}
      <label>Contenu<textarea data-field="contenu" data-key="${key}" rows="4">${data.contenu || ''}</textarea></label>
    `;
    pagesGrid.appendChild(wrapper);
  });
  pagesForm.dataset.pages = JSON.stringify(pages);
}

pagesForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const original = JSON.parse(pagesForm.dataset.pages || '{}');
  const updated = { ...original };
  pagesGrid.querySelectorAll('[data-field]').forEach((field) => {
    updated[field.dataset.key][field.dataset.field] = field.value;
  });
  await fetch('/api/admin/pages', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': state.csrf },
    body: JSON.stringify({ pages: updated })
  });
  alert('Pages mises à jour');
});

const usersTable = document.querySelector('#users-table tbody');
const userForm = document.getElementById('user-form');

async function loadUsers() {
  const res = await fetch('/api/admin/users');
  const data = await res.json();
  renderUsers(data.users);
}

function renderUsers(users = []) {
  usersTable.innerHTML = '';
  users.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.nom}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${(user.permissions || []).join(', ')}</td>
      <td><button data-id="${user.id}">${user.actif ? 'Désactiver' : 'Activer'}</button></td>`;
    row.querySelector('button').addEventListener('click', () => toggleUser(user));
    usersTable.appendChild(row);
  });
}

async function toggleUser(user) {
  user.actif = !user.actif;
  await fetch(`/api/admin/users/${user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': state.csrf },
    body: JSON.stringify(user)
  });
  loadUsers();
}

userForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(userForm);
  await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': state.csrf },
    body: JSON.stringify({
      nom: formData.get('nom'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
      permissions: formData.get('permissions').split(',').map((p) => p.trim()).filter(Boolean)
    })
  });
  userForm.reset();
  loadUsers();
});

const exportForm = document.getElementById('export-form');
const deleteForm = document.getElementById('delete-form');
const downloadExportBtn = document.getElementById('download-export');

exportForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(exportForm);
  const res = await fetch('/api/rgpd/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.get('email') })
  });
  const data = await res.json();
  downloadJSON(data, `export-${formData.get('email')}.json`);
});

deleteForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(deleteForm);
  if (!confirm('Supprimer définitivement ces données ?')) return;
  await fetch('/api/rgpd/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.get('email') })
  });
  alert('Données supprimées');
  fetchConversations();
});

downloadExportBtn?.addEventListener('click', async () => {
  const res = await fetch('/api/admin/export');
  const data = await res.json();
  downloadJSON(data, 'conversations.json');
});

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
