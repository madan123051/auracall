/* ============================================
   DRISHYA VIDEO CALL — Interactive Logic
   ============================================ */

// ====== CONTACTS DATA ======
const contacts = [
  { name: 'Arjun Mehta',    initial: 'A', avatarClass: 'avatar-teal',   status: 'Online', online: true,  verified: true,  role: 'Seller' },
  { name: 'Priya Sharma',   initial: 'P', avatarClass: 'avatar-purple', status: 'Online', online: true,  verified: true,  role: 'Seller' },
  { name: 'Rahul Verma',    initial: 'R', avatarClass: 'avatar-orange', status: 'Last seen 5m ago', online: false, verified: false, role: 'Buyer' },
  { name: 'Sneha Patel',    initial: 'S', avatarClass: 'avatar-pink',   status: 'Online', online: true,  verified: true,  role: 'Seller' },
  { name: 'Vikram Singh',   initial: 'V', avatarClass: 'avatar-blue',   status: 'Last seen 20m ago', online: false, verified: false, role: 'Buyer' },
  { name: 'Ananya Iyer',    initial: 'A', avatarClass: 'avatar-green',  status: 'Online', online: true,  verified: true,  role: 'Seller' },
  { name: 'Karthik Reddy',  initial: 'K', avatarClass: 'avatar-indigo', status: 'Last seen 1h ago', online: false, verified: false, role: 'Buyer' },
  { name: 'Meera Joshi',    initial: 'M', avatarClass: 'avatar-amber',  status: 'Online', online: true,  verified: false, role: 'Buyer' },
];

// ====== STATE ======
const state = {
  screen: 'home',
  caller: null,
  muted: false,
  cameraOff: false,
  screenSharing: false,
  chatOpen: false,
  photosOpen: false,
  callSeconds: 0,
  timerInterval: null,
};

// ====== CHAT MESSAGES ======
const chatMessages = [
  { text: 'Hi! Can you show me the product?', sent: false, time: '11:02 AM' },
  { text: 'Sure! Let me share the photos 📸', sent: true, time: '11:02 AM' },
];

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
  renderContacts(contacts);
  renderChatMessages();
});

// ====== RENDER CONTACTS ======
function renderContacts(list) {
  const container = document.getElementById('contact-list');
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <p>No contacts found</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map((c, i) => `
    <div class="contact-item" onclick="startOutgoingCall(${contacts.indexOf(c)})">
      <div class="contact-avatar ${c.avatarClass}">
        ${c.initial}
        ${c.online ? '<div class="online-dot"></div>' : ''}
      </div>
      <div class="contact-info">
        <div class="contact-name">
          ${c.name}
          ${c.verified ? '<span class="verified">✓</span>' : ''}
        </div>
        <div class="contact-status">${c.role} · ${c.status}</div>
      </div>
      <button class="contact-call-btn" onclick="event.stopPropagation(); startOutgoingCall(${contacts.indexOf(c)})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94"/>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </button>
    </div>
    ${i < list.length - 1 ? '<div class="list-divider"></div>' : ''}
  `).join('');
}

// ====== SEARCH / FILTER ======
function filterContacts() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const filtered = q ? contacts.filter(c => c.name.toLowerCase().includes(q)) : contacts;
  renderContacts(filtered);
}

// ====== SCREEN TRANSITIONS ======
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');
  state.screen = name;
}

// ====== INCOMING CALL ======
function simulateIncoming() {
  // Pick a random online contact
  const onlineContacts = contacts.filter(c => c.online);
  const caller = onlineContacts[Math.floor(Math.random() * onlineContacts.length)];
  state.caller = caller;

  // Update incoming screen UI
  const avatar = document.getElementById('incoming-avatar');
  avatar.className = 'caller-avatar-large ' + caller.avatarClass;
  avatar.textContent = caller.initial;
  document.getElementById('incoming-name').textContent = caller.name;

  showScreen('incoming');
}

// ====== OUTGOING CALL ======
function startOutgoingCall(contactIndex) {
  const caller = contacts[contactIndex];
  state.caller = caller;

  // Update outgoing screen
  const avatar = document.getElementById('outgoing-avatar');
  avatar.className = 'caller-avatar-large ' + caller.avatarClass;
  avatar.textContent = caller.initial;
  document.getElementById('outgoing-name').textContent = caller.name;

  showScreen('outgoing');

  // Auto-connect after 3 seconds
  setTimeout(() => {
    if (state.screen === 'outgoing') {
      goToConnecting();
    }
  }, 3000);
}

// ====== ACCEPT / CONNECT ======
function acceptCall() {
  goToConnecting();
}

function goToConnecting() {
  const caller = state.caller;
  if (!caller) return;

  // Update connecting screen
  const avatar = document.getElementById('connecting-avatar');
  avatar.className = 'connecting-avatar ' + caller.avatarClass;
  avatar.textContent = caller.initial;
  document.getElementById('connecting-name').textContent = 'Connecting to ' + caller.name.split(' ')[0];

  showScreen('connecting');

  // Auto-transition to active call
  setTimeout(() => {
    if (state.screen === 'connecting') {
      startActiveCall();
    }
  }, 2000);
}

function startActiveCall() {
  const caller = state.caller;
  if (!caller) return;

  // Update active call screen
  const remoteAvatar = document.getElementById('remote-avatar');
  remoteAvatar.className = 'remote-avatar ' + caller.avatarClass;
  remoteAvatar.textContent = caller.initial;
  document.getElementById('active-call-name').textContent = caller.name;
  document.getElementById('remote-tag-name').textContent = caller.name;

  // Reset states
  state.muted = false;
  state.cameraOff = false;
  state.screenSharing = false;
  state.chatOpen = false;
  state.photosOpen = false;
  state.callSeconds = 0;
  updateControlStates();
  document.getElementById('photos-overlay').classList.remove('open');
  document.getElementById('chat-sidebar').classList.remove('open');
  document.getElementById('screen-share-badge').classList.remove('visible');

  showScreen('active');
  startTimer();
}

// ====== REJECT / END ======
function rejectCall() {
  state.caller = null;
  showScreen('home');
}

function endCall() {
  stopTimer();
  state.caller = null;
  state.chatOpen = false;
  state.photosOpen = false;
  showScreen('home');
}

// ====== CALL TIMER ======
function startTimer() {
  stopTimer();
  state.callSeconds = 0;
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.callSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(state.callSeconds / 60).toString().padStart(2, '0');
  const secs = (state.callSeconds % 60).toString().padStart(2, '0');
  document.getElementById('call-timer').textContent = mins + ':' + secs;
}

// ====== CONTROL TOGGLES ======
function toggleMute() {
  state.muted = !state.muted;
  updateControlStates();
}

function toggleCamera() {
  state.cameraOff = !state.cameraOff;
  updateControlStates();

  // Show/hide remote avatar based on camera state (simulate)
  const remoteAvatar = document.getElementById('remote-avatar');
  const cameraSim = document.querySelector('.camera-on-simulation');
  if (state.cameraOff) {
    remoteAvatar.style.opacity = '0.8';
    cameraSim.style.opacity = '0';
  } else {
    remoteAvatar.style.opacity = '0.6';
    cameraSim.style.opacity = '1';
  }
}

function toggleScreenShare() {
  state.screenSharing = !state.screenSharing;
  updateControlStates();
  const badge = document.getElementById('screen-share-badge');
  badge.classList.toggle('visible', state.screenSharing);
}

function togglePhotos() {
  state.photosOpen = !state.photosOpen;
  document.getElementById('photos-overlay').classList.toggle('open', state.photosOpen);
  updateControlStates();

  // Close chat if photos open
  if (state.photosOpen && state.chatOpen) {
    state.chatOpen = false;
    document.getElementById('chat-sidebar').classList.remove('open');
    updateControlStates();
  }
}

function toggleChat() {
  state.chatOpen = !state.chatOpen;
  document.getElementById('chat-sidebar').classList.toggle('open', state.chatOpen);
  updateControlStates();

  // Close photos if chat open
  if (state.chatOpen && state.photosOpen) {
    state.photosOpen = false;
    document.getElementById('photos-overlay').classList.remove('open');
    updateControlStates();
  }

  // Focus input when opening
  if (state.chatOpen) {
    setTimeout(() => document.getElementById('chat-input').focus(), 350);
  }
}

function updateControlStates() {
  const btnMute = document.getElementById('btn-mute');
  const btnCamera = document.getElementById('btn-camera');
  const btnScreen = document.getElementById('btn-screen');
  const btnPhotos = document.getElementById('btn-photos');
  const btnChat = document.getElementById('btn-chat');

  // Mute
  btnMute.className = 'control-btn' + (state.muted ? ' muted-state' : '');
  btnMute.setAttribute('data-tooltip', state.muted ? 'Unmute' : 'Mute');

  // Camera
  btnCamera.className = 'control-btn' + (state.cameraOff ? ' muted-state' : '');
  btnCamera.setAttribute('data-tooltip', state.cameraOff ? 'Turn On Camera' : 'Turn Off Camera');

  // Screen Share
  btnScreen.className = 'control-btn' + (state.screenSharing ? ' active' : '');
  btnScreen.setAttribute('data-tooltip', state.screenSharing ? 'Stop Sharing' : 'Share Screen');

  // Photos
  btnPhotos.className = 'control-btn' + (state.photosOpen ? ' active' : '');

  // Chat
  btnChat.className = 'control-btn' + (state.chatOpen ? ' active' : '');
}

// ====== CHAT ======
function renderChatMessages() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = chatMessages.map(m => `
    <div class="chat-msg ${m.sent ? 'sent' : 'received'}">
      ${m.text}
      <span class="msg-time">${m.time}</span>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  chatMessages.push({ text, sent: true, time });
  renderChatMessages();
  input.value = '';

  // Simulate reply after 1.5s
  setTimeout(() => {
    const replies = [
      'Sounds great! 👍',
      'Let me check that for you',
      'Yes, it\'s available!',
      'I can offer a discount on this one',
      'What do you think about the quality?',
      'Sure, I\'ll share more details',
      'The shipping will take 3-5 days',
      'Would you like to see more colors?',
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    chatMessages.push({ text: reply, sent: false, time: replyTime });
    renderChatMessages();
  }, 1500);
}

function handleChatKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendChatMessage();
  }
}
