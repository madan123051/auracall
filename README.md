# 🎥 AuraCall — Drishya Video Call UI

> Pro-level video calling interface designed to rival Google Meet. Built for the Drishya platform.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## ✨ Features

### 📞 Call Screens
- **Home Screen** — Contact list with search, online status, verified badges
- **Incoming Call** — Pulse ring animation, accept/decline buttons
- **Outgoing Call** — Ringing animation with auto-connect
- **Connecting** — Floating avatar with dot animation
- **Active Call** — Full video call interface

### 🎮 Active Call Controls
- 🎤 **Mute/Unmute** — Visual state change (red when muted)
- 📷 **Camera Toggle** — On/off with visual feedback
- 🖥️ **Screen Share** — Green indicator badge
- 📸 **Seller Photos** — ⭐ Unique USP! View seller's product photos during call
- 💬 **In-Call Chat** — Slide-in sidebar with real-time messaging
- 📞 **End Call** — Returns to home

### 🎨 Design
- Dark theme with teal accent (#00BFA6)
- Glass morphism effects
- Smooth CSS animations & transitions
- Responsive design
- Custom scrollbar
- Network quality indicator

## 🚀 Quick Start

```bash
# Just open the file in your browser
open index.html

# Or serve with any static server
npx serve .
```

## 📁 Structure

```
├── index.html    # Main HTML structure (all screens)
├── styles.css    # Complete styling with animations
├── script.js     # Interactive logic & state management
└── README.md     # This file
```

## 🎯 Unique Selling Point

**Seller Photos Overlay** — During a video call, buyers can view the seller's top product photos in a beautiful overlay. This feature doesn't exist in Google Meet, Zoom, or any other video calling platform. This is what makes Drishya different from a clone.

## 🔧 Tech Stack (for production)

- **Framework**: Next.js
- **Video**: Agora SDK
- **Chat**: Firebase Firestore
- **Auth**: Firebase Auth
- **Notifications**: Firebase Cloud Messaging (FCM)

## 📱 Screens Demo

1. Open `index.html`
2. Click any contact → Outgoing call → Auto-connects → Active call
3. Click the 📞 ringing icon (top-right) → Incoming call simulation
4. During active call, try all the control buttons

---

Built with 🔥 for **Drishya by WildSaura**
