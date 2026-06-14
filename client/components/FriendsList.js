import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
} from "../lib/friends";
import { watchMultiplePresence, formatLastSeen } from "../lib/presence";
import UiIcon from "./UiIcon";

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
    height: "100%",
    backgroundColor: THEME.bg,
    color: THEME.text,
  },
  tabs: {
    display: "flex",
    borderBottom: `1px solid ${THEME.border}`,
    backgroundColor: THEME.cardBg,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: "14px 16px",
    textAlign: "center",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    color: THEME.textSecondary,
    border: "none",
    background: "none",
    transition: "all 0.2s ease",
    position: "relative",
    letterSpacing: "0.3px",
  },
  activeTab: {
    color: THEME.teal,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: "2px",
    backgroundColor: THEME.teal,
    borderRadius: "2px 2px 0 0",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "18px",
    height: "18px",
    borderRadius: "9px",
    backgroundColor: THEME.dangerRed,
    color: THEME.text,
    fontSize: "11px",
    fontWeight: "700",
    marginLeft: "6px",
    padding: "0 5px",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  },
  searchBox: {
    padding: "12px",
    borderBottom: `1px solid ${THEME.border}`,
    flexShrink: 0,
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: `1px solid ${THEME.border}`,
    backgroundColor: THEME.inputBg,
    color: THEME.text,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease",
  },
  card: {
    display: "flex",
    alignItems: "center",
    padding: "12px 14px",
    marginBottom: "8px",
    borderRadius: "14px",
    backgroundColor: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  avatar: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    objectFit: "cover",
    marginRight: "12px",
    flexShrink: 0,
    border: `2px solid ${THEME.border}`,
  },
  avatarPlaceholder: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    marginRight: "12px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "700",
    color: THEME.text,
    background: `linear-gradient(135deg, ${THEME.teal}, #0088cc)`,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: "15px",
    fontWeight: "600",
    color: THEME.text,
    marginBottom: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userStatus: {
    fontSize: "12px",
    color: THEME.textSecondary,
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  onlineDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },
  actions: {
    display: "flex",
    gap: "6px",
    flexShrink: 0,
  },
  iconBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "16px",
    transition: "all 0.2s ease",
    backgroundColor: THEME.inputBg,
    color: THEME.textSecondary,
  },
  tealBtn: {
    padding: "8px 16px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: THEME.teal,
    color: "#000",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  dangerBtn: {
    padding: "8px 16px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "rgba(248, 81, 73, 0.15)",
    color: THEME.dangerRed,
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: THEME.textSecondary,
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  emptyText: {
    fontSize: "15px",
    fontWeight: "500",
    marginBottom: "6px",
    color: THEME.text,
  },
  emptySubtext: {
    fontSize: "13px",
    color: THEME.textSecondary,
  },
  statusMsg: {
    padding: "10px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    textAlign: "center",
    marginBottom: "12px",
  },
};

export default function FriendsList({ onOpenChat, onStartCall }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [presenceData, setPresenceData] = useState(new Map());
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState("success");

  // Listen to friends list
  useEffect(() => {
    if (!currentUser) return;
    const unsub = getFriends(currentUser.uid, setFriends);
    return unsub;
  }, [currentUser]);

  // Listen to pending requests
  useEffect(() => {
    if (!currentUser) return;
    const unsub = getPendingRequests(currentUser.uid, setPendingRequests);
    return unsub;
  }, [currentUser]);

  // Listen to sent requests
  useEffect(() => {
    if (!currentUser) return;
    const unsub = getSentRequests(currentUser.uid, setSentRequests);
    return unsub;
  }, [currentUser]);

  // Watch presence for all friends
  useEffect(() => {
    if (friends.length === 0) {
      setPresenceData(new Map());
      return;
    }
    const uids = friends.map((f) => f.uid);
    const unsub = watchMultiplePresence(uids, setPresenceData);
    return unsub;
  }, [friends]);

  // Search users with debounce
  useEffect(() => {
    if (activeTab !== "discover" || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(async () => {
      const results = await searchUsers(searchQuery);
      // Filter out current user
      const filtered = results.filter((u) => u.id !== currentUser?.uid);
      setSearchResults(filtered);
      setSearching(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery, activeTab, currentUser]);

  const showStatus = useCallback((message, type = "success") => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const handleSendRequest = async (targetUser) => {
    try {
      await sendFriendRequest(currentUser, targetUser.id);
      showStatus(`Friend request sent to ${targetUser.displayName}!`);
    } catch (error) {
      showStatus(error.message, "error");
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      await acceptFriendRequest(request.id, currentUser, {
        uid: request.from,
        displayName: request.fromName,
        photoURL: request.fromPhoto,
      });
      showStatus(`You are now friends with ${request.fromName}!`);
    } catch (error) {
      showStatus(error.message, "error");
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      await rejectFriendRequest(request.id);
      showStatus("Request rejected");
    } catch (error) {
      showStatus(error.message, "error");
    }
  };

  const handleRemoveFriend = async (friend) => {
    if (!confirm(`Remove ${friend.displayName} from friends?`)) return;
    try {
      await removeFriend(currentUser.uid, friend.uid);
      showStatus(`Removed ${friend.displayName} from friends`);
    } catch (error) {
      showStatus(error.message, "error");
    }
  };

  const getPresence = (uid) => {
    return presenceData.get(uid) || { isOnline: false, lastSeen: null };
  };

  const renderAvatar = (photoURL, name) => {
    if (photoURL) {
      return <img src={photoURL} alt={name} style={styles.avatar} />;
    }
    return (
      <div style={styles.avatarPlaceholder}>
        {(name || "?").charAt(0).toUpperCase()}
      </div>
    );
  };

  const renderFriendsTab = () => {
    if (friends.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><UiIcon name="users" size={38} /></div>
          <div style={styles.emptyText}>No friends yet</div>
          <div style={styles.emptySubtext}>Discover people in the Discover tab</div>
        </div>
      );
    }

    // Sort: online first
    const sorted = [...friends].sort((a, b) => {
      const aOnline = getPresence(a.uid).isOnline ? 1 : 0;
      const bOnline = getPresence(b.uid).isOnline ? 1 : 0;
      return bOnline - aOnline;
    });

    return sorted.map((friend) => {
      const presence = getPresence(friend.uid);
      return (
        <div key={friend.uid} style={styles.card}>
          <div style={{ position: "relative" }}>
            {renderAvatar(friend.photoURL, friend.displayName)}
            <span
              style={{
                ...styles.onlineDot,
                backgroundColor: presence.isOnline ? THEME.onlineGreen : THEME.offlineGray,
                position: "absolute",
                bottom: "2px",
                right: "14px",
                border: `2px solid ${THEME.cardBg}`,
                width: "10px",
                height: "10px",
              }}
            />
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{friend.displayName}</div>
            <div style={styles.userStatus}>
              {presence.isOnline ? (
                <span style={{ color: THEME.onlineGreen }}>Online</span>
              ) : (
                <span>{formatLastSeen(presence.lastSeen)}</span>
              )}
            </div>
          </div>
          <div style={styles.actions}>
            <button
              style={styles.iconBtn}
              title="Chat"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChat && onOpenChat(friend);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = THEME.teal;
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = THEME.inputBg;
                e.currentTarget.style.color = THEME.textSecondary;
              }}
            >
              <UiIcon name="chat" size={18} />
            </button>
            <button
              style={styles.iconBtn}
              title="Audio Call"
              onClick={(e) => {
                e.stopPropagation();
                onStartCall && onStartCall(friend, "audio");
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = THEME.teal;
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = THEME.inputBg;
                e.currentTarget.style.color = THEME.textSecondary;
              }}
            >
              <UiIcon name="phone" size={18} />
            </button>
            <button
              style={styles.iconBtn}
              title="Video Call"
              onClick={(e) => {
                e.stopPropagation();
                onStartCall && onStartCall(friend, "video");
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = THEME.teal;
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = THEME.inputBg;
                e.currentTarget.style.color = THEME.textSecondary;
              }}
            >
              <UiIcon name="video" size={18} />
            </button>
            <button
              style={{ ...styles.iconBtn, fontSize: "14px" }}
              title="Remove Friend"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFriend(friend);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(248,81,73,0.15)";
                e.currentTarget.style.color = THEME.dangerRed;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = THEME.inputBg;
                e.currentTarget.style.color = THEME.textSecondary;
              }}
            >
              <UiIcon name="trash" size={17} />
            </button>
          </div>
        </div>
      );
    });
  };

  const renderRequestsTab = () => {
    if (pendingRequests.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><UiIcon name="inbox" size={38} /></div>
          <div style={styles.emptyText}>No pending requests</div>
          <div style={styles.emptySubtext}>When someone sends you a request, it will appear here</div>
        </div>
      );
    }

    return pendingRequests.map((req) => (
      <div key={req.id} style={styles.card}>
        {renderAvatar(req.fromPhoto, req.fromName)}
        <div style={styles.userInfo}>
          <div style={styles.userName}>{req.fromName}</div>
          <div style={styles.userStatus}>Wants to be your friend</div>
        </div>
        <div style={styles.actions}>
          <button
            style={styles.tealBtn}
            onClick={() => handleAcceptRequest(req)}
            onMouseEnter={(e) => (e.target.style.backgroundColor = THEME.tealHover)}
            onMouseLeave={(e) => (e.target.style.backgroundColor = THEME.teal)}
          >
            Accept
          </button>
          <button
            style={styles.dangerBtn}
            onClick={() => handleRejectRequest(req)}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(248,81,73,0.25)")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(248,81,73,0.15)")}
          >
            Reject
          </button>
        </div>
      </div>
    ));
  };

  const renderDiscoverTab = () => {
    const sentUids = sentRequests.map((r) => r.to);
    const friendUids = friends.map((f) => f.uid);

    return (
      <>
        <div style={styles.searchBox}>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = THEME.teal)}
            onBlur={(e) => (e.target.style.borderColor = THEME.border)}
          />
        </div>
        <div style={{ padding: "12px" }}>
          {searching && (
            <div style={{ textAlign: "center", padding: "20px", color: THEME.textSecondary }}>
              Searching...
            </div>
          )}
          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}><UiIcon name="search" size={38} /></div>
              <div style={styles.emptyText}>No users found</div>
              <div style={styles.emptySubtext}>Try a different name</div>
            </div>
          )}
          {!searching && searchQuery.trim().length < 2 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}><UiIcon name="globe" size={38} /></div>
              <div style={styles.emptyText}>Discover People</div>
              <div style={styles.emptySubtext}>Type at least 2 characters to search</div>
            </div>
          )}
          {searchResults.map((user) => {
            const isFriendAlready = friendUids.includes(user.id);
            const hasSentRequest = sentUids.includes(user.id);

            return (
              <div key={user.id} style={styles.card}>
                {renderAvatar(user.photoURL, user.displayName)}
                <div style={styles.userInfo}>
                  <div style={styles.userName}>{user.displayName}</div>
                  <div style={styles.userStatus}>{user.email}</div>
                </div>
                <div style={styles.actions}>
                  {isFriendAlready ? (
                    <span
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(0,191,166,0.1)",
                        color: THEME.teal,
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      ✓ Friends
                    </span>
                  ) : hasSentRequest ? (
                    <span
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        backgroundColor: THEME.inputBg,
                        color: THEME.textSecondary,
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      Pending
                    </span>
                  ) : (
                    <button
                      style={styles.tealBtn}
                      onClick={() => handleSendRequest(user)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = THEME.tealHover)}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = THEME.teal)}
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div style={styles.container}>
      {/* Status message */}
      {statusMessage && (
        <div
          style={{
            ...styles.statusMsg,
            backgroundColor:
              statusType === "error" ? "rgba(248,81,73,0.15)" : "rgba(0,191,166,0.15)",
            color: statusType === "error" ? THEME.dangerRed : THEME.teal,
            margin: "12px",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key: "friends", label: "Friends", count: friends.length },
          { key: "requests", label: "Requests", count: pendingRequests.length },
          { key: "discover", label: "Discover", count: 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && <span style={styles.badge}>{tab.count}</span>}
            {activeTab === tab.key && <span style={styles.tabIndicator} />}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "discover" ? (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {renderDiscoverTab()}
        </div>
      ) : (
        <div style={styles.content}>
          {activeTab === "friends" && renderFriendsTab()}
          {activeTab === "requests" && renderRequestsTab()}
        </div>
      )}
    </div>
  );
}
