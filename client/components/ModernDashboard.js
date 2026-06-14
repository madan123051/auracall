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
import SwipeActionRow from "./SwipeActionRow";
import UiIcon from "./UiIcon";

const NAV_ITEMS = [
  { key: "chats", icon: "chat", labelKey: "chats" },
  { key: "calls", icon: "phone", labelKey: "calls" },
  { key: "friends", icon: "users", labelKey: "friends" },
  { key: "profile", icon: "user", labelKey: "profile" },
];

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
  const {
    t,
    translationLanguage,
    translationLanguages,
    setTranslationLanguage,
    autoTranslate,
    setAutoTranslate,
  } = useLanguage();
  const [activeTab, setActiveTab] = useState("chats");
  const [chats, setChats] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendPresence, setFriendPresence] = useState(new Map());
  const [activeChatPeer, setActiveChatPeer] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");

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
    setActiveChatPeer(friend || { uid: otherUid, displayName: "Aura user", photoURL: "" });
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
      displayName: friend?.displayName || "Aura user",
      photoURL: friend?.photoURL || "",
    };
  };

  const handleDeleteCall = async (call) => {
    await deleteCallRecord(currentUser.uid, call.id);
    setDeleteNotice("Call removed");
    window.setTimeout(() => setDeleteNotice(""), 2200);
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
          <span className="empty-state-icon"><UiIcon name="chat" size={30} /></span>
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
          <span className="empty-state-icon"><UiIcon name="phone" size={30} /></span>
          <h3>{t("noCalls")}</h3>
          <p>Audio and video calls will appear here.</p>
        </div>
      )}
      {callHistory.map((call) => (
        <SwipeActionRow
          className="call-swipe-row"
          key={call.id}
          confirmMessage={`Delete the call with ${call.peerName || "this contact"}?`}
          deleteLabel="Delete"
          onDelete={() => handleDeleteCall(call)}
          onDeleteError={(error) => {
            setDeleteNotice(error.message || "Could not delete call");
            window.setTimeout(() => setDeleteNotice(""), 2600);
          }}
        >
          <div className="conversation-card call-history-card">
            <Avatar photoURL={call.peerPhoto} name={call.peerName} />
            <span className="conversation-copy">
              <strong>{call.peerName}</strong>
              <small className={call.status === "missed" ? "missed-call" : ""}>
                <span className="call-detail">
                  <UiIcon name={call.direction === "incoming" ? "incoming" : "outgoing"} size={13} />
                  {call.direction === "incoming" ? "Incoming" : "Outgoing"}
                </span>
                <span className="call-detail">
                  <UiIcon name={call.type === "video" ? "video" : "phone"} size={13} />
                  {call.type === "video" ? "Video" : "Audio"}
                </span>
                {call.duration > 0 && <span>{formatDuration(call.duration)}</span>}
              </small>
            </span>
            <span className="conversation-meta">
              <time>{formatCallTime(call.startedAt)}</time>
            </span>
          </div>
        </SwipeActionRow>
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
            <UiIcon name="close" />
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
              <span className="nav-icon"><UiIcon name={item.icon} /></span>
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
            <UiIcon name="share" size={17} />
          </button>
        </div>

        <button className="sidebar-collapse-button" type="button" onClick={toggleSidebar}>
          <UiIcon name="panel" size={18} />
          <span>{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
        </button>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="modern-topbar-title">
            <button className="mobile-menu-button" type="button" onClick={() => setMobileMenuOpen(true)} aria-label={t("menu")}>
              <UiIcon name="menu" />
            </button>
            <div>
              <span className="section-kicker">Aura workspace</span>
              <h1>{currentTitle}</h1>
            </div>
          </div>
          <div className="modern-topbar-actions">
            <span className="ai-status-pill"><i /> {t("aiReady")}</span>
            <button className="secondary-button share-topbar-button" type="button" onClick={handleShare}>
              <UiIcon name="share" size={17} /> {t("shareProfile")}
            </button>
            <button className="topbar-avatar-button" type="button" onClick={() => openTab("profile")}>
              <Avatar photoURL={currentUser.photoURL} name={currentUser.displayName} size={40} />
            </button>
          </div>
        </header>

        {shareNotice && <div className="floating-notice">{shareNotice}</div>}
        {deleteNotice && <div className="floating-notice">{deleteNotice}</div>}

        {activeTab !== "profile" && (
          <section className="modern-hero">
            <div className="modern-hero-copy">
              <span className="section-kicker">Aura intelligence</span>
              <h2>Conversations without language limits.</h2>
              <p>Talk, call, translate, and follow up from one private communication space.</p>
              <div className="modern-hero-pills">
                <span>AI smart replies</span>
                <span>Protected calling</span>
              </div>
              <div className="translation-quick-control">
                <label>
                  <UiIcon name="globe" size={16} />
                  <span>Messages to</span>
                  <select
                    value={translationLanguage}
                    onChange={(event) => setTranslationLanguage(event.target.value)}
                    aria-label="Message translation language"
                  >
                    {translationLanguages.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.nativeLabel} · {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={autoTranslate ? "is-active" : ""}
                  type="button"
                  onClick={() => setAutoTranslate(!autoTranslate)}
                  aria-pressed={autoTranslate}
                >
                  <i />
                  {autoTranslate ? "Auto ON" : "Manual"}
                </button>
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
            <span><UiIcon name={item.icon} /></span>
            <small>{t(item.labelKey)}</small>
            {item.key === "chats" && totalUnread > 0 && <b>{totalUnread}</b>}
          </button>
        ))}
      </nav>
    </div>
  );
}
