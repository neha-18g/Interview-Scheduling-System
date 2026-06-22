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

  // token — the Firebase JWT, refreshed automatically every hour by Firebase
  const [token, setToken] = useState(null);

  // loading — true until Firebase tells us whether a session exists
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged fires:
    //   1. Once immediately with the current session (or null)
    //   2. Again whenever the user logs in or out
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in — get a fresh JWT token
        // getIdToken(true) forces a refresh; getIdToken() uses cached if valid
        const idToken = await user.getIdToken(true);
        setToken(idToken);
        setFirebaseUser(user);

        // Fetch the user's role and name from your FastAPI backend
        // This also auto-creates the MySQL row on first login
        try {
          const profile = await getMyProfile(idToken);
          setDbUser(profile);
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } else {
        // User logged out — clear everything
        setFirebaseUser(null);
        setDbUser(null);
        setToken(null);
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
    <AuthContext.Provider value={{ firebaseUser, dbUser, token, loading, logout }}>
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