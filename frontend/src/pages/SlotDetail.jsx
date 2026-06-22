import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";

const STATUS_STYLES = {
  pending:  { background: "#fef9c3", color: "#854d0e" },
  approved: { background: "#dcfce7", color: "#166534" },
  rejected: { background: "#fee2e2", color: "#991b1b" },
};

export default function SlotDetail() {
  const { slotId } = useParams();
  const navigate   = useNavigate();

  const [slot,     setSlot]     = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [msg,      setMsg]      = useState("");

  useEffect(() => {
    Promise.all([
      client.get(`/api/v1/interview-slots/${slotId}`),
      client.get(`/api/v1/bookings`),
    ])
      .then(([slotRes, bookingsRes]) => {
        setSlot(slotRes.data);
        // Filter bookings that belong to this slot
        const slotBookings = bookingsRes.data.filter(
          b => b.slot_id === parseInt(slotId)
        );
        setBookings(slotBookings);
      })
      .catch(() => setError("Failed to load slot details."))
      .finally(() => setLoading(false));
  }, [slotId]);

  const updateStatus = async (bookingId, status) => {
    try {
      const res = await client.put(`/api/v1/bookings/${bookingId}/status`, { status });
      setBookings(prev => prev.map(b => b.id === bookingId ? res.data : b));
      setMsg(`✅ Booking ${status}.`);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.detail || "Update failed."));
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const removeCandidate = async (bookingId, candidateName) => {
    if (!window.confirm(`Remove ${candidateName} from this slot?`)) return;
    try {
      await client.delete(`/api/v1/bookings/${bookingId}`);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      setMsg(`✅ Candidate removed.`);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.detail || "Remove failed."));
      setTimeout(() => setMsg(""), 3000);
    }
  };

  if (loading) return <p style={{ padding: "2rem", fontFamily: "system-ui" }}>Loading...</p>;
  if (error)   return <p style={{ padding: "2rem", color: "#dc2626", fontFamily: "system-ui" }}>{error}</p>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => navigate("/admin/bookings")} style={styles.backBtn}>
            ← Back
          </button>
          <h1 style={styles.title}>{slot?.title}</h1>
        </div>

        {/* Slot info card */}
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Start time</span>
<span>{slot?.start_time
  ? new Date(slot.start_time.endsWith("Z") ? slot.start_time : slot.start_time + "Z")
      .toLocaleString("en-IN", { timeZone: "Asia/Kolkata",
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true })
  : "—"}
</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>End time</span>
<span>{slot?.end_time
  ? new Date(slot.end_time.endsWith("Z") ? slot.end_time : slot.end_time + "Z")
      .toLocaleString("en-IN", { timeZone: "Asia/Kolkata",
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true })
  : "—"}
</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Max candidates</span>
            <span>{slot?.max_candidates}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Booked</span>
            <span>{bookings.length} / {slot?.max_candidates}</span>
          </div>
          {slot?.description && (
            <div style={{ ...styles.infoRow, flexDirection: "column", gap: "0.25rem" }}>
              <span style={styles.infoLabel}>Description</span>
              <span style={{ color: "#555" }}>{slot.description}</span>
            </div>
          )}
        </div>
        
        {/* Toast message */}
        {msg && <div style={styles.toast}>{msg}</div>}

        {/* Candidates section */}
        <h2 style={styles.sectionTitle}>
          Candidates ({bookings.length})
        </h2>

        {bookings.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={{ fontSize: "2rem" }}>👥</p>
            <p>No candidates have booked this slot yet.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {bookings.map(b => (
              <div key={b.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <div style={styles.avatar}>
                    {(b.candidate?.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={styles.candidateName}>
                      {b.candidate?.name || `Candidate #${b.candidate_user_id}`}
                    </p>
                    <p style={styles.candidateEmail}>{b.candidate?.email}</p>
                    <p style={styles.bookedAt}>
                      Booked: {new Date(b.booked_at).toLocaleString()}
                    </p>
                            {b.candidate_statement && (
  <div style={{
    marginTop: 8, padding: "8px 10px",
    background: "#f9fafb", borderRadius: 6,
    border: "1px solid #e5e7eb", maxWidth: 360,
  }}>
    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700,
      color: "#9CA3AF", textTransform: "uppercase" }}>
      Statement
    </p>
    <p style={{ margin: 0, fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
      {b.candidate_statement}
    </p>
  </div>
)}
                  </div>
        </div>

                <div style={styles.cardRight}>
                  {/* Status badge */}
                  <span style={{ ...styles.badge, ...STATUS_STYLES[b.status] }}>
                    {b.status}
                  </span>
                 {b.resume_path ? (
  <a
      href={`http://localhost:8000/${b.resume_path}`}
      target="_blank"
      rel="noreferrer"

    style={{
      fontSize: 12, color: "#2563eb", fontWeight: 600,
      background: "#eff6ff", border: "1px solid #bfdbfe",
      borderRadius: 6, padding: "4px 10px", cursor: "pointer",
    }}
  >
     Resume
  </a>
) : (
  <span style={{ fontSize: 12, color: "#9CA3AF" }}>No resume</span>
)}

                  {/* Approve / Reject buttons (only for pending) */}
                  {b.status === "pending" && (
                    <div style={styles.actionBtns}>
                      <button
                        onClick={() => updateStatus(b.id, "approved")}
                        style={styles.approveBtn}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => updateStatus(b.id, "rejected")}
                        style={styles.rejectBtn}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {/* Remove candidate button (always visible to admin) */}
                  <button
                    onClick={() => removeCandidate(b.id, b.candidate?.name)}
                    style={styles.removeBtn}
                  >
                    🗑 Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page:          { minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" },
  container:     { maxWidth: "780px", margin: "0 auto", padding: "2rem 1rem" },
  header:        { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" },
  backBtn:       { padding: "0.4rem 0.9rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap" },
  title:         { margin: 0, fontSize: "1.5rem", fontWeight: 700 },
  infoCard:      { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" },
  infoRow:       { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#374151" },
  infoLabel:     { fontWeight: 600, color: "#6b7280" },
  toast:         { padding: "0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", marginBottom: "1rem", color: "#166534" },
  sectionTitle:  { fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#111827" },
  emptyBox:      { textAlign: "center", padding: "3rem", color: "#666" },
  list:          { display: "flex", flexDirection: "column", gap: "1rem" },
  card:          { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" },
  cardLeft:      { display: "flex", gap: "1rem", alignItems: "flex-start" },
  avatar:        { width: "40px", height: "40px", borderRadius: "50%", background: "#dbeafe", color: "#1e40af", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem", flexShrink: 0 },
  candidateName: { margin: "0 0 0.2rem", fontWeight: 600, fontSize: "0.95rem" },
  candidateEmail:{ margin: "0 0 0.2rem", fontSize: "0.85rem", color: "#6b7280" },
  bookedAt:      { margin: 0, fontSize: "0.8rem", color: "#9ca3af" },
  cardRight:     { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 },
  badge:         { padding: "0.2rem 0.75rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, textTransform: "capitalize" },
  actionBtns:    { display: "flex", gap: "0.5rem" },
  approveBtn:    { padding: "0.4rem 0.75rem", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  rejectBtn:     { padding: "0.4rem 0.75rem", background: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  removeBtn:     { padding: "0.4rem 0.75rem", background: "transparent", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
};