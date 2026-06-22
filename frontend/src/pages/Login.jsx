import React, { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { firebaseUser, loading } = useAuth();

  const [isSignup,   setIsSignup]   = useState(false);
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!loading && firebaseUser && !submitting) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isSignup) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
await updateProfile(cred.user, { displayName: name.trim() });
await cred.user.reload();  // ← wait for Firebase to update

console.log("displayName after reload:", cred.user.displayName); // ← should show "username" not the first name of the entered gmail.

const idToken = await cred.user.getIdToken(true);  // ← force fresh token
await fetch("http://localhost:8000/api/v1/users/register", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: name.trim() }),
});

const data = await res.json();
console.log("Backend register response:", data); // ← should show name: "sam"

// ← wait for AuthContext to re-fetch dbUser with correct name
await new Promise(resolve => setTimeout(resolve, 500));

navigate("/dashboard");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
      }
    } catch (err) {
      // Log the real error code so we can debug
      console.error("Firebase error code:", err.code);
      console.error("Firebase error message:", err.message);

      // All lowercase — Firebase always returns lowercase error codes
      const messages = {
        "auth/user-not-found":        "No account found with this email.",
        "auth/wrong-password":        "Incorrect password.",
        "auth/email-already-in-use":  "An account with this email already exists.",
        "auth/weak-password":         "Password must be at least 6 characters.",
        "auth/invalid-email":         "Please enter a valid email address.",
        "auth/too-many-requests":     "Too many attempts. Please try again later.",
        "auth/user-disabled":         "This account has been disabled.",
        "auth/invalid-credential":    "Incorrect email or password.",  // newer Firebase
        "auth/network-request-failed":"Network error. Check your connection.",
      };
      setError(messages[err.code] || `Error: ${err.code} — ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>📅</div>
          <h1 style={styles.title}>Interview Scheduler</h1>
          <p style={styles.subtitle}>
            {isSignup ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignup && (
            <div style={styles.field}>
              <label style={styles.label}>Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Neha"
                required
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="neha@example.com"
              required
              style={styles.input}
            />
          </div>

          <div style={{ position: "relative" }}>
            <label style={styles.label}>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? "At least 6 characters" : "••••••••"}
              required
              style={ {...styles.input, width:"100%", boxSizing:"border-box", paddingRight: "60px"}}
            />
             <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    style={{...styles.input,
      paddingLeft: "60px",
      position: "absolute",
      right: "10px",
      top: "calc(50% + 0.6rem)",
      transform: "translateY(-50%)",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontsize: "0.85rem",
      fontweight: 600,
      textAlign: "left"
    }}
  >
    {showPassword ? "Hide" : "Show"}
  </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ ...styles.button, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting
              ? (isSignup ? "Creating account…" : "Signing in…")
              : (isSignup ? "Create account" : "Sign in")}
          </button>
        </form>

        <p style={styles.toggle}>
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsSignup(!isSignup); setError(""); }}
            style={styles.toggleBtn}
          >
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f5",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.1)",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "400px",
  },
  header:   { textAlign: "center", marginBottom: "1.5rem" },
  logo:     { fontSize: "2.5rem", marginBottom: "0.5rem" },
  title:    { margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700 },
  subtitle: { margin: 0, color: "#666", fontSize: "0.95rem" },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
  form:  { display: "flex", flexDirection: "column", gap: "1rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label: { fontSize: "0.875rem", fontWeight: 500, color: "#374151" },
  input: {
    padding: "0.625rem 0.875rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.15s",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  toggle:    { textAlign: "center", marginTop: "1.25rem", color: "#666", fontSize: "0.9rem" },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    fontSize: "0.9rem",
  },
};