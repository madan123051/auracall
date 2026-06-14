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
import { useLanguage } from "../lib/i18n";

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
    height: "100%",
    background: "radial-gradient(circle at 10% 0%, rgba(32,255,213,0.18), transparent 32%), radial-gradient(circle at 90% 4%, rgba(255,79,184,0.16), transparent 28%), linear-gradient(180deg, #070319 0%, #11082F 100%)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    margin: "12px 12px 0",
    padding: "12px 14px",
    borderRadius: "26px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))",
    border: `1px solid ${THEME.border}`,
    boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
    backdropFilter: "blur(24px)",
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
    padding: "18px 14px",
    backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
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
    padding: "11px 14px",
    borderRadius: "20px",
    border: `1px solid ${THEME.border}`,
    boxShadow: "0 14px 36px rgba(0,0,0,0.24)",
    fontSize: "14px",
    lineHeight: "1.4",
    wordBreak: "break-word",
    position: "relative",
  },
  sentBubble: {
    alignSelf: "flex-end",
    background: "linear-gradient(135deg, #20FFD5, #4AA3FF 58%, #8B5CFF)",
    color: "#050413",
    borderBottomRightRadius: "4px",
  },
  receivedBubble: {
    alignSelf: "flex-start",
    background: "linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.055))",
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
    margin: "0 12px 12px",
    padding: "12px",
    borderRadius: "28px",
    background: "rgba(12,8,34,0.82)",
    border: `1px solid ${THEME.border}`,
    boxShadow: "0 20px 60px rgba(0,0,0,0.34)",
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
    background: "linear-gradient(135deg, #20FFD5, #4AA3FF 58%, #8B5CFF)",
    color: "#050413",
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
  securityStrip: {
    margin: "10px 14px 0",
    padding: "10px 12px",
    borderRadius: "18px",
    background: "linear-gradient(135deg, rgba(32,255,213,0.14), rgba(139,92,255,0.14))",
    border: `1px solid ${THEME.border}`,
    color: THEME.text,
    fontSize: "12px",
    fontWeight: "800",
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    flexWrap: "wrap",
  },
  aiRail: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    padding: "10px 14px 0",
  },
  aiChip: {
    flexShrink: 0,
    padding: "9px 12px",
    borderRadius: "999px",
    border: `1px solid ${THEME.border}`,
    background: "rgba(255,255,255,0.10)",
    color: THEME.text,
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer",
  },
  badgeRow: { display: "flex", gap: "6px", marginTop: "7px", flexWrap: "wrap" },
  msgBadge: {
    padding: "4px 7px",
    borderRadius: "999px",
    background: "rgba(32,255,213,0.12)",
    color: THEME.text,
    fontSize: "10px",
    fontWeight: "800",
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
  const { language, languages, autoTranslate, t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [peerPresence, setPeerPresence] = useState({ isOnline: false, lastSeen: null });
  const [messageLimit, setMessageLimit] = useState(50);
  const [sending, setSending] = useState(false);
  const [translations, setTranslations] = useState({});
  const [showOriginal, setShowOriginal] = useState({});
  const [aiLoading, setAiLoading] = useState("");
  const [aiNote, setAiNote] = useState("");
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  const chatId = currentUser && peer ? getChatId(currentUser.uid, peer.uid) : null;
  const targetLanguage = languages.find((item) => item.code === language)?.label || "English";

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

  useEffect(() => {
    if (!autoTranslate || !messages.length || !currentUser) return;
    const latestIncoming = messages[messages.length - 1];
    if (
      !latestIncoming ||
      latestIncoming.senderId === currentUser.uid ||
      !latestIncoming.text ||
      translations[latestIncoming.id]
    ) return;

    let cancelled = false;
    const translateLatest = async () => {
      setAiLoading("translate");
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "translate",
            text: latestIncoming.text,
            targetLanguage,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Translation failed");
        if (!cancelled && !result.fallback && result.text) {
          setTranslations((current) => ({ ...current, [latestIncoming.id]: result.text }));
        }
        if (!cancelled && result.fallback) {
          setAiNote("Add OPENAI_API_KEY to enable live AI translation.");
        }
      } catch (error) {
        if (!cancelled) setAiNote(error.message || "Translation is temporarily unavailable.");
      } finally {
        if (!cancelled) setAiLoading("");
      }
    };
    translateLatest();
    return () => {
      cancelled = true;
    };
  }, [autoTranslate, currentUser, messages, targetLanguage, translations]);

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

  const runAiAction = async (action) => {
    const recentMessages = messages
      .slice(-10)
      .map((message) => `${message.senderId === currentUser.uid ? "Me" : peer.displayName}: ${message.text}`)
      .join("\n");
    const latestIncoming = [...messages]
      .reverse()
      .find((message) => message.senderId !== currentUser.uid && message.text);
    const sourceText = action === "translate" ? latestIncoming?.text : recentMessages;

    if (!sourceText) {
      setAiNote("There is not enough conversation context yet.");
      return;
    }

    setAiLoading(action);
    setAiNote("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: sourceText,
          targetLanguage,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI request failed");

      if (action === "smart_reply") {
        setInputText(result.text);
        if (result.fallback) setAiNote("Using local smart-reply fallback. Add OPENAI_API_KEY for full AI.");
      } else if (action === "translate" && latestIncoming) {
        if (result.fallback) {
          setAiNote("Add OPENAI_API_KEY to enable live AI translation.");
        } else {
          setTranslations((current) => ({ ...current, [latestIncoming.id]: result.text }));
        }
      } else {
        setAiNote(result.text);
      }
    } catch (error) {
      setAiNote(error.message || "AI is temporarily unavailable.");
    } finally {
      setAiLoading("");
    }
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

      <div style={styles.securityStrip}>
        <span>🔐 E2E encrypted</span>
        <span>🌐 Auto → {targetLanguage}</span>
        <span>{aiLoading ? "✨ AI working..." : "✨ AI ready"}</span>
      </div>
      <div style={styles.aiRail}>
        <button style={styles.aiChip} onClick={() => runAiAction("smart_reply")} disabled={Boolean(aiLoading)}>
          ✨ {t("smartReply")}
        </button>
        <button style={styles.aiChip} onClick={() => runAiAction("summarize")} disabled={Boolean(aiLoading)}>
          🤖 {t("summarize")}
        </button>
        <button style={styles.aiChip} onClick={() => runAiAction("translate")} disabled={Boolean(aiLoading)}>
          🌐 {t("translate")}
        </button>
      </div>
      {aiNote && (
        <div style={{ ...styles.securityStrip, marginTop: 8, color: THEME.textSecondary }}>
          <span>✨ {aiNote}</span>
          <button
            type="button"
            onClick={() => setAiNote("")}
            style={{ border: 0, background: "transparent", color: THEME.textSecondary, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      )}

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
                <div>
                  {!isSent && translations[msg.id] && !showOriginal[msg.id]
                    ? translations[msg.id]
                    : msg.text}
                </div>
                <div style={styles.badgeRow}>
                  <span style={styles.msgBadge}>🔐 Protected</span>
                  {!isSent && translations[msg.id] && (
                    <button
                      type="button"
                      style={{ ...styles.msgBadge, border: 0, cursor: "pointer" }}
                      onClick={() =>
                        setShowOriginal((current) => ({ ...current, [msg.id]: !current[msg.id] }))
                      }
                    >
                      🌐 {showOriginal[msg.id] ? t("translated") : t("original")}
                    </button>
                  )}
                </div>
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
          placeholder={t("typeMessage")}
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
