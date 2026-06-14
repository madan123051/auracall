import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import {
  getChatId,
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  setTyping,
  watchTyping,
} from "../lib/chat";
import { watchPresence, formatLastSeen } from "../lib/presence";
import { useLanguage } from "../lib/i18n";
import { getUserProfile } from "../lib/auth";
import SwipeActionRow from "./SwipeActionRow";
import UiIcon from "./UiIcon";

const AI_REQUEST_TIMEOUT_MS = 12000;

function isOpaqueUserName(name, uid) {
  const value = String(name || "").trim();
  if (!value || value === uid) return true;
  return value.length > 24 && !/\s/.test(value);
}

function getFriendlyName(name, uid) {
  return isOpaqueUserName(name, uid) ? "Aura user" : String(name).trim();
}

async function requestAi(payload, signal) {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "AI request failed");
  return result;
}

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
    position: "relative",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
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
    minWidth: 0,
    overflow: "hidden",
  },
  headerName: {
    fontSize: "15px",
    fontWeight: "600",
    color: THEME.text,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
    flexShrink: 0,
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
    minHeight: 0,
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
    margin: "0 12px max(12px, env(safe-area-inset-bottom, 0px))",
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
    fontSize: "11px",
    fontWeight: "750",
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
    padding: "8px 11px",
    borderRadius: "999px",
    border: `1px solid ${THEME.border}`,
    background: "rgba(255,255,255,0.10)",
    color: THEME.text,
    fontSize: "11px",
    fontWeight: "750",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  msgBadge: {
    padding: "2px 0",
    borderRadius: "999px",
    background: "transparent",
    color: THEME.textSecondary,
    fontSize: "9px",
    fontWeight: "750",
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
  const {
    translationLanguage,
    translationLanguages,
    setTranslationLanguage,
    autoTranslate,
    setAutoTranslate,
    t,
  } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [peerPresence, setPeerPresence] = useState({ isOnline: false, lastSeen: null });
  const [messageLimit, setMessageLimit] = useState(50);
  const [sending, setSending] = useState(false);
  const [translations, setTranslations] = useState({});
  const [showOriginal, setShowOriginal] = useState({});
  const [aiLoading, setAiLoading] = useState("");
  const [translationPending, setTranslationPending] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [peerProfile, setPeerProfile] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const attemptedTranslationsRef = useRef(new Set());

  const chatId = currentUser && peer ? getChatId(currentUser.uid, peer.uid) : null;
  const targetLanguage =
    translationLanguages.find((item) => item.code === translationLanguage)?.label || "English";
  const peerName = getFriendlyName(peerProfile?.displayName || peer?.displayName, peer?.uid);
  const peerPhoto = peerProfile?.photoURL || peer?.photoURL || "";

  useEffect(() => {
    attemptedTranslationsRef.current = new Set();
    setTranslations({});
    setShowOriginal({});
    setPeerProfile(null);

    if (!peer?.uid) return;
    let cancelled = false;
    getUserProfile(peer.uid).then((profile) => {
      if (!cancelled && profile) setPeerProfile(profile);
    });
    return () => {
      cancelled = true;
    };
  }, [peer?.uid]);

  useEffect(() => {
    attemptedTranslationsRef.current = new Set();
    setTranslations({});
    setShowOriginal({});
  }, [translationLanguage]);

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
      translations[latestIncoming.id] ||
      attemptedTranslationsRef.current.has(latestIncoming.id)
    ) return;

    attemptedTranslationsRef.current.add(latestIncoming.id);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    let cancelled = false;
    const translateLatest = async () => {
      setTranslationPending(latestIncoming.id);
      try {
        const result = await requestAi(
          {
            action: "translate",
            text: latestIncoming.text,
            targetLanguage,
          },
          controller.signal
        );
        if (!cancelled && !result.fallback && result.text) {
          setTranslations((current) => ({ ...current, [latestIncoming.id]: result.text }));
        }
        if (!cancelled && result.fallback) {
          setAiNote("Add OPENAI_API_KEY to enable live AI translation.");
        }
      } catch (error) {
        if (!cancelled) {
          setAiNote(
            error.name === "AbortError"
              ? "Translation paused. Tap Translate to try again."
              : error.message || "Translation is temporarily unavailable."
          );
        }
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setTranslationPending("");
      }
    };
    translateLatest();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [autoTranslate, currentUser, messages, targetLanguage, translations]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

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

  const handleDeleteMessage = async (message) => {
    await deleteMessage(chatId, message.id, currentUser.uid);
    setTranslations((current) => {
      const next = { ...current };
      delete next[message.id];
      return next;
    });
    setActionNotice("Message deleted");
    window.setTimeout(() => setActionNotice(""), 2200);
  };

  const translateMessage = async (message, automatic = false) => {
    if (!message?.id || !message.text || message.senderId === currentUser.uid) return;
    if (translationPending && translationPending !== message.id) {
      setAiNote("Wait for the current translation to finish.");
      return;
    }

    if (automatic) attemptedTranslationsRef.current.add(message.id);
    setTranslationPending(message.id);
    setAiNote("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    try {
      const result = await requestAi(
        {
          action: "translate",
          text: message.text,
          targetLanguage,
          sourceLanguage: "Auto detect",
        },
        controller.signal
      );
      if (result.fallback) {
        setAiNote("Live translation needs OPENAI_API_KEY on the server.");
      } else if (result.text) {
        setTranslations((current) => ({ ...current, [message.id]: result.text }));
        setShowOriginal((current) => ({ ...current, [message.id]: false }));
      }
    } catch (error) {
      setAiNote(
        error.name === "AbortError"
          ? "Translation took too long. Tap Translate to retry."
          : error.message || "Translation is temporarily unavailable."
      );
    } finally {
      window.clearTimeout(timeout);
      setTranslationPending("");
    }
  };

  const runAiAction = async (action) => {
    const recentMessages = messages
      .slice(-10)
      .map((message) => `${message.senderId === currentUser.uid ? "Me" : peerName}: ${message.text}`)
      .join("\n");
    const latestIncoming = [...messages]
      .reverse()
      .find((message) => message.senderId !== currentUser.uid && message.text);
    const sourceText = action === "translate" ? latestIncoming?.text : recentMessages;

    if (!sourceText) {
      setAiNote("There is not enough conversation context yet.");
      return;
    }

    if (action === "translate" && latestIncoming) {
      await translateMessage(latestIncoming);
      return;
    }

    setAiLoading(action);
    setAiNote("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    try {
      const result = await requestAi(
        {
          action,
          text: sourceText,
          targetLanguage,
        },
        controller.signal
      );

      if (action === "smart_reply") {
        setInputText(result.text);
        if (result.fallback) setAiNote("Using local smart-reply fallback. Add OPENAI_API_KEY for full AI.");
      } else {
        setAiNote(result.text);
      }
    } catch (error) {
      setAiNote(
        error.name === "AbortError"
          ? "AI took too long to respond. Please try again."
          : error.message || "AI is temporarily unavailable."
      );
    } finally {
      window.clearTimeout(timeout);
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
      return <img className="aura-chat-avatar" src={photoURL} alt={name} style={styles.headerAvatar} />;
    }
    return (
      <div className="aura-chat-avatar" style={styles.headerAvatarPlaceholder}>
        {(name || "?").charAt(0).toUpperCase()}
      </div>
    );
  };

  if (!peer || !currentUser) return null;

  return (
    <div className="aura-chat-room" style={styles.container}>
      {/* Header */}
      <div className="aura-chat-header" style={styles.header}>
        <button
          className="aura-chat-back"
          style={styles.backBtn}
          onClick={onBack}
          aria-label="Back to conversations"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = THEME.border)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = THEME.inputBg)}
        >
          <UiIcon name="back" size={19} strokeWidth={2} />
        </button>
        {renderAvatar(peerPhoto, peerName)}
        <div className="aura-chat-header-info" style={styles.headerInfo}>
          <div className="aura-chat-header-name" style={styles.headerName} title={peerName}>{peerName}</div>
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
        <div className="aura-chat-header-actions" style={styles.headerActions}>
          <button
            className="aura-chat-call-button"
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
            <UiIcon name="phone" size={18} />
          </button>
          <button
            className="aura-chat-call-button"
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
            <UiIcon name="video" size={19} />
          </button>
        </div>
      </div>

      <div className="aura-chat-security" style={styles.securityStrip}>
        <span><UiIcon name="lock" size={14} strokeWidth={2} /> Protected</span>
        <span><UiIcon name="globe" size={15} /> {autoTranslate ? "Auto" : "Manual"} → {targetLanguage}</span>
        <span className={aiLoading || translationPending ? "is-working" : ""}>
          <i />
          {aiLoading ? "AI working" : translationPending ? "Translating" : "AI ready"}
        </span>
      </div>
      <div className="aura-chat-translation-controls">
        <label>
          <UiIcon name="globe" size={15} />
          <span>Translate to</span>
          <select
            value={translationLanguage}
            onChange={(event) => setTranslationLanguage(event.target.value)}
            aria-label="Translation language"
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
          {autoTranslate ? "Auto translate ON" : "Manual translate"}
        </button>
      </div>
      <div className="aura-chat-ai-rail" style={styles.aiRail}>
        <button style={styles.aiChip} onClick={() => runAiAction("smart_reply")} disabled={Boolean(aiLoading)}>
          <UiIcon name="spark" size={15} /> {t("smartReply")}
        </button>
        <button style={styles.aiChip} onClick={() => runAiAction("summarize")} disabled={Boolean(aiLoading)}>
          <UiIcon name="summary" size={15} /> {t("summarize")}
        </button>
        <button style={styles.aiChip} onClick={() => runAiAction("translate")} disabled={Boolean(aiLoading)}>
          <UiIcon name="globe" size={15} /> {t("translate")}
        </button>
      </div>
      {aiNote && (
        <div className="aura-chat-ai-note" style={{ ...styles.securityStrip, marginTop: 8, color: THEME.textSecondary }}>
          <span><UiIcon name="spark" size={13} /> {aiNote}</span>
          <button
            type="button"
            onClick={() => setAiNote("")}
            style={{ border: 0, background: "transparent", color: THEME.textSecondary, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      )}
      {actionNotice && <div className="aura-action-notice">{actionNotice}</div>}

      {/* Messages */}
      <div className="aura-chat-messages" style={styles.messagesArea} ref={messagesAreaRef}>
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
            <span className="aura-chat-empty-icon"><UiIcon name="chat" size={30} /></span>
            <div style={{ fontSize: "15px", fontWeight: "500", color: THEME.text }}>
              Start a conversation
            </div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>
              Send a message to {peerName}
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
              {isSent ? (
                <SwipeActionRow
                  className="aura-message-row is-sent"
                  confirmMessage="Delete this message for everyone?"
                  deleteLabel="Delete"
                  onDelete={() => handleDeleteMessage(msg)}
                  onDeleteError={(error) => {
                    setActionNotice(error.message || "Could not delete message");
                    window.setTimeout(() => setActionNotice(""), 2600);
                  }}
                >
                  <div
                    className="aura-message-bubble is-sent"
                    style={{ ...styles.messageBubble, ...styles.sentBubble }}
                  >
                    <div>{msg.text}</div>
                    <div className="aura-message-meta">
                      <span className="aura-message-protected" title="Protected message">
                        <UiIcon name="lock" size={10} strokeWidth={2} />
                      </span>
                      <div style={{ ...styles.messageTime, ...styles.sentTime }}>
                        <span>{formatMessageTime(msg.timestamp)}</span>
                        <span style={styles.readReceipt}>{msg.read ? "✓✓" : "✓"}</span>
                      </div>
                    </div>
                  </div>
                </SwipeActionRow>
              ) : (
                <div
                  className="aura-message-bubble is-received"
                  style={{ ...styles.messageBubble, ...styles.receivedBubble }}
                >
                  <div>
                    {translations[msg.id] && !showOriginal[msg.id]
                      ? translations[msg.id]
                      : msg.text}
                  </div>
                  <div className="aura-message-meta">
                    <button
                      type="button"
                      style={{ ...styles.msgBadge, border: 0, cursor: "pointer" }}
                      disabled={Boolean(translationPending)}
                      onClick={() => {
                        if (translations[msg.id]) {
                          setShowOriginal((current) => ({ ...current, [msg.id]: !current[msg.id] }));
                        } else {
                          translateMessage(msg);
                        }
                      }}
                    >
                      <UiIcon name="globe" size={11} />
                      {translationPending === msg.id
                        ? "Translating..."
                        : translations[msg.id]
                          ? showOriginal[msg.id] ? t("translated") : t("original")
                          : t("translate")}
                    </button>
                    <span className="aura-message-protected" title="Protected message">
                      <UiIcon name="lock" size={10} strokeWidth={2} />
                    </span>
                    <div style={{ ...styles.messageTime, ...styles.receivedTime }}>
                      <span>{formatMessageTime(msg.timestamp)}</span>
                    </div>
                  </div>
                </div>
              )}
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
      <div className="aura-chat-input-area" style={styles.inputArea}>
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
            if (inputText.trim()) e.currentTarget.style.backgroundColor = THEME.tealHover;
          }}
          onMouseLeave={(e) => {
            if (inputText.trim()) e.currentTarget.style.backgroundColor = THEME.teal;
          }}
        >
          <UiIcon name="send" size={19} strokeWidth={2} />
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
