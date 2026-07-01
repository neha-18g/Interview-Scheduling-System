import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

const STATUS_STYLES = {
  pending:  { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  approved: { bg: "#D1FAE5", color: "#065F46", label: "Approved" },
  rejected: { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
};

const normalize = (s) => String(s).split(".").pop().toLowerCase();

function StatusBadge({ status }) {
  const s = STATUS_STYLES[normalize(status)] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, letterSpacing: 0.4,
    }}>
      {s.label}
    </span>
  );
}

function ResumeModal({ booking, onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) { setError("Please select a file to upload."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("File is too large. Maximum size is 5MB."); return; }
    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await client.post(`/api/v1/bookings/${booking.id}/resume`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUpload(res.data);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to upload resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700 }}>
          Upload Resume
        </h3>
        <p style={{ margin: "0 0 1rem", color: "#666", fontSize: "0.85rem" }}>
          For: {booking.slot_title ?? `Slot #${booking.slot_id}`}
        </p>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", color: "#9CA3AF" }}>
          Please select a file to upload.
        </p>
        <input
          type="file"
          accept=".pdf"
          onChange={e => setFile(e.target.files[0])}
          style={{ marginBottom: "0.75rem", width: "100%" }}
        />
        {error && <div style={errorBox}>{error}</div>}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button onClick={handleUpload} style={styles.uploadBtn} disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resumeTarget, setResumeTarget] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/api/v1/my-bookings")
      .then(res => setBookings(res.data.map(b => ({ ...b, status: normalize(b.status) }))))
      .catch(() => setError("Failed to load bookings."))
      .finally(() => setLoading(false));
  }, []);

  const handleResumeUpload = (updated) => {
    setBookings(prev =>
      prev.map(b => b.id === updated.id ? { ...updated, status: normalize(updated.status) } : b)
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Bookings</h1>
            <p style={styles.sub}>Your interview slot reservations</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={() => navigate("/interview-slots")} style={styles.createBtn}>
              + Book a Slot
            </button>
            <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
              ← Dashboard
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <p style={styles.empty}>Loading your bookings...</p>
        ) : bookings.length === 0 ? (
          <div style={styles.emptyBox}>
            <div style={{ fontSize: 48 }}>📅</div>
            <p style={{ color: "#666", marginTop: 8 }}>No bookings yet.</p>
            <button onClick={() => navigate("/interview-slots")}
              style={{ ...styles.createBtn, marginTop: 16 }}>
              Browse Available Slots
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {bookings.map(b => (
              <div key={b.id} style={styles.card}>
                {/* Status color bar */}
                <div style={{
                  height: 4,
                  background: b.status === "approved" ? "#10B981"
                    : b.status === "rejected" ? "#EF4444" : "#F59E0B",
                }} />
                <div style={styles.cardBody}>
                  <div style={styles.cardRow}>
                    <h3 style={styles.cardTitle}>{b.slot_title ?? `Slot #${b.slot_id}`}</h3>
                    <StatusBadge status={b.status} />
                  </div>

                  <div style={styles.cardTime}>
                    <span>🗓 {b.slot_start_time ? fmtDate(b.slot_start_time) : "—"}</span>
                    <span>🕐 Interview Time: {b.slot_start_time && b.slot_end_time
                      ? `${fmtTime(b.slot_start_time)} – ${fmtTime(b.slot_end_time)}`
                      : "—"}
                    </span>

                    {b.slot_start_time && (
                      <div style={{
                        background: "#eff6ff", border: "1px solid #bfdbfe",
                        borderRadius: "8px", padding: "0.6rem 0.85rem",
                        margin: "0.5rem 0", fontSize: "0.85rem",
                        color: "#1d4ed8", fontWeight: 600,
                      }}>
                        📋 Your interview is scheduled for{" "}
                        {fmtDate(b.slot_start_time)} at{" "}
                        {fmtTime(b.slot_start_time)} – {fmtTime(b.slot_end_time)}
                      </div>
                    )}
                  </div>

                  {/* Statement of interest */}
                  {b.candidate_statement && (
                    <div style={styles.statementBox}>
                      <p style={styles.statementLabel}>Your Statement</p>
                      <p style={styles.statementText}>{b.candidate_statement}</p>
                    </div>
                  )}

                  {/* Resume row */}
                  <div style={styles.resumeBox}>
                    {b.resume_path ? (
                      <span style={styles.resumeAttached}>Resume attached</span>
                    ) : (
                      <span style={styles.resumeMissing}>No resume uploaded</span>
                    )}
                    <button onClick={() => setResumeTarget(b)} style={styles.resumeBtn}>
                      {b.resume_path ? "Replace Resume" : "Upload Resume"}
                    </button>
                    {b.resume_path && (
                      <a
                        href={`/${b.resume_path}`}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.viewResumeBtn}
                      >
                        View
                      </a>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={styles.cardFooter}>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                      Booked on {b.booked_at ? fmtDate(b.booked_at) : "—"}
                    </span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>Booking #{b.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume Upload Modal */}
      {resumeTarget && (
        <ResumeModal
          booking={resumeTarget}
          onClose={() => setResumeTarget(null)}
          onUpload={handleResumeUpload}
        />
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
// MySQL TIMESTAMP returns IST values already on this machine.
// Never append "Z" or pass timeZone:"Asia/Kolkata" — both cause a +5:30 double-shift.

function fmtTime(isoStr) {
  if (!isoStr) return "—";
  // Handle both "2026-06-23T09:00:00" and "2026-06-23 09:00:00" (MySQL space separator)
  const timePart = isoStr.replace("T", " ").split(" ")[1]; // "09:00:00"
  if (!timePart) return "—";
  const [hStr, mStr] = timePart.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${mStr} ${ampm}`;
}

function fmtDate(isoStr) {
  if (!isoStr) return "—";
  // Extract date part directly — no UTC conversion
  const datePart = isoStr.replace("T", " ").split(" ")[0]; // "2026-06-23"
  const [year, month, day] = datePart.split("-").map(Number);
  const d = new Date(year, month - 1, day); // local date, no UTC shift
  return d.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "short", year: "numeric",
  });
}

const styles = {
  page:           { minHeight: "100vh", background: "#f4f6fb", fontFamily: "'Inter', system-ui, sans-serif" },
  container:      { maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" },
  header:         { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  title:          { margin: "0 0 0.25rem", fontSize: "1.6rem", fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#121c2a" },
  sub:            { margin: 0, color: "#4b5563", fontSize: "0.9rem" },
  createBtn:      { padding: "0.5rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  backBtn:        { padding: "0.5rem 1rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", color: "#4b5563" },
  error:          { padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1rem", color: "#dc2626" },
  empty:          { textAlign: "center", color: "#4b5563", marginTop: "3rem" },
  emptyBox:       { textAlign: "center", padding: "60px 0", background: "#f9f9ff", borderRadius: 12, border: "1px solid #d1d5db" },
  grid:           { display: "flex", flexDirection: "column", gap: "1rem" },
  card:           { background: "#f9f9ff", border: "1px solid #d1d5db", borderRadius: "12px", overflow: "hidden" },
  cardBody:       { padding: "1.25rem" },
  cardRow:        { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: "0.5rem" },
  cardTitle:      { margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#121c2a" },
  cardTime:       { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem", color: "#4b5563", margin: "0.75rem 0" },
  cardFooter:     { display: "flex", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" },
  resumeBox:      { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0.75rem 0" },
  resumeAttached: { fontSize: "0.85rem", color: "#16a34a" },
  resumeMissing:  { fontSize: "0.85rem", color: "#9CA3AF" },
  resumeBtn:      { padding: "0.4rem 0.85rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" },
  statementBox:   { background: "#f4f6fb", border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.75rem", margin: "0.5rem 0" },
  statementLabel: { margin: "0 0 0.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" },
  statementText:  { margin: 0, fontSize: "0.9rem", color: "#121c2a" },
  uploadBtn:      { padding: "0.5rem 1.25rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  cancelBtn:      { padding: "0.5rem 1rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", color: "#4b5563" },
  viewResumeBtn:  { padding: "0.4rem 0.85rem", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", display: "inline-block" },
};

const overlay  = { position: "fixed", inset: 0, background: "rgba(18,28,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 };
const modal    = { background: "#f9f9ff", borderRadius: 12, padding: "1.5rem", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" };
const errorBox = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "0.5rem 0.75rem", color: "#dc2626", fontSize: "0.85rem" };