// src/api/client.js
// ─────────────────────────────────────────────────────────────────
// Central axios instance.
// Every API call in the app imports this — never raw fetch/axios.
//
// Why a central client?
//   - One place to set the base URL
//   - Request interceptor auto-attaches the Firebase token
//   - Response interceptor handles 401 globally (token expired)
// ─────────────────────────────────────────────────────────────────

import axios from "axios";
import { auth } from "../firebase";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ──────────────────────────────────────────
// Runs before every request.
// Gets a fresh token from Firebase (uses cache if still valid).
client.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try{
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn("Failed to get Firebase token:", err);
    }
  }
  return config;
});

// ── Response interceptor ─────────────────────────────────────────
// Runs after every response.
// If 401 → token expired mid-session → sign the user out.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await auth.signOut();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;