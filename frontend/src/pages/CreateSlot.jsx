import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

export default function CreateSlot() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", start_time: "", end_time: "", max_candidates: 1,
  });
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post("/api/v1/interview-slots", {
        ...form,
        max_candidates: parseInt(form.max_candidates),
        start_time: form.start_time ? form.start_time + ":00" : "",
        end_time: form.end_time ? form.end_time + ":00" : "",
      });
      navigate("/interview-slots");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create slot.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Create Interview Slot</h1>
          <button onClick={() => navigate("/interview-slots")} style={styles.backBtn}>
            ← Back
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Title</label>
            <input name="title" value={form.title} onChange={handleChange}
              placeholder="e.g. Frontend Developer Interview" required style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Optional details about the interview..." rows={3} style={styles.textarea} />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Start Time</label>
              <input name="start_time" type="datetime-local" value={form.start_time}
                onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>End Time</label>
              <input name="end_time" type="datetime-local" value={form.end_time}
                onChange={handleChange} required style={styles.input} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Max Candidates</label>
            <input name="max_candidates" type="number" min="1" value={form.max_candidates}
              onChange={handleChange} required style={styles.input} />
          </div>

          <button type="submit" disabled={submitting}
            style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Creating..." : "Create Slot"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" },
  card:      { background: "#fff", borderRadius: "12px", boxShadow: "0 2px 16px rgba(0,0,0,0.08)", padding: "2rem", width: "100%", maxWidth: "560px" },
  header:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title:     { margin: 0, fontSize: "1.4rem", fontWeight: 700 },
  backBtn:   { padding: "0.4rem 0.9rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" },
  error:     { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "8px", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" },
  form:      { display: "flex", flexDirection: "column", gap: "1rem" },
  field:     { display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 },
  row:       { display: "flex", gap: "1rem" },
  label:     { fontSize: "0.875rem", fontWeight: 500, color: "#374151" },
  input:     { padding: "0.6rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "1rem" },
  textarea:  { padding: "0.6rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "1rem", resize: "vertical" },
  submitBtn: { padding: "0.75rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: 600, cursor: "pointer" },
};