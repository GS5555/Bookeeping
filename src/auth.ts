import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    User // Import User type for better typing
  } from "firebase/auth";
  import { doc, setDoc, getDoc } from "firebase/firestore";
  import { auth, db } from "./firebase"; // <<< IMPORTANT: Import auth and db from your firebase.ts file
  
  // --- Authentication Helper Functions ---
  
  // 1. Email and Password Sign-Up
  export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<User | null> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // After successful sign-up, create a user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        email: user.email,
        displayName: displayName,
        role: 'viewer', // Assign a default role
        createdAt: new Date(),
      });
  
      console.log("User signed up and profile created:", user);
      return user;
    } catch (error: any) {
      console.error("Error signing up:", error.message);
      throw error;
    }
  }
  
  // 2. Email and Password Sign-In
  export async function signInWithEmail(email: string, password: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User signed in:", user);
      return user;
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      throw error;
    }
  }
  
  // 3. User Sign-Out
  export async function userSignOut(): Promise<void> {
    try {
      await signOut(auth);
      console.log("User signed out successfully.");
    } catch (error: any) {
      console.error("Error signing out:", error.message);
      throw error;
    }
  }
  
  // 4. Google Sign-In
  export async function signInWithGoogle(): Promise<User | null> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
  
      // Check if user profile exists in Firestore, if not, create it
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'viewer', // Assign a default role
          createdAt: new Date(),
        });
        console.log("New Google user profile created in Firestore.");
      } else {
        console.log("Existing Google user signed in.");
      }
  
      console.log("User signed in with Google:", user);
      return user;
    } catch (error: any) {
      console.error("Error signing in with Google:", error.message);
      throw error;
    }
  }
  
  // 5. Auth State Listener Setup
  let unsubscribeFromAuth: () => void; // To store the unsubscribe function
  
  export function setupAuthListener(callback: (user: User | null, role: string | null) => void): void {
    // Clear any existing listener to prevent duplicates if called multiple times
    if (unsubscribeFromAuth) {
      unsubscribeFromAuth();
    }
  
    unsubscribeFromAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        console.log("Auth state changed: User is signed in:", user.uid);
        // Fetch user's role from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          callback(user, userData?.role || null); // Pass user and role
        } else {
          console.warn("User document not found for:", user.uid);
          callback(user, null); // User is signed in, but no profile in Firestore (should ideally not happen after signup)
        }
      } else {
        // User is signed out
        console.log("Auth state changed: User is signed out.");
        callback(null, null); // Pass null for user and role
      }
    });
  }
  
  // Function to clean up the listener when it's no longer needed (e.g., when your app unmounts)
  export function cleanUpAuthListener(): void {
    if (unsubscribeFromAuth) {
      unsubscribeFromAuth();
    }
  }