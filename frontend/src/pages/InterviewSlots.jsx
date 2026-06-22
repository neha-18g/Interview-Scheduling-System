import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import { useTTS } from "../hooks/useTTS";

// ── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({ slot, onClose, onSuccess }) {
  const [statement, setStatement] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const { speak, ttsLoading }     = useTTS();

  const [subSlots, setSubSlots]               = useState([]);
  const [subSlotsLoading, setSubSlotsLoading] = useState(true);
  const [selectedSubSlot, setSelectedSubSlot] = useState(null);

  // Fetch available sub-slots when modal opens
  useEffect(() => {
    client.get(`/api/v1/interview-slots/${slot.id}/sub-slots`)
      .then(res => setSubSlots(res.data))
      .catch(() => setError("Failed to load available times."))
      .finally(() => setSubSlotsLoading(false));
  }, [slot.id]);

  // Group sub-slots by day label
  const grouped = subSlots.reduce((acc, s) => {
    const day = s.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  const handleSubmit = async () => {
    if (!selectedSubSlot) {
      setError("Please select an interview time.");
      return;
    }
    if (statement.trim().length < 20) {
      setError("Please write at least 20 characters explaining why you want this role.");
      return;
    }
    if (statement.trim().length > 100) {
      setError("Candidate statement cannot exceed 100 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await client.post(`/api/v1/interview-slots/${slot.id}/book`, {
        candidate_statement: statement.trim(),
        sub_slot_id: selectedSubSlot.id,
      });

      const date = selectedSubSlot?.day;
      const time = selectedSubSlot?.time;

      const confirmationText =
        `Your interview slot has been booked successfully. ` +
        `Slot: ${slot.title}. ` +
        `Date: ${date}. ` +
        `Time: ${time}. ` +
        `Good luck!`;

      speak(confirmationText, "neha");
      onSuccess("✅ Slot booked successfully! Check your email.");
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(" "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Booking failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.box}>
        {/* Header */}
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Book This Slot</h2>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>

        {/* Slot details */}
        <div style={modalStyles.slotInfo}>
          <p style={modalStyles.slotTitle}>{slot.title}</p>
          {slot.description && (
            <p style={modalStyles.slotDesc}>{slot.description}</p>
          )}
          <div style={modalStyles.slotTimes}>
            <span>🗓 {new Date(slot.start_time).toLocaleString()}</span>
            <span>⏱ {new Date(slot.end_time).toLocaleString()}</span>
          </div>
        </div>

        {/* Sub-slot Picker */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={modalStyles.subSlotLabel}>
            Select Interview Time <span style={modalStyles.required}>*</span>
          </label>
          <p style={modalStyles.hint}>Choose a 30-minute slot that works for you (Mon–Fri only)</p>

          {subSlotsLoading ? (
            <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Loading available times...</p>
          ) : subSlots.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#dc2626" }}>No available slots. All times are booked.</p>
          ) : (
            Object.entries(grouped).map(([day, slots]) => (
              <div key={day} style={{ marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", margin: "0 0 0.4rem" }}>
                  {day}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {slots.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSubSlot(s); setError(""); }}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "6px",
                        border: selectedSubSlot?.id === s.id ? "2px solid #2563eb" : "1px solid #d1d5db",
                        background: selectedSubSlot?.id === s.id ? "#eff6ff" : "#fff",
                        color: selectedSubSlot?.id === s.id ? "#1d4ed8" : "#374151",
                        fontWeight: selectedSubSlot?.id === s.id ? 700 : 400,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}

          {selectedSubSlot && (
            <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", fontSize: "0.82rem", color: "#166534" }}>
              ✅ Selected: <strong>{selectedSubSlot.day}</strong> at <strong>{selectedSubSlot.time}</strong>
            </div>
          )}
        </div>

        {/* Statement field */}
        <div style={modalStyles.fieldGroup}>
          <label style={modalStyles.label}>
            Why are you a good fit for this role?
            <span style={modalStyles.required}> *</span>
          </label>
          <p style={modalStyles.hint}>
            Briefly describe your relevant experience, skills, or motivation. (min. 20 characters)
          </p>
          <textarea
            style={modalStyles.textarea}
            value={statement}
            onChange={e => setStatement(e.target.value)}
            placeholder="e.g. I have 2 years of experience in React and have built several production apps..."
            rows={5}
          />
          <p style={{ fontSize: "0.75rem", color: statement.length < 20 ? "#9CA3AF" : "#16a34a", margin: "0.25rem 0 0", textAlign: "right" }}>
            {statement.length} characters {statement.length < 20 ? `(${20 - statement.length} more needed)` : "✓"}
          </p>
        </div>

        {error && <div style={modalStyles.error}>{error}</div>}

        {ttsLoading && (
          <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.5rem", textAlign: "center" }}>
            🔊 Preparing audio confirmation...
          </div>
        )}

        {/* Actions */}
        <div style={modalStyles.actions}>
          <button onClick={onClose} style={modalStyles.cancelBtn} disabled={loading}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{ ...modalStyles.submitBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Booking…" : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InterviewSlots() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();
  const [slots, setSlots]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [bookingMsg, setBookingMsg] = useState("");

  const [editingId, setEditingId]     = useState(null);
  const [editForm, setEditForm]       = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    client.get("/api/v1/interview-slots")
      .then(res => setSlots(res.data))
      .catch(() => setError("Failed to load slots."))
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (msg) => {
    setBookingMsg(msg);
    setTimeout(() => setBookingMsg(""), 4000);
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;
    try {
      await client.delete(`/api/v1/interview-slots/${slotId}`);
      setSlots(prev => prev.filter(s => s.id !== slotId));
      showMsg("✅ Slot deleted successfully.");
    } catch (err) {
      showMsg("❌ " + (err.response?.data?.detail || "Deletion failed."));
    }
  };

  const handleEditOpen = (slot) => {
    setEditingId(slot.id);
    setEditForm({
      title:          slot.title       || "",
      description:    slot.description || "",
      start_time:     toLocalDatetimeInput(slot.start_time),
      end_time:       toLocalDatetimeInput(slot.end_time),
      max_candidates: slot.max_candidates ?? "",
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async (slotId) => {
    setEditLoading(true);
    try {
      const payload = {};
      if (editForm.title.trim())          payload.title          = editForm.title.trim();
      if (editForm.description.trim())    payload.description    = editForm.description.trim();
      if (editForm.start_time)            payload.start_time     = new Date(editForm.start_time).toISOString();
      if (editForm.end_time)              payload.end_time       = new Date(editForm.end_time).toISOString();
      if (editForm.max_candidates !== "") payload.max_candidates = Number(editForm.max_candidates);

      const res = await client.put(`/api/v1/interview-slots/${slotId}`, payload);
      setSlots(prev => prev.map(s => s.id === slotId ? res.data : s));
      setEditingId(null);
      showMsg("✅ Slot updated successfully.");
    } catch (err) {
      showMsg("❌ " + (err.response?.data?.detail || "Update failed."));
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Interview Slots</h1>
            <p style={styles.sub}>Available slots you can book</p>
          </div>
          <div style={styles.headerRight}>
            {dbUser?.role === "admin" && (
              <button onClick={() => navigate("/interview-slots/create")} style={styles.createBtn}>
                + Create Slot
              </button>
            )}
            <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
              ← Dashboard
            </button>
          </div>
        </div>

        {bookingMsg && <div style={styles.toast}>{bookingMsg}</div>}
        {error      && <div style={styles.error}>{error}</div>}

        {loading ? (
          <p style={styles.empty}>Loading slots...</p>
        ) : slots.length === 0 ? (
          <p style={styles.empty}>No slots available right now.</p>
        ) : (
          <div style={styles.grid}>
            {slots.map(slot => {
              // ── seatsLeft is derived per slot here, not at component level ──
              const seatsLeft = slot.max_candidates - (slot.active_booking_count ?? 0);

              return (
                <div key={slot.id} style={styles.card}>
                  {editingId === slot.id ? (
                    <div style={styles.editForm}>
                      <h3 style={styles.editTitle}>Edit Slot</h3>

                      <label style={styles.label}>Title</label>
                      <input
                        style={styles.input}
                        name="title"
                        value={editForm.title}
                        onChange={handleEditChange}
                        placeholder="Slot title"
                      />

                      <label style={styles.label}>Description</label>
                      <textarea
                        style={{ ...styles.input, minHeight: "70px", resize: "vertical" }}
                        name="description"
                        value={editForm.description}
                        onChange={handleEditChange}
                        placeholder="Optional description"
                      />

                      <div style={styles.row}>
                        <div style={{ flex: 1 }}>
                          <label style={styles.label}>Start Time</label>
                          <input
                            style={styles.input}
                            type="datetime-local"
                            name="start_time"
                            value={editForm.start_time}
                            onChange={handleEditChange}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={styles.label}>End Time</label>
                          <input
                            style={styles.input}
                            type="datetime-local"
                            name="end_time"
                            value={editForm.end_time}
                            onChange={handleEditChange}
                          />
                        </div>
                      </div>

                      <label style={styles.label}>Max Candidates</label>
                      <input
                        style={{ ...styles.input, maxWidth: "120px" }}
                        type="number"
                        min="1"
                        name="max_candidates"
                        value={editForm.max_candidates}
                        onChange={handleEditChange}
                        placeholder="e.g. 5"
                      />

                      <div style={styles.editActions}>
                        <button
                          onClick={() => handleEditSave(slot.id)}
                          style={styles.saveBtn}
                          disabled={editLoading}
                        >
                          {editLoading ? "Saving…" : "💾 Save Changes"}
                        </button>
                        <button onClick={handleEditCancel} style={styles.cancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </div>

                  ) : (
                    <>
                      <div style={styles.cardTop}>
                        <h3 style={styles.cardTitle}>{slot.title}</h3>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span style={styles.badge}>
                            {slot.max_candidates} seat{slot.max_candidates !== 1 ? "s" : ""}
                          </span>
                          {seatsLeft <= 0 ? (
                            <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 }}>
                              🔴 Fully Booked
                            </span>
                          ) : (
                            <span style={{ background: "#D1FAE5", color: "#065F46", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 }}>
                              🟢 {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left
                            </span>
                          )}
                        </div>
                      </div>

                      {slot.description && (
                        <p style={styles.cardDesc}>{slot.description}</p>
                      )}
                      <div style={styles.cardTime}>
                        <span>🗓 {new Date(slot.start_time).toLocaleString()}</span>
                        <span>⏱ {new Date(slot.end_time).toLocaleString()}</span>
                      </div>

                      {dbUser?.role === "candidate" && (
                        <button
                          onClick={() => { if (seatsLeft > 0) setSelectedSlot(slot); }}
                          style={{
                            ...styles.bookBtn,
                            background: seatsLeft <= 0 ? "#9CA3AF" : "#2563eb",
                            cursor:     seatsLeft <= 0 ? "not-allowed" : "pointer",
                          }}
                          disabled={seatsLeft <= 0}
                        >
                          {seatsLeft <= 0 ? "Fully Booked" : "Book this slot"}
                        </button>
                      )}

                      {dbUser?.role === "admin" && (
                        <div style={styles.adminActions}>
                          <button onClick={() => handleEditOpen(slot)} style={styles.editBtn}>
                            ✏️ Edit Slot
                          </button>
                          <button onClick={() => handleDelete(slot.id)} style={styles.deleteBtn}>
                            🗑 Delete Slot
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSuccess={showMsg}
        />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDatetimeInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, "0");
  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  );
}

const styles = {
  page:         { minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" },
  container:    { maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  headerRight:  { display: "flex", gap: "0.75rem", alignItems: "center" },
  title:        { margin: "0 0 0.25rem", fontSize: "1.6rem", fontWeight: 700 },
  sub:          { margin: 0, color: "#666", fontSize: "0.9rem" },
  createBtn:    { padding: "0.5rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  backBtn:      { padding: "0.5rem 1rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" },
  toast:        { padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", marginBottom: "1rem", color: "#166534" },
  error:        { padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1rem", color: "#dc2626" },
  empty:        { textAlign: "center", color: "#666", marginTop: "3rem" },
  grid:         { display: "flex", flexDirection: "column", gap: "1rem" },
  card:         { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem" },
  cardTop:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
  cardTitle:    { margin: 0, fontSize: "1.1rem", fontWeight: 700 },
  badge:        { background: "#dbeafe", color: "#1e40af", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 },
  cardDesc:     { color: "#555", fontSize: "0.9rem", margin: "0.5rem 0" },
  cardTime:     { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem", color: "#666", margin: "0.75rem 0" },
  bookBtn:      { width: "100%", padding: "0.65rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem" },
  adminActions: { display: "flex", gap: "0.75rem", marginTop: "0.5rem" },
  editBtn:      { flex: 1, padding: "0.65rem", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem" },
  deleteBtn:    { flex: 1, padding: "0.65rem", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem" },
  editForm:     { display: "flex", flexDirection: "column", gap: "0.6rem" },
  editTitle:    { margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "#1d4ed8" },
  label:        { fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.1rem" },
  input:        { width: "100%", padding: "0.5rem 0.65rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box", outline: "none" },
  row:          { display: "flex", gap: "0.75rem" },
  editActions:  { display: "flex", gap: "0.75rem", marginTop: "0.5rem" },
  saveBtn:      { flex: 1, padding: "0.65rem", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem" },
  cancelBtn:    { flex: 1, padding: "0.65rem", background: "transparent", color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem" },
};

const modalStyles = {
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  box:          { background: "#fff", borderRadius: "12px", padding: "1.5rem", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto", overflowX: "hidden" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  title:        { margin: 0, fontSize: "1.2rem", fontWeight: 700 },
  closeBtn:     { background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#6b7280" },
  slotInfo:     { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem" },
  slotTitle:    { margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem" },
  slotDesc:     { margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#555" },
  slotTimes:    { display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.82rem", color: "#666" },
  fieldGroup:   { display: "flex", flexDirection: "column", marginBottom: "1rem" },
  subSlotLabel: { fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" },
  label:        { fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" },
  required:     { color: "#dc2626" },
  hint:         { fontSize: "0.78rem", color: "#9ca3af", margin: "0 0 0.5rem" },
  textarea:     { width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  error:        { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.6rem 0.75rem", color: "#dc2626", fontSize: "0.85rem", marginBottom: "0.75rem" },
  actions:      { display: "flex", gap: "0.75rem", justifyContent: "flex-end" },
  cancelBtn:    { padding: "0.5rem 1rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  submitBtn:    { padding: "0.5rem 1.25rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
};