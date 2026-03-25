import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { ref, set, onValue, remove } from "firebase/database";
import { db, rtdb } from "./firebase";

/**
 * Generate a deterministic chat ID from two user UIDs.
 * Sorts UIDs alphabetically and joins with "_".
 */
export function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

/**
 * Send a message in a chat.
 * Creates the chat document if it doesn't exist.
 */
export async function sendMessage(chatId, senderId, text) {
  if (!chatId || !senderId || !text.trim()) {
    throw new Error("Missing required fields for sendMessage");
  }

  try {
    const participants = chatId.split("_");
    const receiverId = participants.find((p) => p !== senderId) || participants[0];

    // Add message to subcollection
    const messagesRef = collection(db, "chats", chatId, "messages");
    await addDoc(messagesRef, {
      senderId,
      text: text.trim(),
      timestamp: serverTimestamp(),
      read: false,
    });

    // Update or create chat document
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
      const updateData = {
        lastMessage: {
          text: text.trim(),
          senderId,
          timestamp: serverTimestamp(),
        },
        [`unreadCount.${receiverId}`]: increment(1),
      };
      await updateDoc(chatRef, updateData);
    } else {
      const unreadCount = {};
      unreadCount[senderId] = 0;
      unreadCount[receiverId] = 1;

      await setDoc(chatRef, {
        participants,
        lastMessage: {
          text: text.trim(),
          senderId,
          timestamp: serverTimestamp(),
        },
        unreadCount,
        createdAt: serverTimestamp(),
      });
    }

    console.log("[Chat] Message sent in", chatId);
  } catch (error) {
    console.error("[Chat] sendMessage error:", error);
    throw error;
  }
}

/**
 * Listen to messages in a chat (realtime).
 * @param {string} chatId
 * @param {number} messageLimit — max messages to fetch
 * @param {Function} callback — receives array of messages
 * @returns {Function} unsubscribe
 */
export function getMessages(chatId, messageLimit = 50, callback) {
  if (!chatId) {
    callback([]);
    return () => {};
  }

  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "desc"), firestoreLimit(messageLimit));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          timestamp: d.data().timestamp?.toDate?.() || new Date(),
        }))
        .reverse(); // Reverse to show oldest first
      console.log("[Chat] Messages updated:", messages.length, "in", chatId);
      callback(messages);
    },
    (error) => {
      console.error("[Chat] getMessages error:", error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Mark all messages as read for a user in a chat.
 */
export async function markAsRead(chatId, uid) {
  if (!chatId || !uid) return;

  try {
    // Reset unread count
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${uid}`]: 0,
    });

    // Mark individual messages as read
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, where("read", "==", false), where("senderId", "!=", uid));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.forEach((msgDoc) => {
        batch.update(msgDoc.ref, { read: true });
      });
      await batch.commit();
      console.log("[Chat] Marked", snapshot.size, "messages as read in", chatId);
    }
  } catch (error) {
    console.error("[Chat] markAsRead error:", error);
  }
}

/**
 * Listen to all chats for a user (realtime).
 * @param {string} uid
 * @param {Function} callback — receives array of chat objects
 * @returns {Function} unsubscribe
 */
export function getChats(uid, callback) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participants", "array-contains", uid));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const chats = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          lastMessageTime: d.data().lastMessage?.timestamp?.toDate?.() || new Date(0),
        }))
        .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      console.log("[Chat] Chats updated:", chats.length, "for", uid);
      callback(chats);
    },
    (error) => {
      console.error("[Chat] getChats error:", error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Set typing indicator in Realtime DB.
 */
export function setTyping(chatId, uid, isTyping) {
  if (!chatId || !uid) return;
  const typingRef = ref(rtdb, `typing/${chatId}/${uid}`);
  if (isTyping) {
    set(typingRef, { isTyping: true, timestamp: Date.now() });
  } else {
    remove(typingRef);
  }
}

/**
 * Watch the other user's typing status in a chat.
 * @param {string} chatId
 * @param {string} otherUid — the other user's uid (NOT the current user)
 * @param {Function} callback — receives boolean
 * @returns {Function} unsubscribe
 */
export function watchTyping(chatId, otherUid, callback) {
  if (!chatId || !otherUid) {
    callback(false);
    return () => {};
  }

  const typingRef = ref(rtdb, `typing/${chatId}/${otherUid}`);
  const unsubscribe = onValue(
    typingRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data && data.isTyping) {
        // Auto-expire typing after 10 seconds
        const elapsed = Date.now() - (data.timestamp || 0);
        callback(elapsed < 10000);
      } else {
        callback(false);
      }
    },
    (error) => {
      console.error("[Chat] watchTyping error:", error);
      callback(false);
    }
  );

  return unsubscribe;
}
