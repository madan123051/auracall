/**
 * =============================================================================
 * AuraCall Presence System — Firestore Heartbeat
 * =============================================================================
 * Ported from Lumina's activityStatusService approach.
 * Uses Firestore instead of RTDB — no external server needed.
 *
 * How it works:
 * 1. Writes { isOnline: true, lastSeen: serverTimestamp() } every 60s
 * 2. On tab hide/close → marks offline
 * 3. Other users read presence via onSnapshot on the users/{uid} doc
 * 4. Stale detection: if lastSeen > 15 minutes ago, consider offline
 * =============================================================================
 */

import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// ── Constants ──
const HEARTBEAT_INTERVAL = 60000; // 1 minute
const STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes — if no heartbeat, user is offline (matches Lumina)

// ── Module state ──
let heartbeatInterval = null;
let trackedUserId = null;
let visibilityHandler = null;
let unloadHandler = null;

/**
 * Write presence data to Firestore users/{uid} doc (merge mode).
 * Uses setDoc with merge so it works even if the user doc doesn't exist yet.
 */
async function writePresence(uid, isOnline) {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        isOnline: isOnline,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    // Don't spam console — this can happen during page unload
    if (isOnline) {
      console.error("[Presence] Firestore write error:", error);
    }
  }
}

/**
 * Setup presence tracking for a user.
 * Call this once after login. Returns a cleanup function.
 *
 * @param {string} uid - Firebase Auth UID
 * @returns {Function} cleanup function to call on logout/unmount
 */
export function setupPresence(uid) {
  if (!uid) {
    console.warn("[Presence] No uid provided");
    return () => {};
  }

  // Prevent double tracking for same user
  if (trackedUserId === uid && heartbeatInterval) {
    return () => cleanupPresence(uid);
  }

  // Clean up previous tracking if switching users
  if (trackedUserId && trackedUserId !== uid) {
    cleanupPresence(trackedUserId);
  }

  trackedUserId = uid;

  // 1. Immediately mark online
  writePresence(uid, true);

  // 2. Heartbeat: re-write online status every 60s
  heartbeatInterval = setInterval(() => {
    if (trackedUserId === uid) {
      writePresence(uid, true);
    }
  }, HEARTBEAT_INTERVAL);

  // 3. Tab visibility change — go offline when hidden, online when visible
  visibilityHandler = () => {
    if (!trackedUserId) return;
    if (document.visibilityState === "hidden") {
      // Don't mark offline immediately — mobile visibility changes are frequent
      // (app switching, notifications, etc.) and cause false offline flickers.
      // Just pause heartbeat and let the stale threshold (15 min) handle it.
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    } else if (document.visibilityState === "visible") {
      // Tab is visible again — immediately send heartbeat and restart interval
      writePresence(trackedUserId, true);
      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(() => {
          if (trackedUserId) writePresence(trackedUserId, true);
        }, HEARTBEAT_INTERVAL);
      }
    }
  };

  // 4. Page unload — mark offline immediately
  unloadHandler = () => {
    if (trackedUserId) {
      // Use sendBeacon-style approach — setDoc may not complete during unload
      // but we try anyway. The stale detection handles the rest.
      writePresence(trackedUserId, false);
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", visibilityHandler);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", unloadHandler);
  }

  console.log("[Presence] Firestore heartbeat tracking started for:", uid);

  return () => cleanupPresence(uid);
}

/**
 * Internal cleanup function.
 */
function cleanupPresence(uid) {
  console.log("[Presence] Cleaning up for:", uid);

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  writePresence(uid, false);

  if (visibilityHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }

  if (unloadHandler && typeof window !== "undefined") {
    window.removeEventListener("beforeunload", unloadHandler);
    unloadHandler = null;
  }

  trackedUserId = null;
}

/**
 * Watch a single user's presence status in real-time.
 * Uses Firestore onSnapshot — instant updates when the user doc changes.
 *
 * Includes stale detection: if isOnline but lastSeen > 15 min ago → offline.
 *
 * @param {string} uid
 * @param {Function} callback - receives { isOnline: boolean, lastSeen: number|null }
 * @returns {Function} unsubscribe
 */
export function watchPresence(uid, callback) {
  if (!uid) {
    callback({ isOnline: false, lastSeen: null });
    return () => {};
  }

  const userRef = doc(db, "users", uid);
  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback({ isOnline: false, lastSeen: null });
        return;
      }

      const data = snapshot.data();
      let isOnline = data?.isOnline || false;
      const lastSeenRaw = data?.lastSeen;

      // Convert Firestore Timestamp to millis
      let lastSeen = null;
      if (lastSeenRaw) {
        lastSeen =
          typeof lastSeenRaw.toMillis === "function"
            ? lastSeenRaw.toMillis()
            : typeof lastSeenRaw === "number"
            ? lastSeenRaw
            : null;
      }

      // Stale detection: if marked online but no heartbeat for 15+ minutes → offline
      if (isOnline && lastSeen) {
        const age = Date.now() - lastSeen;
        if (age > STALE_THRESHOLD) {
          isOnline = false;
        }
      }

      callback({ isOnline, lastSeen });
    },
    (error) => {
      console.error("[Presence] Watch error for", uid, ":", error);
      callback({ isOnline: false, lastSeen: null });
    }
  );

  return unsubscribe;
}

/**
 * Watch multiple users' presence statuses in real-time.
 *
 * @param {string[]} uids
 * @param {Function} callback - receives Map<uid, { isOnline, lastSeen }>
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
      // Send a new Map copy so React detects the change
      callback(new Map(presenceMap));
    });
    unsubscribes.push(unsub);
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

/**
 * Get the last seen timestamp for a user (one-time read via snapshot).
 * For real-time updates, use watchPresence instead.
 */
export async function getLastSeen(uid) {
  return new Promise((resolve) => {
    const unsub = watchPresence(uid, (status) => {
      unsub();
      resolve(status.lastSeen);
    });
  });
}

/**
 * Format a lastSeen timestamp into a human-readable string.
 *
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
