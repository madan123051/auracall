import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import {
  getChatId,
  sendMessage,
  getMessages,
  markAsRead,
  setTyping,
  watchTyping,
} from "../lib/chat";
import { watchPresence, formatLastSeen } from "../lib/presence";

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
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: THEME.cardBg,
    borderBottom: `1px solid ${THEME.border}`,
    flexShrink: 0,
  },
  backBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: THEME.inputBg,
    color: THEME.text,
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "12px",
    transition: "all 0.2s ease",
  },
  headerAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
    marginRight: "12px",
    border: `2px solid ${THEME.border}`,
  },
  headerAvatarPlaceholder: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    marginRight: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "700",
    color: THEME.text,
    background: `linear-gradient(135deg, ${THEME.teal}, #0088cc)`,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: "15px",
    fontWeight: "600",
    color: THEME.text,
  },
  headerStatus: {
    fontSize: "12px",
    color: THEME.textSecondary,
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  headerActions: {
    display: "flex",
    gap: "8px",
  },
  headerActionBtn: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: THEME.inputBg,
    color: THEME.textSecondary,
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  dateDivider: {
    textAlign: "center",
    padding: "8px 0",
    fontSize: "12px",
    color: THEME.textSecondary,
    fontWeight: "500",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: "10px 14px",
    borderRadius: "16px",
    fontSize: "14px",
    lineHeight: "1.4",
    wordBreak: "break-word",
    position: "relative",
  },
  sentBubble: {
    alignSelf: "flex-end",
    backgroundColor: THEME.teal,
    color: "#000",
    borderBottomRightRadius: "4px",
  },
  receivedBubble: {
    alignSelf: "flex-start",
    backgroundColor: THEME.cardBg,
    color: THEME.text,
    border: `1px solid ${THEME.border}`,
    borderBottomLeftRadius: "4px",
  },
  messageTime: {
    fontSize: "10px",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    justifyContent: "flex-end",
  },
  sentTime: {
    color: "rgba(0,0,0,0.5)",
  },
  receivedTime: {
    color: THEME.textSecondary,
  },
  readReceipt: {
    fontSize: "12px",
  },
  typingIndicator: {
    alignSelf: "flex-start",
    padding: "10px 16px",
    borderRadius: "16px",
    backgroundColor: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    borderBottomLeftRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  typingDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: THEME.textSecondary,
  },
  inputArea: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: THEME.cardBg,
    borderTop: `1px solid ${THEME.border}`,
    gap: "10px",
    flexShrink: 0,
  },
  messageInput: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "24px",
    border: `1px solid ${THEME.border}`,
    backgroundColor: THEME.inputBg,
    color: THEME.text,
    fontSize: "14px",
    outline: "none",
    resize: "none",
    maxHeight: "100px",
    lineHeight: "1.4",
    fontFamily: "inherit",
  },
  sendBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: THEME.teal,
    color: "#000",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: THEME.inputBg,
    color: THEME.textSecondary,
    cursor: "not-allowed",
  },
  loadMoreBtn: {
    alignSelf: "center",
    padding: "8px 20px",
    borderRadius: "20px",
    border: `1px solid ${THEME.border}`,
    backgroundColor: THEME.cardBg,
    color: THEME.textSecondary,
    fontSize: "12px",
    cursor: "pointer",
    marginBottom: "8px",
  },
};

export default function ChatRoom({ peer, onBack, onStartCall }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [peerPresence, setPeerPresence] = useState({ isOnline: false, lastSeen: null });
  const [messageLimit, setMessageLimit] = useState(50);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  const chatId = currentUser && peer ? getChatId(currentUser.uid, peer.uid) : null;

  // Listen to messages
  useEffect(() => {
    if (!chatId) return;
    const unsub = getMessages(chatId, messageLimit, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [chatId, messageLimit]);

  // Mark messages as read
  useEffect(() => {
    if (!chatId || !currentUser) return;
    markAsRead(chatId, currentUser.uid);
  }, [chatId, currentUser, messages]);

  // Watch peer presence
  useEffect(() => {
    if (!peer) return;
    const unsub = watchPresence(peer.uid, setPeerPresence);
    return unsub;
  }, [peer]);

  // Watch typing
  useEffect(() => {
    if (!chatId || !peer) return;
    const unsub = watchTyping(chatId, peer.uid, setIsTyping);
    return unsub;
  }, [chatId, peer]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Typing indicator
    if (chatId && currentUser) {
      setTyping(chatId, currentUser.uid, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(chatId, currentUser.uid, false);
      }, 3000);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !chatId || !currentUser || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    // Clear typing indicator
    setTyping(chatId, currentUser.uid, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await sendMessage(chatId, currentUser.uid, text);
    } catch (error) {
      console.error("[ChatRoom] Send error:", error);
      setInputText(text); // Restore on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLoadMore = () => {
    setMessageLimit((prev) => prev + 50);
  };

  const formatMessageTime = (date) => {
    if (!date) return "";
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const formatDateDivider = (date) => {
    if (!date) return "";
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const shouldShowDateDivider = (msg, index) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    if (!prev.timestamp || !msg.timestamp) return false;
    return prev.timestamp.toDateString() !== msg.timestamp.toDateString();
  };

  const renderAvatar = (photoURL, name) => {
    if (photoURL) {
      return <img src={photoURL} alt={name} style={styles.headerAvatar} />;
    }
    return (
      <div style={styles.headerAvatarPlaceholder}>
        {(name || "?").charAt(0).toUpperCase()}
      </div>
    );
  };

  if (!peer || !currentUser) return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backBtn}
          onClick={onBack}
          onMouseEnter={(e) => (e.target.style.backgroundColor = THEME.border)}
          onMouseLeave={(e) => (e.target.style.backgroundColor = THEME.inputBg)}
        >
          ←
        </button>
        {renderAvatar(peer.photoURL, peer.displayName)}
        <div style={styles.headerInfo}>
          <div style={styles.headerName}>{peer.displayName}</div>
          <div style={styles.headerStatus}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: peerPresence.isOnline ? THEME.onlineGreen : THEME.offlineGray,
                display: "inline-block",
              }}
            />
            {isTyping ? (
              <span style={{ color: THEME.teal }}>typing...</span>
            ) : peerPresence.isOnline ? (
              <span style={{ color: THEME.onlineGreen }}>Online</span>
            ) : (
              <span>{formatLastSeen(peerPresence.lastSeen)}</span>
            )}
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.headerActionBtn}
            title="Audio Call"
            onClick={() => onStartCall && onStartCall(peer, "audio")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = THEME.teal;
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = THEME.inputBg;
              e.currentTarget.style.color = THEME.textSecondary;
            }}
          >
            📞
          </button>
          <button
            style={styles.headerActionBtn}
            title="Video Call"
            onClick={() => onStartCall && onStartCall(peer, "video")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = THEME.teal;
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = THEME.inputBg;
              e.currentTarget.style.color = THEME.textSecondary;
            }}
          >
            🎥
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesArea} ref={messagesAreaRef}>
        {messages.length >= messageLimit && (
          <button style={styles.loadMoreBtn} onClick={handleLoadMore}>
            Load older messages
          </button>
        )}

        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: THEME.textSecondary,
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>💬</div>
            <div style={{ fontSize: "15px", fontWeight: "500", color: THEME.text }}>
              Start a conversation
            </div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>
              Send a message to {peer.displayName}
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isSent = msg.senderId === currentUser.uid;
          return (
            <React.Fragment key={msg.id}>
              {shouldShowDateDivider(msg, index) && (
                <div style={styles.dateDivider}>{formatDateDivider(msg.timestamp)}</div>
              )}
              <div
                style={{
                  ...styles.messageBubble,
                  ...(isSent ? styles.sentBubble : styles.receivedBubble),
                }}
              >
                <div>{msg.text}</div>
                <div
                  style={{
                    ...styles.messageTime,
                    ...(isSent ? styles.sentTime : styles.receivedTime),
                  }}
                >
                  <span>{formatMessageTime(msg.timestamp)}</span>
                  {isSent && (
                    <span style={styles.readReceipt}>
                      {msg.read ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div style={styles.typingIndicator}>
            <div
              style={{
                ...styles.typingDot,
                animation: "typingBounce 1.4s infinite",
                animationDelay: "0s",
              }}
            />
            <div
              style={{
                ...styles.typingDot,
                animation: "typingBounce 1.4s infinite",
                animationDelay: "0.2s",
              }}
            />
            <div
              style={{
                ...styles.typingDot,
                animation: "typingBounce 1.4s infinite",
                animationDelay: "0.4s",
              }}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <textarea
          style={styles.messageInput}
          placeholder="Type a message..."
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => (e.target.style.borderColor = THEME.teal)}
          onBlur={(e) => (e.target.style.borderColor = THEME.border)}
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            ...(!inputText.trim() ? styles.sendBtnDisabled : {}),
          }}
          onClick={handleSend}
          disabled={!inputText.trim() || sending}
          onMouseEnter={(e) => {
            if (inputText.trim()) e.target.style.backgroundColor = THEME.tealHover;
          }}
          onMouseLeave={(e) => {
            if (inputText.trim()) e.target.style.backgroundColor = THEME.teal;
          }}
        >
          ➤
        </button>
      </div>

      {/* Typing animation styles */}
      <style jsx global>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
