import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp, get } from "firebase/database";
import { doc, updateDoc, serverTimestamp as firestoreServerTimestamp } from "firebase/firestore";
import { rtdb, db } from "./firebase";

/**
 * Setup presence tracking for a user.
 * Uses Firebase Realtime Database for low-latency presence detection.
 * Also syncs presence to Firestore user doc.
 *
 * @param {string} uid
 * @returns {Function} cleanup function
 */
export function setupPresence(uid) {
  if (!uid) {
    console.warn("[Presence] No uid provided");
    return () => {};
  }

  const userStatusRef = ref(rtdb, `status/${uid}`);
  const connectedRef = ref(rtdb, ".info/connected");

  const isOfflineData = {
    isOnline: false,
    lastSeen: rtdbServerTimestamp(),
  };

  const isOnlineData = {
    isOnline: true,
    lastSeen: rtdbServerTimestamp(),
  };

  const unsubscribe = onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) {
      console.log("[Presence] Not connected to RTDB");
      return;
    }

    console.log("[Presence] Connected — setting up presence for:", uid);

    // When disconnected, set status to offline
    onDisconnect(userStatusRef)
      .set(isOfflineData)
      .then(() => {
        // BUG FIX: Added error handling to set() call.
        // Without .catch(), if RTDB rules deny this write, it fails SILENTLY
        // and the user NEVER appears online to others.
        set(userStatusRef, isOnlineData)
          .then(() => {
            console.log("[Presence] ✅ Online status set for:", uid);
          })
          .catch((error) => {
            console.error("[Presence] ❌ Failed to set online status:", error.message);
            console.error("[Presence] Check Firebase RTDB rules allow write to /status/" + uid);
            console.error("[Presence] Run: firebase deploy --only database");
          });

        // Sync to Firestore
        syncPresenceToFirestore(uid, true);
      })
      .catch((error) => {
        console.error("[Presence] onDisconnect error:", error);
      });
  });

  // Also handle browser beforeunload
  const handleBeforeUnload = () => {
    set(userStatusRef, isOfflineData);
    syncPresenceToFirestore(uid, false);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  return () => {
    console.log("[Presence] Cleaning up presence for:", uid);
    unsubscribe();
    set(userStatusRef, isOfflineData);
    syncPresenceToFirestore(uid, false);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  };
}

/**
 * Sync presence data to the Firestore users document.
 */
async function syncPresenceToFirestore(uid, isOnline) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      isOnline: isOnline,
      lastSeen: firestoreServerTimestamp(),
    });
  } catch (error) {
    console.error("[Presence] Firestore sync error:", error);
  }
}

/**
 * Watch a single user's presence status (realtime).
 * @param {string} uid
 * @param {Function} callback — receives { isOnline, lastSeen }
 * @returns {Function} unsubscribe
 */
export function watchPresence(uid, callback) {
  if (!uid) {
    callback({ isOnline: false, lastSeen: null });
    return () => {};
  }

  const userStatusRef = ref(rtdb, `status/${uid}`);
  const unsubscribe = onValue(
    userStatusRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || null,
        });
      } else {
        callback({ isOnline: false, lastSeen: null });
      }
    },
    (error) => {
      console.error("[Presence] Watch error for", uid, ":", error);
      callback({ isOnline: false, lastSeen: null });
    }
  );
  return unsubscribe;
}

/**
 * Watch multiple users' presence statuses (realtime).
 * @param {string[]} uids
 * @param {Function} callback — receives Map<uid, { isOnline, lastSeen }>
 * @returns {Function} unsubscribe
 */
export function watchMultiplePresence(uids, callback) {
  if (!uids || uids.length === 0) {
    callback(new Map());
    return () => {};
  }

  const presenceMap = new Map();
  const unsubscribes = [];

  uids.forEach((uid) => {
    const unsub = watchPresence(uid, (status) => {
      presenceMap.set(uid, status);
      callback(new Map(presenceMap));
    });
    unsubscribes.push(unsub);
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

/**
 * Get the last seen timestamp for a user (one-time read).
 */
export async function getLastSeen(uid) {
  try {
    const userStatusRef = ref(rtdb, `status/${uid}`);
    const snapshot = await get(userStatusRef);
    const data = snapshot.val();
    return data ? data.lastSeen : null;
  } catch (error) {
    console.error("[Presence] getLastSeen error:", error);
    return null;
  }
}

/**
 * Format a lastSeen timestamp into a human-readable string.
 * @param {number|null} timestamp — Unix timestamp in ms
 * @returns {string}
 */
export function formatLastSeen(timestamp) {
  if (!timestamp) return "Offline";

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 0) return "Online";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 2) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 2) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  if (days < 2) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
