import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import ChatRoom from "./ChatRoom";
import FriendsList from "./FriendsList";
import ProfileStudio from "./ProfileStudio";
import { getChats } from "../lib/chat";
import {
  deleteCallRecord,
  formatCallTime,
  formatDuration,
  getCallHistory,
} from "../lib/callHistory";
import { getFriends } from "../lib/friends";
import { watchMultiplePresence } from "../lib/presence";
import { useLanguage } from "../lib/i18n";

const NAV_ITEMS = [
  { key: "chats", icon: "chat", labelKey: "chats" },
  { key: "calls", icon: "phone", labelKey: "calls" },
  { key: "friends", icon: "users", labelKey: "friends" },
  { key: "profile", icon: "user", labelKey: "profile" },
];

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "chat") {
    return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>;
  }
  if (name === "phone") {
    return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z" /></svg>;
  }
  if (name === "users") {
    return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  }
  if (name === "user") {
    return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
  }
  if (name === "menu") {
    return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
  }
  if (name === "close") {
    return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  }
  if (name === "share") {
    return <svg {...common}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></svg>;
  }
  if (name === "panel") {
    return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
}

function Avatar({ photoURL, name, size = 48 }) {
  if (photoURL) {
    return <img className="modern-avatar" src={photoURL} alt={name} style={{ width: size, height: size }} />;
  }
  return (
    <span className="modern-avatar modern-avatar-fallback" style={{ width: size, height: size }}>
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

export default function ModernDashboard({ onStartVideoCall }) {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("chats");
  const [chats, setChats] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendPresence, setFriendPresence] = useState(new Map());
  const [activeChatPeer, setActiveChatPeer] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("auracall-sidebar-collapsed");
    setSidebarCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;
    return getChats(currentUser.uid, setChats);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return undefined;
    return getCallHistory(currentUser.uid, 50, setCallHistory);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return undefined;
    return getFriends(currentUser.uid, setFriends);
  }, [currentUser]);

  useEffect(() => {
    if (!friends.length) {
      setFriendPresence(new Map());
      return undefined;
    }
    return watchMultiplePresence(friends.map((friend) => friend.uid), setFriendPresence);
  }, [friends]);

  const totalUnread = useMemo(
    () => chats.reduce((sum, chat) => sum + (chat.unreadCount?.[currentUser?.uid] || 0), 0),
    [chats, currentUser]
  );

  const onlineFriends = useMemo(
    () => friends.filter((friend) => friendPresence.get(friend.uid)?.isOnline).length,
    [friendPresence, friends]
  );

  const openTab = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("auracall-sidebar-collapsed", String(next));
      return next;
    });
  };

  const handleStartCall = useCallback(
    (friend, type) => onStartVideoCall?.(friend, type),
    [onStartVideoCall]
  );

  const handleChatClick = (chat) => {
    const otherUid = chat.participants?.find((participant) => participant !== currentUser.uid);
    const friend = friends.find((item) => item.uid === otherUid);
    setActiveChatPeer(friend || { uid: otherUid, displayName: otherUid || "Aura user", photoURL: "" });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${currentUser.uid}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My AuraCall profile", text: "Connect with me on AuraCall X", url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareNotice("Profile link copied");
      }
    } catch (error) {
      if (error.name !== "AbortError") setShareNotice("Could not share this profile");
    }
    window.setTimeout(() => setShareNotice(""), 2400);
  };

  const getChatInfo = (chat) => {
    const otherUid = chat.participants?.find((participant) => participant !== currentUser.uid);
    const friend = friends.find((item) => item.uid === otherUid);
    return {
      uid: otherUid,
      displayName: friend?.displayName || otherUid || "Aura user",
      photoURL: friend?.photoURL || "",
    };
  };

  const formatChatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    if (now.toDateString() === date.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (activeChatPeer) {
    return (
      <div className="modern-chat-shell">
        <ChatRoom
          peer={activeChatPeer}
          onBack={() => setActiveChatPeer(null)}
          onStartCall={handleStartCall}
        />
      </div>
    );
  }

  const renderChats = () => (
    <div className="modern-list">
      {!chats.length && (
        <div className="modern-empty-state">
          <span className="empty-state-icon"><Icon name="chat" size={30} /></span>
          <h3>{t("noConversations")}</h3>
          <p>Add a friend or open a profile link to begin.</p>
        </div>
      )}
      {chats.map((chat) => {
        const info = getChatInfo(chat);
        const unread = chat.unreadCount?.[currentUser.uid] || 0;
        const isOnline = friendPresence.get(info.uid)?.isOnline;
        return (
          <button className="conversation-card" key={chat.id} type="button" onClick={() => handleChatClick(chat)}>
            <span className="conversation-avatar-wrap">
              <Avatar photoURL={info.photoURL} name={info.displayName} />
              <i className={isOnline ? "presence-dot is-online" : "presence-dot"} />
            </span>
            <span className="conversation-copy">
              <strong>{info.displayName}</strong>
              <small>{chat.lastMessage?.senderId === currentUser.uid ? "You: " : ""}{chat.lastMessage?.text || "Start a conversation"}</small>
            </span>
            <span className="conversation-meta">
              <time>{formatChatTime(chat.lastMessage?.timestamp)}</time>
              {unread > 0 && <b>{unread}</b>}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderCalls = () => (
    <div className="modern-list">
      {!callHistory.length && (
        <div className="modern-empty-state">
          <span className="empty-state-icon"><Icon name="phone" size={30} /></span>
          <h3>{t("noCalls")}</h3>
          <p>Audio and video calls will appear here.</p>
        </div>
      )}
      {callHistory.map((call) => (
        <div className="conversation-card call-history-card" key={call.id}>
          <Avatar photoURL={call.peerPhoto} name={call.peerName} />
          <span className="conversation-copy">
            <strong>{call.peerName}</strong>
            <small className={call.status === "missed" ? "missed-call" : ""}>
              {call.direction === "incoming" ? "Incoming" : "Outgoing"} · {call.type === "video" ? "Video" : "Audio"}
              {call.duration > 0 ? ` · ${formatDuration(call.duration)}` : ""}
            </small>
          </span>
          <span className="conversation-meta">
            <time>{formatCallTime(call.startedAt)}</time>
            <button
              className="mini-action-button"
              type="button"
              aria-label="Delete call"
              onClick={() => deleteCallRecord(currentUser.uid, call.id)}
            >
              ×
            </button>
          </span>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (activeTab === "chats") return renderChats();
    if (activeTab === "calls") return renderCalls();
    if (activeTab === "friends") {
      return <FriendsList onOpenChat={setActiveChatPeer} onStartCall={handleStartCall} />;
    }
    return <ProfileStudio embedded />;
  };

  const currentTitle = t(NAV_ITEMS.find((item) => item.key === activeTab)?.labelKey || "dashboard");

  return (
    <div className={`modern-app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      {mobileMenuOpen && <button className="mobile-drawer-backdrop" type="button" aria-label={t("close")} onClick={() => setMobileMenuOpen(false)} />}

      <aside className={`modern-sidebar ${mobileMenuOpen ? "mobile-drawer-open" : ""}`}>
        <div className="modern-brand-row">
          <div className="brand-mark">A</div>
          <div className="modern-brand-copy">
            <strong>AuraCall X</strong>
            <span>Connect intelligently</span>
          </div>
          <button className="sidebar-close-mobile" type="button" onClick={() => setMobileMenuOpen(false)} aria-label={t("close")}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="modern-side-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button
              className={activeTab === item.key ? "is-active" : ""}
              key={item.key}
              type="button"
              onClick={() => openTab(item.key)}
              title={t(item.labelKey)}
            >
              <span className="nav-icon"><Icon name={item.icon} /></span>
              <span className="nav-copy">{t(item.labelKey)}</span>
              {item.key === "chats" && totalUnread > 0 && <b>{totalUnread}</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-intelligence-card">
          <span>AI live</span>
          <strong>Translate every conversation.</strong>
          <small>Smart replies, summaries, and language preferences are ready.</small>
        </div>

        <div className="sidebar-profile-row">
          <Avatar photoURL={currentUser.photoURL} name={currentUser.displayName} size={42} />
          <span>
            <strong>{currentUser.displayName || "AuraCall User"}</strong>
            <small>{currentUser.email || "Guest account"}</small>
          </span>
          <button className="mini-action-button" type="button" onClick={handleShare} aria-label={t("shareProfile")}>
            <Icon name="share" size={17} />
          </button>
        </div>

        <button className="sidebar-collapse-button" type="button" onClick={toggleSidebar}>
          <Icon name="panel" size={18} />
          <span>{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
        </button>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="modern-topbar-title">
            <button className="mobile-menu-button" type="button" onClick={() => setMobileMenuOpen(true)} aria-label={t("menu")}>
              <Icon name="menu" />
            </button>
            <div>
              <span className="section-kicker">Aura workspace</span>
              <h1>{currentTitle}</h1>
            </div>
          </div>
          <div className="modern-topbar-actions">
            <span className="ai-status-pill"><i /> {t("aiReady")}</span>
            <button className="secondary-button share-topbar-button" type="button" onClick={handleShare}>
              <Icon name="share" size={17} /> {t("shareProfile")}
            </button>
            <button className="topbar-avatar-button" type="button" onClick={() => openTab("profile")}>
              <Avatar photoURL={currentUser.photoURL} name={currentUser.displayName} size={40} />
            </button>
          </div>
        </header>

        {shareNotice && <div className="floating-notice">{shareNotice}</div>}

        {activeTab !== "profile" && (
          <section className="modern-hero">
            <div className="modern-hero-copy">
              <span className="section-kicker">Aura intelligence</span>
              <h2>Conversations without language limits.</h2>
              <p>Talk, call, translate, and follow up from one private communication space.</p>
              <div className="modern-hero-pills">
                <span>AI smart replies</span>
                <span>Auto translation</span>
                <span>Protected calling</span>
              </div>
            </div>
            <div className="modern-hero-stats">
              <div><strong>{onlineFriends}</strong><span>Online now</span></div>
              <div><strong>{chats.length}</strong><span>Conversations</span></div>
              <div><strong>{callHistory.length}</strong><span>Recent calls</span></div>
            </div>
          </section>
        )}

        <section className={`modern-content-panel ${activeTab === "profile" ? "profile-content-panel" : ""}`}>
          {activeTab !== "profile" && (
            <div className="content-panel-heading">
              <div>
                <span className="section-kicker">Recent activity</span>
                <h2>{currentTitle}</h2>
              </div>
              {activeTab === "friends" && <span className="online-summary">{onlineFriends} online</span>}
            </div>
          )}
          <div className="modern-content-scroll">{renderContent()}</div>
        </section>
      </main>

      <nav className="modern-mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => (
          <button
            className={activeTab === item.key ? "is-active" : ""}
            key={item.key}
            type="button"
            onClick={() => openTab(item.key)}
          >
            <span><Icon name={item.icon} /></span>
            <small>{t(item.labelKey)}</small>
            {item.key === "chats" && totalUnread > 0 && <b>{totalUnread}</b>}
          </button>
        ))}
      </nav>
    </div>
  );
}
