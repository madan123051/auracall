import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Save a call record to a user's call history.
 * @param {string} uid — the user whose history to update
 * @param {Object} record — call record data
 */
export async function saveCallRecord(uid, record) {
  if (!uid || !record) throw new Error("Missing uid or record");

  try {
    const callHistoryRef = collection(db, "users", uid, "callHistory");
    const callDoc = doc(callHistoryRef);
    await setDoc(callDoc, {
      peerId: record.peerId || "",
      peerName: record.peerName || "Unknown",
      peerPhoto: record.peerPhoto || "",
      type: record.type || "video",
      direction: record.direction || "outgoing",
      status: record.status || "answered",
      duration: record.duration || 0,
      startedAt: record.startedAt || serverTimestamp(),
      endedAt: record.endedAt || serverTimestamp(),
    });
    console.log("[CallHistory] Saved record for", uid, "— peer:", record.peerName);
    return callDoc.id;
  } catch (error) {
    console.error("[CallHistory] saveCallRecord error:", error);
    throw error;
  }
}

/**
 * Listen to call history for a user (realtime).
 * @param {string} uid
 * @param {number} historyLimit
 * @param {Function} callback — receives array of call records
 * @returns {Function} unsubscribe
 */
export function getCallHistory(uid, historyLimit = 50, callback) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const callHistoryRef = collection(db, "users", uid, "callHistory");
  const q = query(callHistoryRef, orderBy("startedAt", "desc"), firestoreLimit(historyLimit));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        startedAt: d.data().startedAt?.toDate?.() || new Date(),
        endedAt: d.data().endedAt?.toDate?.() || new Date(),
      }));
      console.log("[CallHistory] History updated:", records.length, "records for", uid);
      callback(records);
    },
    (error) => {
      console.error("[CallHistory] getCallHistory error:", error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Delete a call record from a user's history.
 */
export async function deleteCallRecord(uid, callId) {
  if (!uid || !callId) throw new Error("Missing uid or callId");

  try {
    await deleteDoc(doc(db, "users", uid, "callHistory", callId));
    console.log("[CallHistory] Deleted record:", callId, "for", uid);
  } catch (error) {
    console.error("[CallHistory] deleteCallRecord error:", error);
    throw error;
  }
}

/**
 * Format call duration from seconds.
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format call time relative to now.
 */
export function formatCallTime(date) {
  if (!date) return "";
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}
