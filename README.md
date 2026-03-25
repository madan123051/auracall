# 📞 AuraCall — Real-Time Video Calling App

![WebRTC](https://img.shields.io/badge/WebRTC-Peer--to--Peer-00BFA6?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?style=for-the-badge&logo=socket.io)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Crystal clear video calls, anywhere.** AuraCall is a full-stack, peer-to-peer video calling application built with WebRTC, Next.js, and Socket.IO. It features a sleek dark UI, real-time chat, and seamless call management.

---

## ✨ Features

- 🎥 **HD Video Calls** — Peer-to-peer WebRTC video with 720p support
- 🎤 **Audio Calls** — Crystal clear voice communication
- 💬 **In-Call Chat** — Send messages during active calls
- 👥 **User Discovery** — See who's online in real time
- 🔇 **Media Controls** — Mute mic, toggle camera on/off
- 📱 **Incoming Call UI** — Beautiful animated incoming call screen
- 🌙 **Dark Theme** — Premium dark glassmorphism design
- 🔒 **P2P Encrypted** — Direct peer-to-peer connections via WebRTC
- ⏱️ **Call Timer** — Track call duration in real time
- 📷 **Camera Preview** — Preview your camera before joining calls

---

## 🛠️ Tech Stack

| Layer       | Technology       | Purpose                           |
|-------------|------------------|-----------------------------------|
| **Frontend**| Next.js 14       | React framework with SSR          |
| **Backend** | Express.js       | HTTP server for signaling         |
| **Realtime**| Socket.IO 4.7    | WebSocket-based signaling         |
| **Video**   | WebRTC           | Peer-to-peer media streaming      |
| **Styling** | Inline CSS       | Dark theme with glassmorphism     |

---

## 📁 Project Structure

```
auracall/
├── README.md
├── .gitignore
├── server/
│   ├── package.json
│   └── server.js              # Socket.IO signaling server
├── client/
│   ├── package.json
│   ├── next.config.js
│   ├── pages/
│   │   ├── _app.js
│   │   └── index.js           # Login / entry page
│   ├── components/
│   │   └── VideoCall.js       # Main WebRTC video call component
│   ├── styles/
│   │   └── globals.css        # Global styles & animations
│   └── public/
└── ui-prototype/
    └── README.md              # Original UI prototype reference
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ installed
- A modern browser (Chrome, Edge, Firefox)

### 1. Clone the repo

```bash
git clone https://github.com/madan123051/auracall.git
cd auracall
```

### 2. Start the Signaling Server

```bash
cd server
npm install
node server.js
```

The server will start on **http://localhost:5000**.

### 3. Start the Client (new terminal)

```bash
cd client
npm install
npm run dev
```

The app will open at **http://localhost:3000**.

### 4. Make a Call

1. Open **http://localhost:3000** in one browser tab — enter a name
2. Open **http://localhost:3000** in another tab (or device) — enter a different name
3. You'll see each other in the "Online Users" list
4. Click the video call button to start a call!

---

## 🔄 How It Works

AuraCall uses **WebRTC** for peer-to-peer media streaming and **Socket.IO** for signaling:

```
┌──────────┐                    ┌──────────────┐                    ┌──────────┐
│  User A  │ ── join-room ────> │   Signaling  │ <── join-room ──  │  User B  │
│ (Caller) │                    │    Server    │                    │ (Callee) │
│          │ ── call-user ────> │  (Socket.IO) │ ── incoming ────> │          │
│          │ <── accepted ───── │              │ <── accept ──────  │          │
│          │                    │              │                    │          │
│          │ ═══ WebRTC Offer ═══════════════════════════════════> │          │
│          │ <══ WebRTC Answer ══════════════════════════════════  │          │
│          │ <══ ICE Candidates ════════════════════════════════>  │          │
│          │                                                       │          │
│          │ ◄══════════ P2P Media Stream (Video + Audio) ════════►│          │
└──────────┘                                                       └──────────┘
```

1. **User joins** → connects to Socket.IO, gets added to online users
2. **Caller initiates** → `call-user` event sent via signaling server
3. **Callee accepts** → `accept-call` event triggers WebRTC negotiation
4. **Offer/Answer exchange** → SDP descriptions exchanged through server
5. **ICE candidates** → Network connectivity candidates exchanged
6. **P2P connection** → Direct media stream between peers (no server relay!)

---

## 🗺️ Roadmap

- [ ] Screen sharing support
- [ ] Group video calls (SFU architecture)
- [ ] End-to-end encryption indicator
- [ ] Call recording
- [ ] Virtual backgrounds
- [ ] Mobile responsive redesign
- [ ] Push notifications for incoming calls
- [ ] User authentication & profiles
- [ ] File sharing in chat

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/madan123051">madan123051</a>
</p>
