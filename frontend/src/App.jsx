import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import SplashScreen from "./pages/Splashscreen";
import Login          from "./pages/Login";
import Dashboard      from "./pages/Dashboard";
import InterviewSlots from "./pages/InterviewSlots";
import CreateSlot     from "./pages/CreateSlot";
import MyBookings     from "./pages/MyBookings";
import AdminBookings  from "./pages/AdminBookings";
import SlotDetail     from "./pages/SlotDetail";
import EmailLogs      from "./pages/EmailLogs";
import EmailLogDetail from "./pages/EmailLogDetail";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          }/>
          <Route path="/interview-slots" element={
            <ProtectedRoute><InterviewSlots /></ProtectedRoute>
          }/>

          {/* Candidate only */}
          <Route path="/my-bookings" element={
            <ProtectedRoute role="candidate"><MyBookings /></ProtectedRoute>
          }/>

          {/* Admin only */}
          <Route path="/interview-slots/create" element={
            <ProtectedRoute role="admin"><CreateSlot /></ProtectedRoute>
          }/>
          <Route path="/admin/bookings" element={
            <ProtectedRoute role="admin"><AdminBookings /></ProtectedRoute>
          }/>
          <Route path="/admin/slots/:slotId" element={
            <ProtectedRoute role="admin"><SlotDetail /></ProtectedRoute>
          }/>
          <Route path="/admin/email-logs" element={
            <ProtectedRoute role="admin"><EmailLogs /></ProtectedRoute>
          }/>
          <Route path="/admin/email-logs/:logId" element={
            <ProtectedRoute role="admin"><EmailLogDetail /></ProtectedRoute>
          }/>
          <Route path="/admin/email-logs/:logId/delete" element={
            <ProtectedRoute role="admin"><EmailLogs /></ProtectedRoute>
          }/>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}