// src/api/users.js
// ─────────────────────────────────────────────────────────────────
// All API calls related to users.
// AuthContext calls getMyProfile() right after login.
// ─────────────────────────────────────────────────────────────────

import client from "./client";

/**
 * Fetches the logged-in user's profile from FastAPI.
 * Called once after Firebase login to get role + name from MySQL.
 *
 * @param {string} token - Firebase JWT (passed explicitly on first call
 *                         before the axios interceptor has the user set)
 * @returns {{ id, name, email, role, firebase_uid, created_at }}
 */
export async function getMyProfile(token) {
  const res = await client.get("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}