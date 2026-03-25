import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Sign in with Google popup.
 * On success, saves/updates user profile to Firestore.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("[Auth] Google sign-in success:", user.displayName);
    await saveUserProfile(user);
    return user;
  } catch (error) {
    console.error("[Auth] Google sign-in error:", error.code, error.message);
    throw error;
  }
}

/**
 * Sign out the current user.
 */
export async function signOutUser() {
  try {
    await firebaseSignOut(auth);
    console.log("[Auth] User signed out");
  } catch (error) {
    console.error("[Auth] Sign-out error:", error);
    throw error;
  }
}

/**
 * Listen for auth state changes.
 * @param {Function} callback — receives user or null
 * @returns {Function} unsubscribe
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, (user) => {
    console.log("[Auth] State changed:", user ? user.displayName : "signed out");
    callback(user);
  });
}

/**
 * Get the currently signed-in user (synchronous snapshot).
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Save / update user profile document in Firestore.
 */
export async function saveUserProfile(user) {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      await setDoc(
        userRef,
        {
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
          lastSeen: serverTimestamp(),
          isOnline: true,
        },
        { merge: true }
      );
      console.log("[Auth] Updated existing user profile:", user.uid);
    } else {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isOnline: true,
      });
      console.log("[Auth] Created new user profile:", user.uid);
    }
  } catch (error) {
    console.error("[Auth] Error saving user profile:", error);
    throw error;
  }
}
