import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Send a friend request from currentUser to targetUid.
 */
export async function sendFriendRequest(currentUser, targetUid) {
  if (!currentUser || !targetUid) throw new Error("Missing user data");
  if (currentUser.uid === targetUid) throw new Error("Cannot send request to yourself");

  try {
    // Check if already friends
    const alreadyFriends = await isFriend(currentUser.uid, targetUid);
    if (alreadyFriends) {
      throw new Error("Already friends with this user");
    }

    // Check for existing pending request in either direction
    const requestsRef = collection(db, "friendRequests");

    const outgoingQ = query(
      requestsRef,
      where("from", "==", currentUser.uid),
      where("to", "==", targetUid),
      where("status", "==", "pending")
    );
    const outgoingSnap = await getDocs(outgoingQ);
    if (!outgoingSnap.empty) {
      throw new Error("Friend request already sent");
    }

    const incomingQ = query(
      requestsRef,
      where("from", "==", targetUid),
      where("to", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const incomingSnap = await getDocs(incomingQ);
    if (!incomingSnap.empty) {
      throw new Error("This user already sent you a request — check your pending requests");
    }

    // Get target user info
    const targetDoc = await getDoc(doc(db, "users", targetUid));
    if (!targetDoc.exists()) throw new Error("Target user not found");
    const targetData = targetDoc.data();

    // Create the friend request
    const requestRef = doc(collection(db, "friendRequests"));
    await setDoc(requestRef, {
      from: currentUser.uid,
      to: targetUid,
      status: "pending",
      fromName: currentUser.displayName || "",
      fromPhoto: currentUser.photoURL || "",
      toName: targetData.displayName || "",
      toPhoto: targetData.photoURL || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("[Friends] Request sent from", currentUser.uid, "to", targetUid);
    return requestRef.id;
  } catch (error) {
    console.error("[Friends] Error sending request:", error);
    throw error;
  }
}

/**
 * Accept a friend request.
 * Adds both users to each other's friends subcollection.
 */
export async function acceptFriendRequest(requestId, currentUser, fromUser) {
  try {
    const requestRef = doc(db, "friendRequests", requestId);

    // Update request status
    await setDoc(requestRef, { status: "accepted", updatedAt: serverTimestamp() }, { merge: true });

    // Add to current user's friends
    await setDoc(doc(db, "users", currentUser.uid, "friends", fromUser.uid), {
      uid: fromUser.uid,
      displayName: fromUser.displayName || fromUser.fromName || "",
      photoURL: fromUser.photoURL || fromUser.fromPhoto || "",
      addedAt: serverTimestamp(),
    });

    // Add to sender's friends
    await setDoc(doc(db, "users", fromUser.uid, "friends", currentUser.uid), {
      uid: currentUser.uid,
      displayName: currentUser.displayName || "",
      photoURL: currentUser.photoURL || "",
      addedAt: serverTimestamp(),
    });

    console.log("[Friends] Request accepted:", requestId);
  } catch (error) {
    console.error("[Friends] Error accepting request:", error);
    throw error;
  }
}

/**
 * Reject a friend request.
 */
export async function rejectFriendRequest(requestId) {
  try {
    const requestRef = doc(db, "friendRequests", requestId);
    await setDoc(requestRef, { status: "rejected", updatedAt: serverTimestamp() }, { merge: true });
    console.log("[Friends] Request rejected:", requestId);
  } catch (error) {
    console.error("[Friends] Error rejecting request:", error);
    throw error;
  }
}

/**
 * Remove a friend from both users' subcollections.
 */
export async function removeFriend(currentUid, friendUid) {
  try {
    await deleteDoc(doc(db, "users", currentUid, "friends", friendUid));
    await deleteDoc(doc(db, "users", friendUid, "friends", currentUid));
    console.log("[Friends] Removed friendship:", currentUid, "<->", friendUid);
  } catch (error) {
    console.error("[Friends] Error removing friend:", error);
    throw error;
  }
}

/**
 * Listen to the friends list for a given uid (realtime).
 * @returns {Function} unsubscribe
 */
export function getFriends(uid, callback) {
  const friendsRef = collection(db, "users", uid, "friends");
  const q = query(friendsRef, orderBy("addedAt", "desc"));
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const friends = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      console.log("[Friends] Friends list updated:", friends.length, "friends");
      callback(friends);
    },
    (error) => {
      console.error("[Friends] Error listening to friends:", error);
      callback([]);
    }
  );
  return unsubscribe;
}

/**
 * Listen to incoming pending friend requests (realtime).
 * @returns {Function} unsubscribe
 */
export function getPendingRequests(uid, callback) {
  const requestsRef = collection(db, "friendRequests");
  const q = query(
    requestsRef,
    where("to", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      console.log("[Friends] Pending requests updated:", requests.length);
      callback(requests);
    },
    (error) => {
      console.error("[Friends] Error listening to pending requests:", error);
      callback([]);
    }
  );
  return unsubscribe;
}

/**
 * Listen to outgoing sent friend requests (realtime).
 * @returns {Function} unsubscribe
 */
export function getSentRequests(uid, callback) {
  const requestsRef = collection(db, "friendRequests");
  const q = query(
    requestsRef,
    where("from", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      console.log("[Friends] Sent requests updated:", requests.length);
      callback(requests);
    },
    (error) => {
      console.error("[Friends] Error listening to sent requests:", error);
      callback([]);
    }
  );
  return unsubscribe;
}

/**
 * Search users by displayName (prefix match).
 */
export async function searchUsers(queryStr) {
  if (!queryStr || queryStr.trim().length === 0) return [];
  try {
    const usersRef = collection(db, "users");
    const normalizedQuery = queryStr.charAt(0).toUpperCase() + queryStr.slice(1).toLowerCase();
    const q = query(
      usersRef,
      orderBy("displayName"),
      where("displayName", ">=", normalizedQuery),
      where("displayName", "<=", normalizedQuery + "\uf8ff"),
      firestoreLimit(20)
    );
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Also search lowercase version
    const lowerQ = query(
      usersRef,
      orderBy("displayName"),
      where("displayName", ">=", queryStr.toLowerCase()),
      where("displayName", "<=", queryStr.toLowerCase() + "\uf8ff"),
      firestoreLimit(20)
    );
    const lowerSnap = await getDocs(lowerQ);
    const lowerUsers = lowerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Merge results, remove duplicates
    const merged = new Map();
    [...users, ...lowerUsers].forEach((u) => merged.set(u.id, u));

    // Also search with original query as-is
    const rawQ = query(
      usersRef,
      orderBy("displayName"),
      where("displayName", ">=", queryStr),
      where("displayName", "<=", queryStr + "\uf8ff"),
      firestoreLimit(20)
    );
    const rawSnap = await getDocs(rawQ);
    rawSnap.docs.forEach((d) => merged.set(d.id, { id: d.id, ...d.data() }));

    const results = Array.from(merged.values());
    console.log("[Friends] Search results for '" + queryStr + "':", results.length);
    return results;
  } catch (error) {
    console.error("[Friends] Search error:", error);
    return [];
  }
}

/**
 * Check if two users are friends.
 */
export async function isFriend(uid1, uid2) {
  try {
    const friendDoc = await getDoc(doc(db, "users", uid1, "friends", uid2));
    return friendDoc.exists();
  } catch (error) {
    console.error("[Friends] Error checking friendship:", error);
    return false;
  }
}
