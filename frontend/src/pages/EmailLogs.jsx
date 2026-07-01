import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

const STATUS_STYLES = {
  queued: { background: "#fef9c3", color: "#854d0e" },
  sent:   { background: "#dcfce7", color: "#166534" },
  failed: { background: "#fee2e2", color: "#991b1b" },
};

export default function EmailLogs() {
  const navigate = useNavigate();
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    client.get("/api/v1/email-logs")
      .then(res => setLogs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load email logs."))
      .finally(() => setLoading(false));
  }, []);

  const viewDetails = (logId) => {
    navigate(`/admin/email-logs/${logId}`);
  } 

  const handleDelete = async (logId) =>{
    if (!window.confirm("Delete this log? This action cannot be undone.")) return;
    try {
      await client.delete(`/api/v1/email-logs/${logId}`);
      setLogs(prev => prev.filter(log => log.id !== logId));
    } catch {
      alert("Failed to delete log.");
    }
  }
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Email Logs</h1>
            <p style={styles.sub}>All emails sent by the system</p>
          </div>
          <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
            ← Dashboard
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <p style={styles.empty}>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p style={styles.empty}>No emails sent yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {["#", "Recipient", "Subject", "Status", "Error", "Sent At","Actions","Delete"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={styles.td}>{i+1}</td>
                  <td style={styles.td}>{log.recipient_email}</td>
                  <td style={styles.td}>{log.subject}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...STATUS_STYLES[log.status] }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: "#dc2626", fontSize: "0.8rem" }}>
                    {log.error_message || "—"}
                  </td>
                  <td style={styles.td}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={styles.td}>
                    <button onClick={() => viewDetails(log.id)} style={styles.viewBtn}>
                      View Details
                    </button>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleDelete(log.id)} style={styles.deleteBtn}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: "100vh", background: "#f4f6fb", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" },
  container: { maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem", flex: 1 },
  header:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  title:     { margin: "0 0 0.25rem", fontSize: "1.6rem", fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#121c2a" },
  sub:       { margin: 0, color: "#4b5563", fontSize: "0.9rem" },
  backBtn:   { padding: "0.5rem 1rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", color: "#4b5563" },
  error:     { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "8px", padding: "0.75rem", marginBottom: "1rem" },
  empty:     { textAlign: "center", color: "#4b5563", marginTop: "3rem" },
  table:     { width: "100%", borderCollapse: "collapse", background: "#f9f9ff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  th:        { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600, color: "#4b5563", background: "#e6eeff", borderBottom: "1px solid #d1d5db" },
  td:        { padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#121c2a", borderBottom: "1px solid #e5e7eb" },
  badge:     { padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 },
  viewBtn:   { padding: "0.4rem 0.85rem", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  deleteBtn: { padding: "0.4rem 0.85rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
};