import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useTTS } from "../hooks/useTTS";

const STATUS_META = {
  pending:  { bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B", label: "Pending"  },
  approved: { bg: "#D1FAE5", color: "#065F46", dot: "#10B981", label: "Approved" },
  rejected: { bg: "#FEE2E2", color: "#991B1B", dot: "#EF4444", label: "Rejected" },
};

const normalize = (s) => String(s).split(".").pop().toLowerCase();

function StatusBadge({ status }) {
  const s = STATUS_META[normalize(status)] ?? { bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px",
      borderRadius: 999, fontSize: 12, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

// ── Candidate Detail Modal ──────────────────────────────────────────────────
function CandidateModal({ booking, onClose, onStatusUpdate }) {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState(null);
  const [aiError, setAiError]     = useState(null);
  const { speak, stop, ttsLoading } = useTTS();

  if (!booking) return null;

  const status = normalize(booking.status);

  const handleAction = async (newStatus) => {
    setLoading(true);
    setError("");
    try {
      const res = await client.put(`/api/v1/bookings/${booking.id}/status`, { status: newStatus });
      onStatusUpdate({ ...res.data, status: normalize(res.data.status) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAiReview = async () => {
    setAiLoading(true);
    setAiResult(null);
    setAiError(null);
    try {
      const res = await client.get(`/api/v1/admin/resume-review/${booking.id}`);
      setAiResult(res.data);
      onStatusUpdate({
        ...booking,
        id:         booking.id,
        ai_result:  res.data.ai_result,
        ai_reason:  res.data.ai_reason,
        ai_summary: res.data.ai_summary,
      });
    } catch (err) {
      setAiError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const getTtsText = () => {
    const result = aiResult?.ai_result ?? booking.ai_result;
    const reason = aiResult?.ai_reason ?? booking.ai_reason;
    const name   = booking.candidate_name ?? "This candidate";
    if (!result) return null;
    const summary = aiResult?.ai_summary ?? booking.ai_summary ?? "";
    const recLine = summary.split("\n").find(l => l.includes("Recommendation:")) ?? "";
    return `AI Review for ${name}. Result: ${result}. ${reason}. ${recLine}`.trim();
  };

  const ttsText = getTtsText();

  const handleListen = () => {
    if (ttsLoading) {
      stop();
    } else {
      speak(ttsText, "neha");
    }
  };

  const canApprove = status !== "approved";
  const canReject  = status !== "rejected";
  const showAiFeedback = aiResult?.status === "success" || aiResult?.status === "cached";

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)", zIndex: 50,
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff", borderRadius: 16, width: "min(520px, 92vw)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)", zIndex: 51, overflow: "hidden",
      }}>
        {/* Status accent bar */}
        <div style={{
          height: 5,
          background: status === "approved" ? "#10B981" : status === "rejected" ? "#EF4444" : "#F59E0B",
        }} />

        <div style={{ padding: "28px 32px", maxHeight: "85vh", overflowY: "auto" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Candidate Details</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9CA3AF" }}>Booking #{booking.id}</p>
            </div>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>

          {/* Candidate info */}
          <div style={styles.infoBox}>
            <div style={styles.avatar}>
              {(booking.candidate_name ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                {booking.candidate_name ?? `Candidate #${booking.candidate_user_id}`}
              </div>
              <div style={{ color: "#6B7280", fontSize: 13, marginTop: 2 }}>
                {booking.candidate_email ?? "—"}
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Candidate Statement */}
          {booking.candidate_statement && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={styles.sectionTitle}>Candidate Statement</h4>
              <div style={{
                background: "#f9fafb", border: "1px solid #e5e7eb",
                borderRadius: 8, padding: "12px 14px",
                fontSize: 13, color: "#374151", lineHeight: 1.6,
              }}>
                {booking.candidate_statement}
              </div>
            </div>
          )}

          {/* Resume */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={styles.sectionTitle}>Resume</h4>
            {booking.resume_path ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a
                  href={`http://localhost:8000/${booking.resume_path}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", background: "#eff6ff", color: "#2563eb",
                    borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: "1px solid #bfdbfe", cursor: "pointer", alignSelf: "flex-start",
                    textDecoration: "none",
                  }}
                >
                  📄 View Resume
                </a>

                <button
                  onClick={handleAiReview}
                  disabled={aiLoading}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px",
                    background: aiLoading ? "#e5e7eb" : "#f5f3ff",
                    color: aiLoading ? "#9ca3af" : "#7c3aed",
                    border: "1px solid #ddd6fe", borderRadius: 8,
                    fontSize: 13, fontWeight: 600,
                    cursor: aiLoading ? "not-allowed" : "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  {aiLoading ? "⏳ Reviewing…" : "🤖 AI Resume Review"}
                </button>

                {aiResult?.status === "scanned_pdf" && (
                  <div style={{
                    padding: "10px 14px", background: "#fff8e1",
                    border: "1px solid #f59e0b", borderRadius: 8,
                    fontSize: 13, color: "#92400e",
                  }}>
                    ⚠️ {aiResult.message}
                  </div>
                )}

                {showAiFeedback && (
                  <div style={{
                    padding: "14px 16px", background: "#f0fdf4",
                    border: "1px solid #86efac", borderRadius: 8,
                    fontSize: 13, color: "#14532d", whiteSpace: "pre-wrap", lineHeight: 1.7,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>
                        🤖 AI Feedback
                        {aiResult.status === "cached" && (
                          <span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280", marginLeft: 8 }}>
                            (previously saved)
                          </span>
                        )}
                      </span>
                      <button
                        onClick={handleListen}
                        title={ttsLoading ? "Stop" : "Listen to review"}
                        style={{
                          background: ttsLoading ? "#fef2f2" : "#f0fdf4",
                          border: `1px solid ${ttsLoading ? "#fecaca" : "#86efac"}`,
                          borderRadius: 6, padding: "4px 10px",
                          cursor: "pointer", fontSize: 13,
                          color: ttsLoading ? "#dc2626" : "#16a34a",
                          display: "inline-flex", alignItems: "center", gap: 4,
                        }}
                      >
                        {ttsLoading ? "⏹ Stop" : "🔊 Listen"}
                      </button>
                    </div>
                    {aiResult.feedback}
                  </div>
                )}

                {aiError && (
                  <div style={{
                    padding: "10px 14px", background: "#fef2f2",
                    border: "1px solid #fecaca", borderRadius: 8,
                    fontSize: 13, color: "#b91c1c",
                  }}>
                    ⚠️ {aiError}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
                No resume uploaded yet.
              </p>
            )}
          </div>

          {/* AI Pre-screening */}
          {booking.ai_result && !aiResult && (
            <div style={{
              background: booking.ai_result === "Potential Match" ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${booking.ai_result === "Potential Match" ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: 8, padding: "1rem", marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>🤖</span>
                  <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#6b7280" }}>AI PRE-SCREENING</span>
                </div>
                <button
                  onClick={handleListen}
                  title={ttsLoading ? "Stop" : "Listen to review"}
                  style={{
                    background: ttsLoading ? "#fef2f2" : "#f0fdf4",
                    border: `1px solid ${ttsLoading ? "#fecaca" : "#bbf7d0"}`,
                    borderRadius: 6, padding: "4px 10px",
                    cursor: "pointer", fontSize: 13,
                    color: ttsLoading ? "#dc2626" : "#16a34a",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  {ttsLoading ? "⏹ Stop" : "🔊 Listen"}
                </button>
              </div>
              <span style={{
                fontWeight: 700,
                color: booking.ai_result === "Potential Match" ? "#16a34a" : "#dc2626",
              }}>
                {booking.ai_result === "Potential Match" ? "✅ Potential Match" : "❌ Not a Match"}
              </span>
              <p style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.85rem", color: "#374151" }}>
                {booking.ai_reason}
              </p>
              {booking.ai_summary && (
                <>
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 600, fontSize: "0.8rem", color: "#6b7280" }}>
                    FULL FEEDBACK
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {booking.ai_summary}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Slot info */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={styles.sectionTitle}>Interview Slot</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Row label="Title" value={booking.slot_title ?? `Slot #${booking.slot_id}`} />
              <Row label="Date"  value={booking.slot_start_time ? fmtDate(booking.slot_start_time) : "—"} />
              <Row label="Time"  value={booking.slot_start_time && booking.slot_end_time
                ? `${fmtTime(booking.slot_start_time)} – ${fmtTime(booking.slot_end_time)}`
                : "—"} />
              {/* FIX: use booking.booked_at and booking.updated_at, not b.slot_start_time */}
              <Row label="Booked"  value={booking.booked_at  ? fmtDate(booking.booked_at)  : "—"} />
              <Row label="Updated" value={booking.updated_at ? fmtDate(booking.updated_at) : "—"} />
            </div>
          </div>

          {error && (
            <div style={{ background: "#FEF2F2", color: "#B91C1C", padding: "10px 14px",
              borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            {canApprove && (
              <button disabled={loading} onClick={() => handleAction("approved")}
                style={{ ...styles.btnAction, background: "#10B981", flex: 1 }}>
                {loading ? "…" : "✓ Approve"}
              </button>
            )}
            {canReject && (
              <button disabled={loading} onClick={() => handleAction("rejected")}
                style={{ ...styles.btnAction, background: "#EF4444", flex: 1 }}>
                {loading ? "…" : "✕ Reject"}
              </button>
            )}
            <button onClick={onClose} style={{ ...styles.btnAction,
              background: "transparent", color: "#6B7280", border: "1px solid #E5E7EB",
              flex: canApprove && canReject ? 0.5 : 1 }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ color: "#9CA3AF", fontSize: 13, minWidth: 64 }}>{label}</span>
      <span style={{ color: "#111827", fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("all");
  const [deleting, setDeleting] = useState(null);
  const navigate                = useNavigate();

  const load = () => {
    setLoading(true);
    client.get("/api/v1/bookings")
      .then(res => setBookings(res.data.map(b => ({ ...b, status: normalize(b.status) }))))
      .catch(() => setError("Failed to load bookings."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleStatusUpdate = (updated) => {
    setBookings(prev => prev.map(b => {
       if (b.id !== updated.id) return b;
    // Only update status fields, never overwrite ai fields from another session
    return {
      ...b,
      status:     updated.status,
      updated_at: updated.updated_at,
      // Only merge ai fields if they belong to this booking
      ai_result:  updated.ai_result  ?? b.ai_result,
      ai_reason:  updated.ai_reason  ?? b.ai_reason,
      ai_summary: updated.ai_summary ?? b.ai_summary,
    };
  }));
    setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm("Remove this candidate from the slot?")) return;
    setDeleting(bookingId);
    try {
      await client.delete(`/api/v1/bookings/${bookingId}`);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
    } catch (err) {
      alert(err.response?.data?.detail || "Deletion failed.");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
  const counts = {
    all:      bookings.length,
    pending:  bookings.filter(b => b.status === "pending").length,
    approved: bookings.filter(b => b.status === "approved").length,
    rejected: bookings.filter(b => b.status === "rejected").length,
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>All Bookings</h1>
            <p style={styles.sub}>Review and manage candidate interview bookings</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={load} style={styles.backBtn}>↺ Refresh</button>
            <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>← Dashboard</button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Filter tabs */}
        <div style={styles.tabs}>
          {["all", "pending", "approved", "rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...styles.tab, ...(filter === f ? styles.tabActive : {}) }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{
                ...styles.tabCount,
                background: filter === f ? "#2563eb" : "#e5e7eb",
                color:      filter === f ? "#fff"    : "#6b7280",
              }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <p style={styles.empty}>Loading bookings...</p>
        ) : filtered.length === 0 ? (
          <p style={styles.empty}>No {filter === "all" ? "" : filter} bookings found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filtered.map(b => (
              <div key={b.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827" }}>
                      {b.candidate_name ?? `User #${b.candidate_user_id}`}
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                      {b.candidate_email ?? "—"}
                    </div>
                  </div>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontWeight: 600 }}>{b.slot_title ?? `Slot #${b.slot_id}`}</div>
                    {b.slot_start_time && (
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {fmtDate(b.slot_start_time)} · {fmtTime(b.slot_start_time)} – {fmtTime(b.slot_end_time)}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <StatusBadge status={b.status} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setSelected(b)} style={styles.viewBtn}>View</button>
                    <button onClick={() => handleDelete(b.id)} disabled={deleting === b.id}
                      style={styles.delBtn}>
                      {deleting === b.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CandidateModal
        booking={selected}
        onClose={() => setSelected(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// MySQL TIMESTAMP returns IST values already on this machine.
// Never append "Z" or pass timeZone:"Asia/Kolkata" — both cause double-shift.

function fmtTime(isoStr) {
  if (!isoStr) return "—";
  // Normalise space separator (MySQL) or T separator (ISO)
  // FIX: handle both "2026-06-23T09:00:00" and "2026-06-23 09:00:00"
  const timePart = isoStr.replace("T", " ").split(" ")[1]; // "09:00:00"
  if (!timePart) return "—";
  const [hStr, mStr] = timePart.split(":");
  const h    = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${mStr} ${ampm}`;
}

function fmtDate(isoStr) {
  if (!isoStr) return "—";
  // Extract date part directly — no timezone conversion
  const datePart = isoStr.replace("T", " ").split(" ")[0]; // "2026-06-23"
  const [year, month, day] = datePart.split("-").map(Number);
  const d = new Date(year, month - 1, day); // local date, no UTC shift
  return d.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "short", year: "numeric",
  });
}

const styles = {
  page:         { minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" },
  container:    { maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  title:        { margin: "0 0 0.25rem", fontSize: "1.6rem", fontWeight: 700 },
  sub:          { margin: 0, color: "#666", fontSize: "0.9rem" },
  backBtn:      { padding: "0.5rem 1rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" },
  error:        { padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1rem", color: "#dc2626" },
  empty:        { textAlign: "center", color: "#666", marginTop: "3rem" },
  tabs:         { display: "flex", gap: 4, marginBottom: "1.25rem" },
  tab:          { background: "none", border: "none", padding: "8px 14px", cursor: "pointer", color: "#6b7280", fontWeight: 500, fontSize: 14, display: "flex", alignItems: "center", gap: 6, borderBottom: "2px solid transparent", marginBottom: -2 },
  tabActive:    { color: "#2563eb", borderBottomColor: "#2563eb" },
  tabCount:     { padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700 },
  card:         { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem" },
  cardTop:      { display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" },
  viewBtn:      { padding: "0.4rem 0.9rem", background: "#eff6ff", color: "#2563eb", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  delBtn:       { padding: "0.4rem 0.9rem", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  closeBtn:     { background: "#f3f4f6", border: "none", color: "#6b7280", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  infoBox:      { display: "flex", alignItems: "center", gap: 14, background: "#f9fafb", padding: "16px 18px", borderRadius: 10, margin: "20px 0 16px" },
  avatar:       { width: 44, height: 44, borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, flexShrink: 0 },
  sectionTitle: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#9CA3AF", margin: "0 0 10px" },
  btnAction:    { color: "#fff", border: "none", padding: "11px 0", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
};