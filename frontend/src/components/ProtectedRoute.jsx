// src/components/ProtectedRoute.jsx
// ─────────────────────────────────────────────────────────────────
// Wraps any route that requires authentication (or a specific role).
//make sure that only authorized users can access
// Usage in App.jsx:
//   <ProtectedRoute>           ← any logged-in user
//     <Dashboard />
//   </ProtectedRoute>
//
//   <ProtectedRoute role="admin">    ← admin only
//     <AdminBookings />
//   </ProtectedRoute>
//
//   <ProtectedRoute role="candidate">  ← candidate only
//     <MyBookings />
//   </ProtectedRoute>
// ─────────────────────────────────────────────────────────────────

import { Navigate } from "react-router-dom";// navigate to multipe pages based on user role
import { useAuth } from "../context/AuthContext";//comes from the auth context to get the user info and loading state

export default function ProtectedRoute({ children, role }) {
  const { firebaseUser, dbUser, loading } = useAuth();

  // Still checking Firebase session — render nothing yet
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Not logged in at all → send to login
  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but MySQL profile not loaded yet
  if (!dbUser) {
    return <div style={{ textAlign: "center", marginTop: "4rem" }}>Loading profile...</div>;
  }

  // Role check — if a specific role is required, verify it
  if (role && dbUser.role !== role) {
    // Wrong role → redirect to their correct dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}