let autoInterval = null;
let isLoading = false;

async function loadMessages() {
  if (isLoading) return;
  
  isLoading = true;
  try {
    const res = await fetch('/messages');
    if (!res.ok) throw new Error('Erreur réseau');
    
    const messages = await res.json();
    const list = document.getElementById('messages-list');
    
    if (messages.length === 0) {
      list.innerHTML = '<li class="list-group-item text-center text-muted">Aucun message trouvé</li>';
      return;
    }
    
    list.innerHTML = '';
    messages.forEach(msg => {
      const li = document.createElement('li');
      li.className = 'list-group-item message-item';
      
      const contentDiv = document.createElement('div');
      contentDiv.textContent = msg.content;
      
      const metaDiv = document.createElement('div');
      metaDiv.className = 'message-meta';
      metaDiv.innerHTML = `
        <small class="message-id">ID: ${msg.id}</small><br>
        <small class="timestamp">${formatDate(msg.received_at)}</small>
      `;
      
      li.appendChild(contentDiv);
      li.appendChild(metaDiv);
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Erreur:', error);
    const list = document.getElementById('messages-list');
    list.innerHTML = '<li class="list-group-item text-center text-danger">Erreur de chargement des messages</li>';
  } finally {
    isLoading = false;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

async function sendMessage(content) {
  try {
    const response = await fetch('/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content }),
    });
    
    if (!response.ok) throw new Error('Échec de l\'envoi');
    
    loadMessages();
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de l\'envoi du message');
  }
}


document.getElementById('message-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  if (message) {
    await sendMessage(message);
    input.value = '';
    input.focus();
  }
});

document.getElementById('mode-select').addEventListener('change', (e) => {
  const mode = e.target.value;
  const form = document.getElementById('message-form');
  const status = document.getElementById('auto-status');

  if (mode === 'auto') {
    form.style.display = 'none';
    status.textContent = '📡 Mode automatique activé : envoi de messages horodatés toutes les 5 secondes...';

 
    const generateAutoMessage = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      return `Message auto à ${timeString}`;
    };


    sendMessage(generateAutoMessage());
    

    autoInterval = setInterval(() => {
      sendMessage(generateAutoMessage());
    }, 5000);
  } else {
    form.style.display = 'block';
    status.textContent = '';
    if (autoInterval) {
      clearInterval(autoInterval);
      autoInterval = null;
    }
  }
});


setInterval(loadMessages, 2000);
loadMessages();


window.addEventListener('offline', () => {
  const list = document.getElementById('messages-list');
  list.innerHTML = '<li class="list-group-item text-center text-danger">Connexion perdue - Vérifiez votre réseau</li>';
  if (autoInterval) {
    clearInterval(autoInterval);
    autoInterval = null;
  }
});