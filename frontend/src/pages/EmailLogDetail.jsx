import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client";

export default function EmailLogDetail() {
  const { logId }             = useParams();   // ← gets ID from URL
  const navigate              = useNavigate();
  const [log,     setLog]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    client.get(`/api/v1/email-logs/${logId}`)
      .then(res => setLog(res.data))
      .catch(() => setError("Failed to load log details."))
      .finally(() => setLoading(false));
  }, [logId]);

  if (loading) return <p style={styles.center}>Loading...</p>;
  if (error)   return <p style={styles.error}>{error}</p>;
  if (!log)    return <p style={styles.center}>Log not found.</p>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Email Log #{log.id}</h1>
          <button onClick={() => navigate("/admin/email-logs")} style={styles.backBtn}>
            ← Back to Logs
          </button>
        </div>

        {/* Detail Card */}
        <div style={styles.card}>

          <div style={styles.row}>
            <span style={styles.label}>Recipient</span>
            <span style={styles.value}>{log.recipient_email}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Subject</span>
            <span style={styles.value}>{log.subject}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Status</span>
            <span style={{
              ...styles.badge,
              ...(log.status === "sent"
                ? { background: "#dcfce7", color: "#166534" }
                : log.status === "failed"
                ? { background: "#fee2e2", color: "#991b1b" }
                : { background: "#fef9c3", color: "#854d0e" })
            }}>
              {log.status}
            </span>
          </div>
<div style={styles.row}>
  <span style={styles.label}>Sent At</span>
  <span style={styles.value}>
    {log.sent_at
      ? new Date(log.sent_at.endsWith("Z") ? log.sent_at : log.sent_at + "Z")
          .toLocaleString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
            hour12: true, timeZone: "Asia/Kolkata",
          })
      : "—"}
    </span>
</div>

          {log.error_message && (
            <div style={styles.row}>
              <span style={styles.label}>Error</span>
              <span style={{ ...styles.value, color: "#dc2626" }}>
                {log.error_message}
              </span>
            </div>
          )}

        </div>

        {/* Delete Button */}
        <button
onClick={async () => {
  if (!window.confirm("Delete this log?")) return;
  try {
    await client.delete(`/api/v1/email-logs/${logId}`);
    navigate("/admin/email-logs");
  } catch (err) {
    alert(err.response?.data?.detail || "Failed to delete log.");
  }
}}
          style={styles.deleteBtn}
        >
          🗑 Delete This Log
        </button>

      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" },
  container: { maxWidth: "600px", margin: "0 auto", padding: "2rem 1rem" },
  header:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title:     { margin: 0, fontSize: "1.5rem", fontWeight: 700 },
  backBtn:   { padding: "0.5rem 1rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" },
  card:      { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" },
  row:       { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid #f3f4f6" },
  label:     { fontWeight: 600, color: "#6b7280", fontSize: "0.9rem" },
  value:     { color: "#111827", fontSize: "0.9rem" },
  badge:     { padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 },
  deleteBtn: { width: "100%", padding: "0.75rem", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  center:    { textAlign: "center", marginTop: "3rem", color: "#666" },
  error:     { textAlign: "center", marginTop: "3rem", color: "#dc2626" },
};