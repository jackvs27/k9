class ChatWidget {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'chat-widget';
    this.state = {
      conversationId: localStorage.getItem('chatConversationId'),
      authorName: localStorage.getItem('chatAuthorName') || '',
      authorEmail: localStorage.getItem('chatAuthorEmail') || '',
      messages: []
    };
    this.render();
    if (this.state.conversationId) {
      this.bootstrapConversation();
    }
  }

  render() {
    this.container.innerHTML = `
      <button class="toggle" aria-label="Ouvrir le chat">💬</button>
      <div class="chat-window">
        <header>
          <strong>Chat en direct</strong>
          <p class="muted">Réponse en moins d'une minute</p>
        </header>
        <div class="messages" id="widget-messages"></div>
        <form id="widget-form">
          <input name="name" placeholder="Votre nom" required />
          <input name="email" type="email" placeholder="Votre e-mail" required />
          <textarea name="message" placeholder="Écrire un message" required></textarea>
          <label class="consent">
            <input type="checkbox" name="gdprConsent" required /> J'accepte la conservation de mes données (RGPD).
          </label>
          <input type="file" name="attachment" />
          <button class="btn primary" type="submit">Envoyer</button>
          <span class="status" id="widget-status"></span>
        </form>
      </div>
    `;
    document.body.appendChild(this.container);
    this.toggleBtn = this.container.querySelector('.toggle');
    this.windowEl = this.container.querySelector('.chat-window');
    this.form = this.container.querySelector('#widget-form');
    this.messagesEl = this.container.querySelector('#widget-messages');
    this.statusEl = this.container.querySelector('#widget-status');
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
    this.form.message.addEventListener('input', () => this.sendTyping());
  }

  toggle() {
    this.windowEl.classList.toggle('active');
  }

  async bootstrapConversation() {
    const response = await fetch(`/api/chat/messages/${this.state.conversationId}`);
    if (response.ok) {
      const data = await response.json();
      this.state.messages = data.messages;
      this.renderMessages();
      this.openStream();
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(this.form);
    const message = formData.get('message');
    const payload = {
      clientName: formData.get('name'),
      clientEmail: formData.get('email'),
      message,
      gdprConsent: formData.get('gdprConsent') === 'on'
    };
    let attachments = [];
    const file = this.form.attachment.files[0];
    if (file) {
      attachments = [await this.uploadAttachment(file)];
    }
    if (!this.state.conversationId) {
      const res = await fetch('/api/chat/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        this.state.conversationId = data.conversation.id;
        localStorage.setItem('chatConversationId', this.state.conversationId);
        localStorage.setItem('chatAuthorName', payload.clientName);
        localStorage.setItem('chatAuthorEmail', payload.clientEmail);
        await this.bootstrapConversation();
      }
    } else {
      await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: this.state.conversationId,
          authorRole: 'client',
          authorName: payload.clientName,
          content: message,
          attachments
        })
      });
    }
    this.form.message.value = '';
    this.form.attachment.value = '';
  }

  async uploadAttachment(file) {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/chat/attachment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type, base64 })
    });
    const data = await res.json();
    return data.attachment;
  }

  renderMessages() {
    this.messagesEl.innerHTML = '';
    this.state.messages.forEach((msg) => {
      const div = document.createElement('div');
      div.className = `message ${msg.authorRole}`;
      div.innerHTML = `<strong>${msg.authorName || msg.authorRole}</strong><p>${msg.content}</p>`;
      if (msg.attachments?.length) {
        const list = document.createElement('ul');
        list.className = 'attachments';
        msg.attachments.forEach((att) => {
          const item = document.createElement('li');
          item.innerHTML = `<a href="${att.url}" target="_blank" rel="noopener">${att.name}</a>`;
          list.appendChild(item);
        });
        div.appendChild(list);
      }
      const status = document.createElement('span');
      status.className = 'status';
      status.textContent = msg.status;
      div.appendChild(status);
      this.messagesEl.appendChild(div);
    });
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  openStream() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    this.eventSource = new EventSource(`/api/chat/stream/${this.state.conversationId}`);
    this.eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      this.state.messages.push(data);
      this.renderMessages();
      this.statusEl.textContent = 'Reçu';
    });
    this.eventSource.addEventListener('status', (event) => {
      this.statusEl.textContent = JSON.parse(event.data).status;
    });
    this.eventSource.addEventListener('typing', () => {
      this.statusEl.textContent = 'Agent en train de répondre…';
    });
  }

  sendTyping() {
    if (!this.state.conversationId) return;
    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: this.state.conversationId, authorRole: 'client' })
    });
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.chat-widget')) {
      new ChatWidget();
    }
  });
}
