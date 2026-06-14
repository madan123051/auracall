import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

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
 * Sign in anonymously (Guest mode).
 * Creates a guest profile in Firestore.
 */
export async function signInAnonymouslyUser() {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    console.log("[Auth] Anonymous sign-in success:", user.uid);

    // Give the anonymous user a display name
    const guestName = `Guest_${user.uid.slice(0, 6)}`;
    await updateProfile(user, { displayName: guestName });

    await saveUserProfile({
      ...user,
      displayName: guestName,
    });
    return user;
  } catch (error) {
    console.error("[Auth] Anonymous sign-in error:", error.code, error.message);
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
    console.log("[Auth] State changed:", user ? (user.displayName || user.uid) : "signed out");
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
        bio: "Hey there! I am using AuraCall ✌️",
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

/**
 * Get user profile from Firestore (includes bio and other fields).
 */
export async function getUserProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("[Auth] Error getting user profile:", error);
    return null;
  }
}

/**
 * Update user display name in both Firebase Auth and Firestore.
 */
export async function updateUserDisplayName(user, newName) {
  if (!user || !newName?.trim()) throw new Error("Name cannot be empty");
  try {
    await updateProfile(user, { displayName: newName.trim() });
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { displayName: newName.trim(), updatedAt: serverTimestamp() }, { merge: true });
    console.log("[Auth] Display name updated to:", newName.trim());
  } catch (error) {
    console.error("[Auth] Error updating display name:", error);
    throw error;
  }
}

/**
 * Update user bio/about text in Firestore.
 */
export async function updateUserBio(uid, newBio) {
  if (!uid) throw new Error("Missing uid");
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { bio: newBio || "", updatedAt: serverTimestamp() }, { merge: true });
    console.log("[Auth] Bio updated");
  } catch (error) {
    console.error("[Auth] Error updating bio:", error);
    throw error;
  }
}

/**
 * Save user-level UI and translation preferences.
 */
export async function updateUserPreferences(uid, preferences) {
  if (!uid) throw new Error("Missing uid");
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      preferences: {
        language: preferences.language || "en",
        autoTranslate: preferences.autoTranslate !== false,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Upload profile photo to Firebase Storage and update user profile.
 */
export async function uploadProfilePhoto(user, file) {
  if (!user || !file) throw new Error("Missing data");
  try {
    const storageRef = ref(storage, `profilePhotos/${user.uid}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    await updateProfile(user, { photoURL: downloadURL });
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { photoURL: downloadURL, updatedAt: serverTimestamp() }, { merge: true });
    console.log("[Auth] Profile photo uploaded");
    return downloadURL;
  } catch (error) {
    console.error("[Auth] Error uploading profile photo:", error);
    throw error;
  }
}
