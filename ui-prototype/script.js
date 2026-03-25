/* ============================================
   DRISHYA — Video Call & Chat App
   Complete JavaScript
   ============================================ */

(function () {
  'use strict';

  // ─── DATA ─────────────────────────────────────────
  const contacts = [
    { id: 0, name: 'Arjun Mehta', initial: 'A', avatarClass: 'avatar-teal', status: 'Online', online: true, verified: true, role: 'Seller', rating: 4.8 },
    { id: 1, name: 'Priya Sharma', initial: 'P', avatarClass: 'avatar-purple', status: 'Online', online: true, verified: true, role: 'Seller', rating: 4.9 },
    { id: 2, name: 'Rahul Verma', initial: 'R', avatarClass: 'avatar-orange', status: 'Last seen 5m ago', online: false, verified: false, role: 'Buyer', rating: 4.2 },
    { id: 3, name: 'Sneha Patel', initial: 'S', avatarClass: 'avatar-pink', status: 'Online', online: true, verified: true, role: 'Seller', rating: 4.7 },
    { id: 4, name: 'Vikram Singh', initial: 'V', avatarClass: 'avatar-blue', status: 'Last seen 20m ago', online: false, verified: false, role: 'Buyer', rating: 4.0 },
    { id: 5, name: 'Ananya Iyer', initial: 'A', avatarClass: 'avatar-green', status: 'Online', online: true, verified: true, role: 'Seller', rating: 4.6 },
    { id: 6, name: 'Karthik Reddy', initial: 'K', avatarClass: 'avatar-indigo', status: 'Last seen 1h ago', online: false, verified: false, role: 'Buyer', rating: 3.9 },
    { id: 7, name: 'Meera Joshi', initial: 'M', avatarClass: 'avatar-amber', status: 'Online', online: true, verified: false, role: 'Buyer', rating: 4.3 },
  ];

  const callHistory = [
    { contactId: 0, type: 'incoming', time: '10:30 AM', duration: '12:45' },
    { contactId: 1, type: 'outgoing', time: '9:15 AM', duration: '8:20' },
    { contactId: 2, type: 'missed', time: 'Yesterday', duration: '' },
    { contactId: 3, type: 'incoming', time: 'Yesterday', duration: '23:10' },
    { contactId: 4, type: 'outgoing', time: 'Mon', duration: '5:32' },
    { contactId: 5, type: 'missed', time: 'Mon', duration: '' },
    { contactId: 6, type: 'incoming', time: 'Sun', duration: '15:00' },
    { contactId: 7, type: 'outgoing', time: 'Sun', duration: '3:12' },
  ];

  const conversations = {
    0: {
      unread: 2,
      lastTime: '10:32 AM',
      messages: [
        { text: 'Hi Madan! I have some new products to show you.', sent: false, time: '10:20 AM', read: true },
        { text: 'Sure Arjun, what do you have?', sent: true, time: '10:22 AM', read: true },
        { text: 'Check out these premium silk fabrics. Just arrived today!', sent: false, time: '10:25 AM', read: true },
        { text: 'They look amazing! Can we do a video call so I can see the texture?', sent: true, time: '10:28 AM', read: true },
        { text: 'Absolutely! I\'m free now. Shall I call you?', sent: false, time: '10:30 AM', read: false },
        { text: 'Yes, please go ahead and call me.', sent: true, time: '10:32 AM', read: false },
      ]
    },
    1: {
      unread: 0,
      lastTime: '9:20 AM',
      messages: [
        { text: 'Good morning Priya! How\'s the new collection coming along?', sent: true, time: '9:10 AM', read: true },
        { text: 'Morning! It\'s going great. We have 50 new designs ready.', sent: false, time: '9:12 AM', read: true },
        { text: 'That\'s wonderful! Can I see the catalog?', sent: true, time: '9:15 AM', read: true },
        { text: 'I\'ll send it over by evening. The photography is still going on.', sent: false, time: '9:18 AM', read: true },
        { text: 'Perfect, no rush. Thanks! 👍', sent: true, time: '9:20 AM', read: true },
      ]
    },
    2: {
      unread: 1,
      lastTime: 'Yesterday',
      messages: [
        { text: 'Rahul, did you receive the shipment?', sent: true, time: '3:00 PM', read: true },
        { text: 'Yes, got it this morning. Quality is great!', sent: false, time: '3:15 PM', read: true },
        { text: 'Glad to hear that! Let me know if you need anything else.', sent: true, time: '3:20 PM', read: true },
        { text: 'Actually, can I place another order for 200 units?', sent: false, time: '4:00 PM', read: false },
      ]
    },
    3: {
      unread: 0,
      lastTime: 'Yesterday',
      messages: [
        { text: 'Hi Sneha! The sarees you sent were beautiful.', sent: true, time: '2:00 PM', read: true },
        { text: 'Thank you! My artisans worked really hard on those.', sent: false, time: '2:05 PM', read: true },
        { text: 'I want to order the Banarasi set. What\'s the bulk price?', sent: true, time: '2:10 PM', read: true },
        { text: 'For bulk orders above 50, we offer 15% discount.', sent: false, time: '2:15 PM', read: true },
        { text: 'Great deal. I\'ll confirm by tomorrow.', sent: true, time: '2:20 PM', read: true },
      ]
    },
    4: {
      unread: 0,
      lastTime: 'Mon',
      messages: [
        { text: 'Vikram, how\'s business going?', sent: true, time: '11:00 AM', read: true },
        { text: 'Pretty good! Sales are up 20% this quarter.', sent: false, time: '11:30 AM', read: true },
        { text: 'That\'s great to hear. Let\'s catch up soon.', sent: true, time: '11:35 AM', read: true },
      ]
    },
    5: {
      unread: 3,
      lastTime: 'Mon',
      messages: [
        { text: 'Ananya, do you have the Kanjivaram collection?', sent: true, time: '4:00 PM', read: true },
        { text: 'Yes! Just launched last week. Very popular already.', sent: false, time: '4:10 PM', read: true },
        { text: 'Can you share the price list?', sent: true, time: '4:15 PM', read: true },
        { text: 'Here\'s the updated catalog with all prices.', sent: false, time: '4:20 PM', read: false },
        { text: 'We also have a Diwali special discount running!', sent: false, time: '4:21 PM', read: false },
        { text: 'Don\'t miss out — offer ends this Friday 🎉', sent: false, time: '4:22 PM', read: false },
      ]
    },
    6: {
      unread: 0,
      lastTime: 'Sun',
      messages: [
        { text: 'Karthik, the payment has been processed.', sent: true, time: '10:00 AM', read: true },
        { text: 'Received it. Thank you for the quick turnaround!', sent: false, time: '10:30 AM', read: true },
      ]
    },
    7: {
      unread: 0,
      lastTime: 'Sun',
      messages: [
        { text: 'Hi Meera, welcome to the platform!', sent: true, time: '5:00 PM', read: true },
        { text: 'Thank you Madan! Excited to be here.', sent: false, time: '5:10 PM', read: true },
        { text: 'Feel free to explore and connect with sellers.', sent: true, time: '5:15 PM', read: true },
        { text: 'Will do! Already found some great options. 😊', sent: false, time: '5:20 PM', read: true },
      ]
    },
  };

  const discoverUsers = [
    { name: 'Ravi Kumar', initial: 'R', avatarClass: 'avatar-blue', role: 'Seller', rating: 4.5, mutual: 3, connected: false },
    { name: 'Nisha Gupta', initial: 'N', avatarClass: 'avatar-pink', role: 'Seller', rating: 4.8, mutual: 5, connected: false },
    { name: 'Amit Patel', initial: 'A', avatarClass: 'avatar-green', role: 'Buyer', rating: 4.1, mutual: 2, connected: false },
    { name: 'Kavya Nair', initial: 'K', avatarClass: 'avatar-purple', role: 'Seller', rating: 4.9, mutual: 7, connected: false },
    { name: 'Deepak Jha', initial: 'D', avatarClass: 'avatar-orange', role: 'Buyer', rating: 4.3, mutual: 1, connected: false },
    { name: 'Pooja Reddy', initial: 'P', avatarClass: 'avatar-amber', role: 'Seller', rating: 4.6, mutual: 4, connected: false },
  ];

  const autoReplies = [
    'Sure, let me check that for you!',
    'That sounds great! 👍',
    'I\'ll get back to you on that shortly.',
    'Absolutely, I can arrange that.',
    'Thanks for letting me know!',
    'Let me send you the details.',
    'Perfect, I\'ll prepare the quote.',
    'Sounds good! Talk soon. 😊',
    'I have some great options for you!',
    'Let me share the photos right away.',
  ];

  // ─── STATE ────────────────────────────────────────
  let currentScreen = 'screen-main';
  let currentTab = 'calls';
  let currentChatContactId = null;
  let callTimerInterval = null;
  let callSeconds = 0;
  let outgoingTimeout = null;
  let connectingTimeout = null;
  let currentCallContact = null;

  // ─── HELPERS ──────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function generateStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '';
    for (let i = 0; i < full; i++) html += '<span class="star">★</span>';
    if (half) html += '<span class="star">★</span>';
    for (let i = 0; i < empty; i++) html += '<span class="star empty">★</span>';
    return html;
  }

  function getLastMessage(contactId) {
    const convo = conversations[contactId];
    if (!convo || !convo.messages.length) return '';
    const last = convo.messages[convo.messages.length - 1];
    const prefix = last.sent ? 'You: ' : '';
    const text = prefix + last.text;
    return text.length > 40 ? text.substring(0, 40) + '…' : text;
  }

  function callTypeIcon(type) {
    if (type === 'incoming') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round"><polyline points="7 7 7 17 17 17"/><line x1="17" y1="17" x2="7" y2="7"/></svg>';
    if (type === 'outgoing') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00BFA6" stroke-width="2.5" stroke-linecap="round"><polyline points="17 17 17 7 7 7"/><line x1="7" y1="7" x2="17" y2="17"/></svg>';
    if (type === 'missed') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round"><polyline points="7 7 7 17 17 17"/><line x1="17" y1="17" x2="7" y2="7"/></svg>';
    return '';
  }

  // ─── SCREEN NAVIGATION ────────────────────────────
  function showScreen(screenId, direction) {
    const prev = $('#' + currentScreen);
    const next = $('#' + screenId);
    if (!prev || !next || currentScreen === screenId) return;

    prev.classList.remove('active');
    if (direction === 'forward') {
      prev.classList.add('slide-left');
    }
    next.classList.remove('slide-left');
    next.classList.add('active');

    setTimeout(() => {
      prev.classList.remove('slide-left');
    }, 400);

    currentScreen = screenId;
  }

  // ─── TAB NAVIGATION ──────────────────────────────
  function switchTab(tabName) {
    if (currentTab === tabName) return;

    // Update panes
    $$('.tab-pane').forEach(p => p.classList.remove('active'));
    const pane = $('#tab-' + tabName);
    if (pane) pane.classList.add('active');

    // Update nav items
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (navItem) navItem.classList.add('active');

    // Move indicator
    const idx = ['calls', 'chats', 'discover', 'profile'].indexOf(tabName);
    const indicator = $('#nav-indicator');
    if (indicator && idx >= 0) {
      indicator.style.left = (idx * 25) + '%';
    }

    // Clear search
    const searchInput = $('#search-input');
    if (searchInput) {
      searchInput.value = '';
      handleSearch('');
    }

    currentTab = tabName;
  }

  // ─── RENDER CALLS LIST ────────────────────────────
  function renderCalls(filter = '') {
    const container = $('#calls-list');
    if (!container) return;
    const lf = filter.toLowerCase();

    let html = '';
    callHistory.forEach(call => {
      const c = contacts[call.contactId];
      if (lf && !c.name.toLowerCase().includes(lf)) return;

      const typeLabel = call.type.charAt(0).toUpperCase() + call.type.slice(1);
      const duration = call.duration ? ` • ${call.duration}` : '';

      html += `
        <div class="contact-item" data-contact-id="${call.contactId}">
          <div class="avatar ${c.avatarClass}">
            ${c.initial}
            ${c.online ? '<span class="online-dot"></span>' : ''}
            ${c.verified ? '<span class="verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' : ''}
          </div>
          <div class="contact-info">
            <div class="contact-name">${c.name}</div>
            <div class="call-type-badge ${call.type}">
              ${callTypeIcon(call.type)}
              ${typeLabel} • ${call.time}${duration}
            </div>
          </div>
          <div class="contact-actions">
            <button class="icon-btn btn-call-audio" data-contact-id="${call.contactId}" aria-label="Audio Call">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            </button>
            <button class="icon-btn btn-call-video" data-contact-id="${call.contactId}" aria-label="Video Call">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </button>
          </div>
        </div>`;
    });

    if (!html) {
      html = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg><p>No calls found</p></div>';
    }

    container.innerHTML = html;
  }

  // ─── RENDER CHATS LIST ────────────────────────────
  function renderChats(filter = '') {
    const container = $('#chats-list');
    if (!container) return;
    const lf = filter.toLowerCase();

    // Sort: unread first, then by time
    const sorted = contacts.slice().sort((a, b) => {
      const ua = conversations[a.id]?.unread || 0;
      const ub = conversations[b.id]?.unread || 0;
      return ub - ua;
    });

    let html = '';
    sorted.forEach(c => {
      if (lf && !c.name.toLowerCase().includes(lf)) return;
      const convo = conversations[c.id];
      if (!convo) return;
      const lastMsg = getLastMessage(c.id);
      const hasUnread = convo.unread > 0;

      html += `
        <div class="conversation-item" data-contact-id="${c.id}">
          <div class="avatar ${c.avatarClass}">
            ${c.initial}
            ${c.online ? '<span class="online-dot"></span>' : ''}
          </div>
          <div class="convo-info">
            <div class="convo-name">${c.name}</div>
            <div class="convo-preview">${lastMsg}</div>
          </div>
          <div class="convo-right">
            <span class="convo-time ${hasUnread ? 'unread' : ''}">${convo.lastTime}</span>
            ${hasUnread ? `<span class="unread-badge">${convo.unread}</span>` : ''}
          </div>
        </div>`;
    });

    if (!html) {
      html = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><p>No conversations found</p></div>';
    }

    container.innerHTML = html;
  }

  // ─── RENDER DISCOVER ──────────────────────────────
  function renderDiscover(filter = '', category = 'all') {
    const grid = $('#discover-grid');
    if (!grid) return;
    const lf = filter.toLowerCase();

    let html = '';
    discoverUsers.forEach((u, idx) => {
      if (lf && !u.name.toLowerCase().includes(lf)) return;
      if (category !== 'all') {
        if (category === 'seller' && u.role !== 'Seller') return;
        if (category === 'buyer' && u.role !== 'Buyer') return;
        if (category === 'new' && idx < 4) return;
      }

      let btnClass = 'connect-btn';
      let btnText = 'Connect';
      if (u.connected === 'pending') {
        btnClass += ' pending';
        btnText = 'Pending';
      } else if (u.connected === true) {
        btnClass += ' connected';
        btnText = '✓ Connected';
      }

      html += `
        <div class="discover-card">
          <div class="avatar ${u.avatarClass}">${u.initial}</div>
          <div class="discover-name">${u.name}</div>
          <div class="discover-role">${u.role}</div>
          <div class="discover-rating">
            <span class="stars">${generateStars(u.rating)}</span>
            <span>${u.rating}</span>
          </div>
          <div class="discover-mutual">${u.mutual} mutual connections</div>
          <button class="${btnClass}" data-discover-idx="${idx}">${btnText}</button>
        </div>`;
    });

    if (!html) {
      html = '<div class="empty-state" style="grid-column: 1/-1"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg><p>No people found</p></div>';
    }

    grid.innerHTML = html;
  }

  // ─── OPEN CHAT VIEW ───────────────────────────────
  function openChat(contactId) {
    currentChatContactId = contactId;
    const c = contacts[contactId];
    if (!c) return;

    // Set header
    const avatar = $('#chat-avatar');
    avatar.className = `avatar avatar-sm ${c.avatarClass}`;
    avatar.textContent = c.initial;
    $('#chat-header-name').textContent = c.name;
    const statusEl = $('#chat-header-status');
    statusEl.textContent = c.status;
    statusEl.className = 'chat-header-status' + (c.online ? '' : ' offline');

    // Set typing avatar
    const typingAvatar = $('#typing-avatar');
    if (typingAvatar) {
      typingAvatar.textContent = c.initial;
    }

    // Render messages
    renderMessages(contactId);

    // Mark as read
    if (conversations[contactId]) {
      conversations[contactId].unread = 0;
      updateChatBadge();
    }

    showScreen('screen-chat-view', 'forward');
  }

  function renderMessages(contactId) {
    const area = $('#messages-area');
    if (!area) return;
    const convo = conversations[contactId];
    if (!convo) return;

    let html = '<div class="date-divider"><span>Today</span></div>';
    convo.messages.forEach(msg => {
      const readIcon = msg.sent
        ? `<span class="read-receipt ${msg.read ? 'read' : ''}">✓✓</span>`
        : '';
      html += `
        <div class="message-bubble ${msg.sent ? 'sent' : 'received'}">
          ${msg.text}
          <div class="message-meta">
            <span class="message-time">${msg.time}</span>
            ${readIcon}
          </div>
        </div>`;
    });

    area.innerHTML = html;
    // Scroll to bottom
    requestAnimationFrame(() => {
      area.scrollTop = area.scrollHeight;
    });
  }

  // ─── SEND MESSAGE ─────────────────────────────────
  function sendMessage() {
    const input = $('#chat-message-input');
    const text = input.value.trim();
    if (!text || currentChatContactId === null) return;

    const convo = conversations[currentChatContactId];
    if (!convo) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    convo.messages.push({ text, sent: true, time: timeStr, read: false });
    input.value = '';

    renderMessages(currentChatContactId);

    // Show typing then auto-reply
    setTimeout(() => {
      $('#typing-indicator').classList.add('show');
      const area = $('#messages-area');
      if (area) area.scrollTop = area.scrollHeight + 60;
    }, 500);

    setTimeout(() => {
      $('#typing-indicator').classList.remove('show');
      const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      convo.messages.push({ text: reply, sent: false, time: replyTime, read: true });
      // Mark our messages as read
      convo.messages.forEach(m => { if (m.sent) m.read = true; });
      renderMessages(currentChatContactId);
    }, 2000);
  }

  // ─── SEND IN-CALL MESSAGE ────────────────────────
  function sendIncallMessage() {
    const input = $('#incall-chat-input');
    const text = input.value.trim();
    if (!text) return;

    const container = $('#incall-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'incall-msg sent';
    msgDiv.innerHTML = `<p>${text}</p>`;
    container.appendChild(msgDiv);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Auto reply
    setTimeout(() => {
      const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
      const name = currentCallContact ? currentCallContact.name.split(' ')[0] : 'User';
      const replyDiv = document.createElement('div');
      replyDiv.className = 'incall-msg received';
      replyDiv.innerHTML = `<span class="incall-msg-name">${name}</span><p>${reply}</p>`;
      container.appendChild(replyDiv);
      container.scrollTop = container.scrollHeight;
    }, 1500);
  }

  // ─── CALL FLOW ────────────────────────────────────
  function startOutgoingCall(contactId) {
    const c = contacts[contactId];
    if (!c) return;
    currentCallContact = c;

    // Set outgoing screen
    const avatar = $('#outgoing-avatar');
    avatar.className = `caller-avatar ${c.avatarClass}`;
    avatar.textContent = c.initial;
    $('#outgoing-name').textContent = c.name;

    showScreen('screen-outgoing', 'forward');

    // Auto-connect after 3s
    outgoingTimeout = setTimeout(() => {
      showConnecting(c);
    }, 3000);
  }

  function showConnecting(contact) {
    const avatar = $('#connecting-avatar');
    avatar.className = `caller-avatar floating-avatar ${contact.avatarClass}`;
    avatar.textContent = contact.initial;
    $('#connecting-name').textContent = contact.name;

    showScreen('screen-connecting', 'forward');

    connectingTimeout = setTimeout(() => {
      startActiveCall(contact);
    }, 2000);
  }

  function showIncomingCall(contactId) {
    const c = contacts[contactId];
    if (!c) return;
    currentCallContact = c;

    const avatar = $('#incoming-avatar');
    avatar.className = `caller-avatar ${c.avatarClass}`;
    avatar.textContent = c.initial;
    $('#incoming-name').textContent = c.name;

    showScreen('screen-incoming', 'forward');
  }

  function startActiveCall(contact) {
    currentCallContact = contact;

    const avatar = $('#active-avatar');
    avatar.className = `remote-avatar-large`;
    avatar.style.background = getComputedStyle(document.querySelector('.' + contact.avatarClass)).background;
    avatar.textContent = contact.initial;
    $('#active-call-name').textContent = contact.name;

    // Reset timer
    callSeconds = 0;
    updateTimerDisplay();
    if (callTimerInterval) clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
      callSeconds++;
      updateTimerDisplay();
    }, 1000);

    // Close any overlays
    $('#seller-photos-overlay').classList.remove('show');
    $('#incall-chat-sidebar').classList.remove('show');

    // Reset control states
    $('#btn-mute').setAttribute('data-active', 'false');
    $('#btn-camera').setAttribute('data-active', 'false');

    showScreen('screen-active', 'forward');
  }

  function endCall() {
    if (callTimerInterval) clearInterval(callTimerInterval);
    if (outgoingTimeout) clearTimeout(outgoingTimeout);
    if (connectingTimeout) clearTimeout(connectingTimeout);
    callTimerInterval = null;
    outgoingTimeout = null;
    connectingTimeout = null;
    currentCallContact = null;

    showScreen('screen-main');
  }

  function updateTimerDisplay() {
    const mins = Math.floor(callSeconds / 60).toString().padStart(2, '0');
    const secs = (callSeconds % 60).toString().padStart(2, '0');
    const timerEl = $('#call-timer');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }

  // ─── SEARCH ───────────────────────────────────────
  function handleSearch(query) {
    const lf = query.toLowerCase();
    const clearBtn = $('#search-clear');
    if (clearBtn) {
      clearBtn.classList.toggle('show', lf.length > 0);
    }

    if (currentTab === 'calls') renderCalls(lf);
    else if (currentTab === 'chats') renderChats(lf);
    else if (currentTab === 'discover') {
      const activePill = document.querySelector('.pill.active');
      const category = activePill ? activePill.dataset.category : 'all';
      renderDiscover(lf, category);
    }
  }

  // ─── CHAT BADGE ───────────────────────────────────
  function updateChatBadge() {
    let totalUnread = 0;
    Object.values(conversations).forEach(c => { totalUnread += c.unread || 0; });
    const badge = $('#chat-badge');
    if (badge) {
      badge.textContent = totalUnread;
      badge.style.display = totalUnread > 0 ? 'flex' : 'none';
    }
  }

  // ─── CONNECT BUTTON ──────────────────────────────
  function handleConnect(idx) {
    const user = discoverUsers[idx];
    if (!user || user.connected === true) return;

    if (user.connected === false) {
      user.connected = 'pending';
      renderDiscover($('#search-input')?.value || '', getCurrentDiscoverCategory());
      setTimeout(() => {
        user.connected = true;
        renderDiscover($('#search-input')?.value || '', getCurrentDiscoverCategory());
      }, 2000);
    }
  }

  function getCurrentDiscoverCategory() {
    const activePill = document.querySelector('.pill.active');
    return activePill ? activePill.dataset.category : 'all';
  }

  // ─── INIT ─────────────────────────────────────────
  function init() {
    // Render initial lists
    renderCalls();
    renderChats();
    renderDiscover();
    updateChatBadge();

    // Move indicator to initial position
    const indicator = $('#nav-indicator');
    if (indicator) indicator.style.left = '0%';

    // ── EVENT LISTENERS ──

    // Bottom nav
    $$('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
      });
    });

    // Search toggle
    $('#btn-search-toggle')?.addEventListener('click', () => {
      const bar = $('#search-bar');
      bar.classList.toggle('visible');
      if (bar.classList.contains('visible')) {
        setTimeout(() => $('#search-input')?.focus(), 300);
      }
    });

    // Search input
    $('#search-input')?.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });

    // Search clear
    $('#search-clear')?.addEventListener('click', () => {
      const input = $('#search-input');
      if (input) {
        input.value = '';
        handleSearch('');
        input.focus();
      }
    });

    // Calls list — delegate
    $('#calls-list')?.addEventListener('click', (e) => {
      const videoBtn = e.target.closest('.btn-call-video');
      const audioBtn = e.target.closest('.btn-call-audio');
      const item = e.target.closest('.contact-item');

      if (videoBtn) {
        e.stopPropagation();
        startOutgoingCall(parseInt(videoBtn.dataset.contactId));
      } else if (audioBtn) {
        e.stopPropagation();
        startOutgoingCall(parseInt(audioBtn.dataset.contactId));
      } else if (item) {
        openChat(parseInt(item.dataset.contactId));
      }
    });

    // Chats list — delegate
    $('#chats-list')?.addEventListener('click', (e) => {
      const item = e.target.closest('.conversation-item');
      if (item) {
        openChat(parseInt(item.dataset.contactId));
      }
    });

    // Chat back
    $('#btn-chat-back')?.addEventListener('click', () => {
      currentChatContactId = null;
      renderChats();
      showScreen('screen-main');
    });

    // Chat send
    $('#btn-send-message')?.addEventListener('click', sendMessage);
    $('#chat-message-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Chat header call buttons
    $('#btn-chat-video')?.addEventListener('click', () => {
      if (currentChatContactId !== null) {
        startOutgoingCall(currentChatContactId);
      }
    });
    $('#btn-chat-audio')?.addEventListener('click', () => {
      if (currentChatContactId !== null) {
        startOutgoingCall(currentChatContactId);
      }
    });

    // Incoming call buttons
    $('#btn-accept')?.addEventListener('click', () => {
      if (currentCallContact) {
        showConnecting(currentCallContact);
      }
    });
    $('#btn-reject')?.addEventListener('click', endCall);

    // Outgoing call
    $('#btn-cancel-call')?.addEventListener('click', endCall);

    // Active call controls
    $('#btn-end-call')?.addEventListener('click', endCall);

    $('#btn-mute')?.addEventListener('click', function () {
      const active = this.getAttribute('data-active') === 'true';
      this.setAttribute('data-active', (!active).toString());
    });

    $('#btn-camera')?.addEventListener('click', function () {
      const active = this.getAttribute('data-active') === 'true';
      this.setAttribute('data-active', (!active).toString());
    });

    // Seller Photos
    $('#btn-seller-photos')?.addEventListener('click', () => {
      $('#seller-photos-overlay').classList.add('show');
    });
    $('#btn-close-photos')?.addEventListener('click', () => {
      $('#seller-photos-overlay').classList.remove('show');
    });
    $('#seller-photos-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('show');
      }
    });

    // In-call Chat
    $('#btn-incall-chat')?.addEventListener('click', () => {
      $('#incall-chat-sidebar').classList.add('show');
    });
    $('#btn-close-incall-chat')?.addEventListener('click', () => {
      $('#incall-chat-sidebar').classList.remove('show');
    });
    $('#btn-send-incall')?.addEventListener('click', sendIncallMessage);
    $('#incall-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendIncallMessage();
    });

    // Discover pills
    $('#discover-pills')?.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      $$('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const category = pill.dataset.category;
      const filter = $('#search-input')?.value || '';
      renderDiscover(filter, category);
    });

    // Discover connect buttons — delegate
    $('#discover-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.connect-btn');
      if (btn) {
        handleConnect(parseInt(btn.dataset.discoverIdx));
      }
    });

    // FAB new chat — show a random incoming call for demo
    $('#fab-new-chat')?.addEventListener('click', () => {
      const randomId = Math.floor(Math.random() * contacts.length);
      showIncomingCall(randomId);
    });

    // Minimize call (return to main but keep call running)
    $('#btn-minimize-call')?.addEventListener('click', () => {
      showScreen('screen-main');
    });

    // Logout
    $('#btn-logout')?.addEventListener('click', () => {
      switchTab('calls');
    });
  }

  // Start app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
