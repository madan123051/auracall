import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthProvider";
import FriendsList from "./FriendsList";
import ChatRoom from "./ChatRoom";
import { getChats, getChatId, markAsRead } from "../lib/chat";
import { getCallHistory, deleteCallRecord, formatDuration, formatCallTime } from "../lib/callHistory";
import { getFriends } from "../lib/friends";
import { watchMultiplePresence, formatLastSeen } from "../lib/presence";
import { getUserProfile, updateUserDisplayName, updateUserBio, uploadProfilePhoto } from "../lib/auth";

const THEME = {
  bg: "#070319",
  cardBg: "rgba(255,255,255,0.08)",
  teal: "#20FFD5",
  tealHover: "#6C63FF",
  text: "#F8FBFF",
  textSecondary: "#AAB7D4",
  border: "rgba(255,255,255,0.14)",
  inputBg: "rgba(255,255,255,0.10)",
  onlineGreen: "#2EA043",
  offlineGray: "#484F58",
  dangerRed: "#F85149",
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "radial-gradient(circle at 12% 0%, rgba(32,255,213,0.22), transparent 32%), radial-gradient(circle at 92% 8%, rgba(255,79,184,0.18), transparent 28%), linear-gradient(180deg, #070319 0%, #11082F 100%)",
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
    margin: "12px 12px 0",
    borderRadius: "28px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))",
    border: `1px solid ${THEME.border}`,
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(24px)",
    flexShrink: 0,
  },
  logo: {
    fontSize: "24px",
    fontWeight: "900",
    background: "linear-gradient(135deg, #20FFD5 0%, #4AA3FF 45%, #8B5CFF 75%, #FF4FB8 100%)",
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
    margin: "0 14px 14px",
    borderRadius: "28px",
    border: `1px solid ${THEME.border}`,
    background: "rgba(12,8,34,0.82)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.42)",
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
    margin: "10px 14px",
    padding: "16px",
    borderRadius: "24px",
    border: `1px solid ${THEME.border}`,
    background: "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
    boxShadow: "0 14px 44px rgba(0,0,0,0.25)",
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
    margin: "10px 14px",
    padding: "16px",
    borderRadius: "24px",
    border: `1px solid ${THEME.border}`,
    background: "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
    boxShadow: "0 14px 44px rgba(0,0,0,0.25)",
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
    padding: "0",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },
  profileHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "30px 20px 24px",
    background: `linear-gradient(180deg, ${THEME.cardBg} 0%, ${THEME.bg} 100%)`,
  },
  profileAvatarWrap: {
    position: "relative",
    cursor: "pointer",
    marginBottom: "16px",
  },
  profileAvatar: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    objectFit: "cover",
    border: `3px solid ${THEME.teal}`,
    boxShadow: `0 0 24px rgba(0,191,166,0.25)`,
  },
  profileAvatarPlaceholder: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "42px",
    fontWeight: "700",
    color: THEME.text,
    background: `linear-gradient(135deg, ${THEME.teal}, #0088cc)`,
    border: `3px solid ${THEME.teal}`,
    boxShadow: `0 0 24px rgba(0,191,166,0.25)`,
  },
  cameraIcon: {
    position: "absolute",
    bottom: "4px",
    right: "4px",
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: THEME.teal,
    border: `3px solid ${THEME.bg}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    cursor: "pointer",
  },
  profileNameLarge: {
    fontSize: "24px",
    fontWeight: "700",
    color: THEME.text,
    marginBottom: "2px",
  },
  profileEmailSmall: {
    fontSize: "14px",
    color: THEME.textSecondary,
  },
  profileFieldSection: {
    padding: "0 20px",
  },
  profileFieldRow: {
    display: "flex",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: `1px solid ${THEME.border}`,
    gap: "14px",
  },
  profileFieldIcon: {
    width: "24px",
    fontSize: "18px",
    flexShrink: 0,
    textAlign: "center",
    color: THEME.textSecondary,
  },
  profileFieldContent: {
    flex: 1,
    minWidth: 0,
  },
  profileFieldLabel: {
    fontSize: "12px",
    color: THEME.textSecondary,
    marginBottom: "2px",
    fontWeight: "500",
  },
  profileFieldValue: {
    fontSize: "16px",
    color: THEME.text,
    wordBreak: "break-word",
  },
  profileFieldEdit: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "transparent",
    color: THEME.textSecondary,
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.2s ease",
  },
  profileEditInput: {
    width: "100%",
    padding: "8px 0",
    border: "none",
    borderBottom: `2px solid ${THEME.teal}`,
    backgroundColor: "transparent",
    color: THEME.text,
    fontSize: "16px",
    outline: "none",
    fontFamily: "inherit",
  },
  profileEditActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    marginTop: "8px",
  },
  profileEditBtn: {
    padding: "6px 16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  statsRow: {
    display: "flex",
    gap: "12px",
    margin: "20px 20px",
    justifyContent: "center",
  },
  statCard: {
    padding: "14px 20px",
    borderRadius: "14px",
    backgroundColor: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    textAlign: "center",
    flex: 1,
    maxWidth: "110px",
  },
  statNumber: {
    fontSize: "22px",
    fontWeight: "700",
    color: THEME.teal,
    marginBottom: "2px",
  },
  statLabel: {
    fontSize: "11px",
    color: THEME.textSecondary,
    fontWeight: "500",
  },
  logoutBtn: {
    width: "calc(100% - 40px)",
    margin: "16px 20px 24px",
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    backgroundColor: "rgba(248,81,73,0.1)",
    color: THEME.dangerRed,
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
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
  upgradeHero: {
    margin: "12px 14px 8px",
    padding: "18px",
    borderRadius: "30px",
    border: `1px solid ${THEME.border}`,
    background: "linear-gradient(135deg, rgba(32,255,213,0.18), rgba(139,92,255,0.20) 52%, rgba(255,79,184,0.14))",
    boxShadow: "0 24px 70px rgba(0,0,0,0.30)",
  },
  upgradeKicker: {
    color: THEME.teal,
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  upgradeTitle: {
    margin: "6px 0 8px",
    fontSize: "24px",
    lineHeight: 1.05,
    fontWeight: "950",
    color: THEME.text,
    letterSpacing: "-0.8px",
  },
  upgradeSubtitle: {
    color: THEME.textSecondary,
    fontSize: "13px",
    lineHeight: 1.45,
  },
  pillRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" },
  featurePill: {
    padding: "7px 10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.10)",
    border: `1px solid ${THEME.border}`,
    fontSize: "11px",
    fontWeight: "800",
    color: THEME.text,
  },
  settingChip: {
    margin: "10px 20px 0",
    padding: "14px",
    borderRadius: "20px",
    border: `1px solid ${THEME.border}`,
    background: "linear-gradient(135deg, rgba(32,255,213,0.12), rgba(139,92,255,0.12))",
    color: THEME.text,
    fontSize: "13px",
    fontWeight: "700",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    color: THEME.text,
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

  // Profile editing state
  const [profile, setProfile] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempBio, setTempBio] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);
  const fileInputRef = useRef(null);

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

  // Load user profile from Firestore (includes bio)
  useEffect(() => {
    if (!currentUser) return;
    getUserProfile(currentUser.uid).then((p) => {
      if (p) setProfile(p);
    });
  }, [currentUser]);

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

  // Profile editing handlers
  const showProfileStatus = (msg, type = "success") => {
    setProfileStatus({ msg, type });
    setTimeout(() => setProfileStatus(null), 2500);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    try {
      await updateUserDisplayName(currentUser, tempName.trim());
      setProfile((prev) => ({ ...prev, displayName: tempName.trim() }));
      setEditingName(false);
      showProfileStatus("Name updated ✓");
    } catch (error) {
      showProfileStatus(error.message, "error");
    }
  };

  const handleSaveBio = async () => {
    try {
      await updateUserBio(currentUser.uid, tempBio);
      setProfile((prev) => ({ ...prev, bio: tempBio }));
      setEditingBio(false);
      showProfileStatus("About updated ✓");
    } catch (error) {
      showProfileStatus(error.message, "error");
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate file
    if (!file.type.startsWith("image/")) {
      showProfileStatus("Please select an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showProfileStatus("Image must be under 5MB", "error");
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(currentUser, file);
      setProfile((prev) => ({ ...prev, photoURL: url }));
      showProfileStatus("Photo updated ✓");
    } catch (error) {
      showProfileStatus(error.message, "error");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        onMouseLeave={(e) => (e.currentTarget.style.background = "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))")}
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
          onMouseLeave={(e) => (e.currentTarget.style.background = "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))")}
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
    const displayName = profile?.displayName || currentUser?.displayName || "User";
    const photoURL = profile?.photoURL || currentUser?.photoURL || "";
    const email = profile?.email || currentUser?.email || "";
    const bio = profile?.bio ?? "Hey there! I am using AuraCall ✌️";

    return (
      <div style={styles.profileSection}>
        {/* Hidden file input for photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handlePhotoSelect}
        />

        {/* Status toast */}
        {profileStatus && (
          <div
            style={{
              padding: "10px 20px",
              margin: "8px 20px",
              borderRadius: "10px",
              fontSize: "13px",
              textAlign: "center",
              backgroundColor:
                profileStatus.type === "error" ? "rgba(248,81,73,0.15)" : "rgba(0,191,166,0.15)",
              color: profileStatus.type === "error" ? THEME.dangerRed : THEME.teal,
            }}
          >
            {profileStatus.msg}
          </div>
        )}

        {/* Profile Header with Photo */}
        <div style={styles.profileHeader}>
          <div
            style={styles.profileAvatarWrap}
            onClick={() => fileInputRef.current?.click()}
          >
            {photoURL ? (
              <img src={photoURL} alt="Profile" style={styles.profileAvatar} />
            ) : (
              <div style={styles.profileAvatarPlaceholder}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {uploadingPhoto ? (
              <div style={styles.uploadingOverlay}>⏳</div>
            ) : (
              <div style={styles.cameraIcon}>📷</div>
            )}
          </div>
          <div style={styles.profileNameLarge}>{displayName}</div>
          <div style={styles.profileEmailSmall}>{email}</div>
        </div>

        {/* Profile Fields */}
        <div style={styles.profileFieldSection}>
          {/* Name Field */}
          <div style={styles.profileFieldRow}>
            <div style={styles.profileFieldIcon}>👤</div>
            <div style={styles.profileFieldContent}>
              <div style={styles.profileFieldLabel}>Name</div>
              {editingName ? (
                <div>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    style={styles.profileEditInput}
                    autoFocus
                    maxLength={50}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  />
                  <div style={styles.profileEditActions}>
                    <button
                      style={{
                        ...styles.profileEditBtn,
                        backgroundColor: THEME.inputBg,
                        color: THEME.textSecondary,
                      }}
                      onClick={() => setEditingName(false)}
                    >
                      Cancel
                    </button>
                    <button
                      style={{
                        ...styles.profileEditBtn,
                        backgroundColor: THEME.teal,
                        color: "#000",
                      }}
                      onClick={handleSaveName}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.profileFieldValue}>{displayName}</div>
              )}
              {!editingName && (
                <div style={{ fontSize: "12px", color: THEME.textSecondary, marginTop: "2px" }}>
                  This is not your username or pin. This name will be visible to your friends.
                </div>
              )}
            </div>
            {!editingName && (
              <button
                style={styles.profileFieldEdit}
                onClick={() => {
                  setTempName(displayName);
                  setEditingName(true);
                  setEditingBio(false);
                }}
              >
                ✏️
              </button>
            )}
          </div>

          {/* About / Bio Field */}
          <div style={styles.profileFieldRow}>
            <div style={styles.profileFieldIcon}>ℹ️</div>
            <div style={styles.profileFieldContent}>
              <div style={styles.profileFieldLabel}>About</div>
              {editingBio ? (
                <div>
                  <input
                    type="text"
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                    style={styles.profileEditInput}
                    autoFocus
                    maxLength={140}
                    placeholder="Write something about yourself..."
                    onKeyDown={(e) => e.key === "Enter" && handleSaveBio()}
                  />
                  <div style={{ fontSize: "11px", color: THEME.textSecondary, marginTop: "4px", textAlign: "right" }}>
                    {tempBio.length}/140
                  </div>
                  <div style={styles.profileEditActions}>
                    <button
                      style={{
                        ...styles.profileEditBtn,
                        backgroundColor: THEME.inputBg,
                        color: THEME.textSecondary,
                      }}
                      onClick={() => setEditingBio(false)}
                    >
                      Cancel
                    </button>
                    <button
                      style={{
                        ...styles.profileEditBtn,
                        backgroundColor: THEME.teal,
                        color: "#000",
                      }}
                      onClick={handleSaveBio}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.profileFieldValue}>{bio}</div>
              )}
            </div>
            {!editingBio && (
              <button
                style={styles.profileFieldEdit}
                onClick={() => {
                  setTempBio(bio);
                  setEditingBio(true);
                  setEditingName(false);
                }}
              >
                ✏️
              </button>
            )}
          </div>

          {/* Email Field (read-only) */}
          <div style={styles.profileFieldRow}>
            <div style={styles.profileFieldIcon}>📧</div>
            <div style={styles.profileFieldContent}>
              <div style={styles.profileFieldLabel}>Email</div>
              <div style={styles.profileFieldValue}>{email}</div>
            </div>
          </div>
        </div>

        <div style={styles.settingChip}>🌐 Auto translate incoming: ON · Display language: English · Original text available in chat</div>
        <div style={styles.settingChip}>🔐 Encryption mode: E2E active · Backup encryption ready with PBKDF2</div>

        {/* Stats */}
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

        {/* Sign Out */}
        <button
          style={styles.logoutBtn}
          onClick={handleLogout}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(248,81,73,0.2)")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(248,81,73,0.1)")}
        >
          Sign Out
        </button>

        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: THEME.textSecondary,
            paddingBottom: "20px",
          }}
        >
          AuraCall X v2 Intelligence
        </div>
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
        <div style={styles.logo}>AuraCall X</div>
        <button
          style={styles.notifBtn}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = THEME.border)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = THEME.inputBg)}
        >
          🔔
          {totalUnread > 0 && <span style={styles.notifBadge} />}
        </button>
      </div>

      <div style={styles.upgradeHero}>
        <div style={styles.upgradeKicker}>Version 2 Intelligence Layer</div>
        <div style={styles.upgradeTitle}>AI chat, live translation, protected calls.</div>
        <div style={styles.upgradeSubtitle}>Receiver-language display, smart replies, and encryption status are now built into the real web app.</div>
        <div style={styles.pillRow}>
          <span style={styles.featurePill}>🤖 Smart replies</span>
          <span style={styles.featurePill}>🌐 Auto translate</span>
          <span style={styles.featurePill}>🔐 E2E + backup</span>
        </div>
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
