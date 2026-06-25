// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────────
// Provides global auth state to the entire app.
//
// What it does:
//   - Listens to Firebase onAuthStateChanged (fires on login/logout/refresh)
//   - Fetches the user's MySQL profile (name, role) from /api/v1/users/me
//   - Exposes { firebaseUser, dbUser, token, loading, logout } to any component
//
// Usage in any component:
//   const { dbUser, token, logout } = useAuth();
// ─────────────────────────────────────────────────────────────────


import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { getMyProfile } from "../api/users";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // firebaseUser — raw Firebase user object (uid, email, etc.)
  const [firebaseUser, setFirebaseUser] = useState(null);

  // dbUser — the row from your MySQL users table { id, name, email, role }
  const [dbUser, setDbUser] = useState(null);

  // loading — true until Firebase tells us whether a session exists
  const [loading, setLoading] = useState(true);

  const getToken = async () => {
    if(!firebaseUser) return null ;
    return await firebaseUser.getIdToken();
  }

  const refreshDbUser = async (user = firebaseUser) => {
    if (!user) return;
    try{
      const idToken = await user.getIdToken(true); //force fresh token 
      const profile = await getMyProfile(idToken);
      setDbUser(profile);
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  };

  useEffect(() => {
    // onAuthStateChanged fires:
    //   1. Once immediately with the current session (or null)
    //   2. Again whenever the user logs in or out
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);

        // Pass user directly — firebaseUser state is not updated yet at this point
        // React batches state updates so setFirebaseUser above hasn't settled
        await refreshDbUser(user);
      } else {
        // User logged out — clear everything
        setFirebaseUser(null);
        setDbUser(null);
      }
      setLoading(false);
    });

    // Cleanup listener when AuthProvider unmounts
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will fire automatically and clear state
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, dbUser, loading, logout, getToken, refreshDbUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — cleaner than importing useContext everywhere
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}