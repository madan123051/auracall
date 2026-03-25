import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import FriendsList from "./FriendsList";
import ChatRoom from "./ChatRoom";
import { getChats, getChatId, markAsRead } from "../lib/chat";
import { getCallHistory, deleteCallRecord, formatDuration, formatCallTime } from "../lib/callHistory";
import { getFriends } from "../lib/friends";
import { watchMultiplePresence, formatLastSeen } from "../lib/presence";

const THEME = {
  bg: "#070B10",
  cardBg: "#0D1117",
  teal: "#00BFA6",
  tealHover: "#00E5C3",
  text: "#FFFFFF",
  textSecondary: "#8B949E",
  border: "#21262D",
  inputBg: "#161B22",
  onlineGreen: "#2EA043",
  offlineGray: "#484F58",
  dangerRed: "#F85149",
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: THEME.bg,
    color: THEME.text,
    maxWidth: "480px",
    margin: "0 auto",
    position: "relative",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    backgroundColor: THEME.cardBg,
    borderBottom: `1px solid ${THEME.border}`,
    flexShrink: 0,
  },
  logo: {
    fontSize: "22px",
    fontWeight: "800",
    background: `linear-gradient(135deg, ${THEME.teal}, ${THEME.tealHover})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  notifBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: THEME.inputBg,
    color: THEME.textSecondary,
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    transition: "all 0.2s ease",
  },
  notifBadge: {
    position: "absolute",
    top: "6px",
    right: "6px",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: THEME.dangerRed,
    border: `2px solid ${THEME.cardBg}`,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  bottomNav: {
    display: "flex",
    borderTop: `1px solid ${THEME.border}`,
    backgroundColor: THEME.cardBg,
    flexShrink: 0,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  navItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 0",
    cursor: "pointer",
    border: "none",
    background: "none",
    transition: "all 0.2s ease",
    position: "relative",
  },
  navIcon: {
    fontSize: "20px",
    marginBottom: "4px",
  },
  navLabel: {
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.3px",
  },
  navBadge: {
    position: "absolute",
    top: "4px",
    right: "calc(50% - 18px)",
    minWidth: "16px",
    height: "16px",
    borderRadius: "8px",
    backgroundColor: THEME.dangerRed,
    color: THEME.text,
    fontSize: "10px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
  },
  // Calls tab
  callCard: {
    display: "flex",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: `1px solid ${THEME.border}`,
    transition: "background-color 0.2s ease",
    cursor: "pointer",
  },
  callAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
    marginRight: "14px",
    flexShrink: 0,
  },
  callAvatarPlaceholder: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    marginRight: "14px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "700",
    color: THEME.text,
    background: `linear-gradient(135deg, ${THEME.teal}, #0088cc)`,
  },
  callInfo: {
    flex: 1,
    minWidth: 0,
  },
  callName: {
    fontSize: "15px",
    fontWeight: "600",
    color: THEME.text,
    marginBottom: "3px",
  },
  callMeta: {
    fontSize: "12px",
    color: THEME.textSecondary,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  callTime: {
    fontSize: "12px",
    color: THEME.textSecondary,
    textAlign: "right",
    flexShrink: 0,
  },
  // Chats tab
  chatCard: {
    display: "flex",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: `1px solid ${THEME.border}`,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  chatInfo: {
    flex: 1,
    minWidth: 0,
  },
  chatName: {
    fontSize: "15px",
    fontWeight: "600",
    color: THEME.text,
    marginBottom: "3px",
  },
  chatLastMsg: {
    fontSize: "13px",
    color: THEME.textSecondary,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chatMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
    gap: "6px",
  },
  chatTime: {
    fontSize: "11px",
    color: THEME.textSecondary,
  },
  unreadBadge: {
    minWidth: "20px",
    height: "20px",
    borderRadius: "10px",
    backgroundColor: THEME.teal,
    color: "#000",
    fontSize: "11px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 5px",
  },
  // Profile tab
  profileSection: {
    padding: "30px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  profileAvatar: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "16px",
    border: `3px solid ${THEME.teal}`,
    boxShadow: `0 0 20px rgba(0,191,166,0.2)`,
  },
  profileAvatarPlaceholder: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "36px",
    fontWeight: "700",
    color: THEME.text,
    background: `linear-gradient(135deg, ${THEME.teal}, #0088cc)`,
    border: `3px solid ${THEME.teal}`,
  },
  profileName: {
    fontSize: "22px",
    fontWeight: "700",
    color: THEME.text,
    marginBottom: "4px",
  },
  profileEmail: {
    fontSize: "14px",
    color: THEME.textSecondary,
    marginBottom: "24px",
  },
  statsRow: {
    display: "flex",
    gap: "16px",
    marginBottom: "30px",
    width: "100%",
    justifyContent: "center",
  },
  statCard: {
    padding: "16px 24px",
    borderRadius: "14px",
    backgroundColor: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    textAlign: "center",
    flex: 1,
    maxWidth: "130px",
  },
  statNumber: {
    fontSize: "24px",
    fontWeight: "700",
    color: THEME.teal,
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "12px",
    color: THEME.textSecondary,
    fontWeight: "500",
  },
  logoutBtn: {
    width: "100%",
    maxWidth: "300px",
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    backgroundColor: "rgba(248,81,73,0.1)",
    color: THEME.dangerRed,
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "10px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: THEME.textSecondary,
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  emptyText: {
    fontSize: "15px",
    fontWeight: "500",
    color: THEME.text,
    marginBottom: "6px",
  },
  emptySubtext: {
    fontSize: "13px",
    color: THEME.textSecondary,
  },
  deleteBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "transparent",
    color: THEME.textSecondary,
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    flexShrink: 0,
  },
};

export default function Dashboard({ onStartVideoCall }) {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("chats");
  const [chats, setChats] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendPresence, setFriendPresence] = useState(new Map());
  const [activeChatPeer, setActiveChatPeer] = useState(null);

  // Listen to chats
  useEffect(() => {
    if (!currentUser) return;
    const unsub = getChats(currentUser.uid, setChats);
    return unsub;
  }, [currentUser]);

  // Listen to call history
  useEffect(() => {
    if (!currentUser) return;
    const unsub = getCallHistory(currentUser.uid, 50, setCallHistory);
    return unsub;
  }, [currentUser]);

  // Listen to friends
  useEffect(() => {
    if (!currentUser) return;
    const unsub = getFriends(currentUser.uid, setFriends);
    return unsub;
  }, [currentUser]);

  // Watch friends presence
  useEffect(() => {
    if (friends.length === 0) {
      setFriendPresence(new Map());
      return;
    }
    const uids = friends.map((f) => f.uid);
    const unsub = watchMultiplePresence(uids, setFriendPresence);
    return unsub;
  }, [friends]);

  const totalUnread = chats.reduce((sum, chat) => {
    return sum + (chat.unreadCount?.[currentUser?.uid] || 0);
  }, 0);

  const handleOpenChat = useCallback((friend) => {
    setActiveChatPeer(friend);
  }, []);

  const handleBackFromChat = useCallback(() => {
    setActiveChatPeer(null);
  }, []);

  const handleStartCall = useCallback(
    (friend, type) => {
      console.log("[Dashboard] Starting", type, "call with", friend.displayName);
      if (onStartVideoCall) {
        onStartVideoCall(friend, type);
      }
    },
    [onStartVideoCall]
  );

  const handleChatClick = (chat) => {
    const otherUid = chat.participants.find((p) => p !== currentUser.uid);
    const friend = friends.find((f) => f.uid === otherUid);
    if (friend) {
      setActiveChatPeer(friend);
    } else {
      // Build peer from chat data
      setActiveChatPeer({
        uid: otherUid,
        displayName: otherUid,
        photoURL: "",
      });
    }
  };

  const handleDeleteCall = async (callId) => {
    try {
      await deleteCallRecord(currentUser.uid, callId);
    } catch (error) {
      console.error("[Dashboard] Delete call error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("[Dashboard] Logout error:", error);
    }
  };

  const renderAvatar = (photoURL, name, size = 48) => {
    if (photoURL) {
      return (
        <img
          src={photoURL}
          alt={name}
          style={{
            ...styles.callAvatar,
            width: `${size}px`,
            height: `${size}px`,
          }}
        />
      );
    }
    return (
      <div
        style={{
          ...styles.callAvatarPlaceholder,
          width: `${size}px`,
          height: `${size}px`,
          fontSize: `${Math.floor(size * 0.38)}px`,
        }}
      >
        {(name || "?").charAt(0).toUpperCase()}
      </div>
    );
  };

  const getChatDisplayInfo = (chat) => {
    const otherUid = chat.participants?.find((p) => p !== currentUser.uid);
    const friend = friends.find((f) => f.uid === otherUid);
    return {
      name: friend?.displayName || otherUid || "Unknown",
      photoURL: friend?.photoURL || "",
      uid: otherUid,
    };
  };

  const formatChatTime = (chat) => {
    const ts = chat.lastMessage?.timestamp;
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (days === 1) return "Yesterday";
    if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // If chat is open, render ChatRoom
  if (activeChatPeer) {
    return (
      <div style={styles.container}>
        <ChatRoom
          peer={activeChatPeer}
          onBack={handleBackFromChat}
          onStartCall={handleStartCall}
        />
      </div>
    );
  }

  const renderCallsTab = () => {
    if (callHistory.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📞</div>
          <div style={styles.emptyText}>No call history</div>
          <div style={styles.emptySubtext}>Your calls will appear here</div>
        </div>
      );
    }

    return callHistory.map((call) => (
      <div
        key={call.id}
        style={styles.callCard}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = THEME.cardBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        {renderAvatar(call.peerPhoto, call.peerName)}
        <div style={styles.callInfo}>
          <div style={styles.callName}>{call.peerName}</div>
          <div style={styles.callMeta}>
            <span>
              {call.direction === "incoming" ? "↙" : "↗"}{" "}
              {call.direction === "incoming" ? "Incoming" : "Outgoing"}
            </span>
            <span>•</span>
            <span>{call.type === "video" ? "🎥 Video" : "📞 Audio"}</span>
            {call.status === "missed" && (
              <>
                <span>•</span>
                <span style={{ color: THEME.dangerRed }}>Missed</span>
              </>
            )}
            {call.status === "answered" && call.duration > 0 && (
              <>
                <span>•</span>
                <span>{formatDuration(call.duration)}</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={styles.callTime}>{formatCallTime(call.startedAt)}</div>
          <button
            style={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCall(call.id);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(248,81,73,0.1)";
              e.currentTarget.style.color = THEME.dangerRed;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = THEME.textSecondary;
            }}
          >
            🗑
          </button>
        </div>
      </div>
    ));
  };

  const renderChatsTab = () => {
    if (chats.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>💬</div>
          <div style={styles.emptyText}>No conversations yet</div>
          <div style={styles.emptySubtext}>Start chatting with a friend!</div>
        </div>
      );
    }

    return chats.map((chat) => {
      const info = getChatDisplayInfo(chat);
      const unread = chat.unreadCount?.[currentUser.uid] || 0;
      const presence = friendPresence.get(info.uid) || { isOnline: false };
      const lastMsg = chat.lastMessage;
      const isSentByMe = lastMsg?.senderId === currentUser.uid;

      return (
        <div
          key={chat.id}
          style={styles.chatCard}
          onClick={() => handleChatClick(chat)}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = THEME.cardBg)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <div style={{ position: "relative" }}>
            {renderAvatar(info.photoURL, info.name)}
            <span
              style={{
                position: "absolute",
                bottom: "2px",
                right: "16px",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: presence.isOnline ? THEME.onlineGreen : THEME.offlineGray,
                border: `2px solid ${THEME.bg}`,
              }}
            />
          </div>
          <div style={styles.chatInfo}>
            <div style={styles.chatName}>{info.name}</div>
            <div style={styles.chatLastMsg}>
              {isSentByMe && <span style={{ color: THEME.textSecondary }}>You: </span>}
              {lastMsg?.text || "No messages yet"}
            </div>
          </div>
          <div style={styles.chatMeta}>
            <div style={styles.chatTime}>{formatChatTime(chat)}</div>
            {unread > 0 && <div style={styles.unreadBadge}>{unread}</div>}
          </div>
        </div>
      );
    });
  };

  const renderProfileTab = () => {
    return (
      <div style={styles.profileSection}>
        {currentUser?.photoURL ? (
          <img src={currentUser.photoURL} alt="Profile" style={styles.profileAvatar} />
        ) : (
          <div style={styles.profileAvatarPlaceholder}>
            {(currentUser?.displayName || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div style={styles.profileName}>{currentUser?.displayName || "User"}</div>
        <div style={styles.profileEmail}>{currentUser?.email || ""}</div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{friends.length}</div>
            <div style={styles.statLabel}>Friends</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{chats.length}</div>
            <div style={styles.statLabel}>Chats</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{callHistory.length}</div>
            <div style={styles.statLabel}>Calls</div>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: "300px",
            padding: "16px",
            borderRadius: "14px",
            backgroundColor: THEME.cardBg,
            border: `1px solid ${THEME.border}`,
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: THEME.textSecondary,
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Account Info
          </div>
          <div style={{ fontSize: "13px", color: THEME.textSecondary, marginBottom: "6px" }}>
            <span style={{ color: THEME.text }}>UID:</span> {currentUser?.uid?.slice(0, 16)}...
          </div>
          <div style={{ fontSize: "13px", color: THEME.textSecondary }}>
            <span style={{ color: THEME.text }}>Provider:</span> Google
          </div>
        </div>

        <button
          style={styles.logoutBtn}
          onClick={handleLogout}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(248,81,73,0.2)")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(248,81,73,0.1)")}
        >
          Sign Out
        </button>
      </div>
    );
  };

  const navItems = [
    { key: "calls", icon: "📞", label: "Calls" },
    { key: "chats", icon: "💬", label: "Chats", badge: totalUnread },
    { key: "friends", icon: "👥", label: "Friends" },
    { key: "profile", icon: "👤", label: "Profile" },
  ];

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.logo}>AuraCall</div>
        <button
          style={styles.notifBtn}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = THEME.border)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = THEME.inputBg)}
        >
          🔔
          {totalUnread > 0 && <span style={styles.notifBadge} />}
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === "calls" && renderCallsTab()}
        {activeTab === "chats" && renderChatsTab()}
        {activeTab === "friends" && (
          <FriendsList onOpenChat={handleOpenChat} onStartCall={handleStartCall} />
        )}
        {activeTab === "profile" && renderProfileTab()}
      </div>

      {/* Bottom Navigation */}
      <div style={styles.bottomNav}>
        {navItems.map((item) => (
          <button
            key={item.key}
            style={{
              ...styles.navItem,
              color: activeTab === item.key ? THEME.teal : THEME.textSecondary,
            }}
            onClick={() => setActiveTab(item.key)}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label}</span>
            {item.badge > 0 && <span style={styles.navBadge}>{item.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
