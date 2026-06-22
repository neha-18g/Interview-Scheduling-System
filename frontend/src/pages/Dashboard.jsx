// src/pages/Dashboard.jsx
// ─────────────────────────────────────────────────────────────────
// Landing page after login.
// Shows different cards for candidates vs admins based on role.
// ─────────────────────────────────────────────────────────────────
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { dbUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Cards shown to candidates
  const candidateCards = [
    { label: "View Interview Slots", desc: "Browse open slots and book your interview", path: "/interview-slots", emoji: "📋" },
    { label: "My Bookings",          desc: "Track status, statements & resumes",        path: "/my-bookings",     emoji: "🗓️" },
  ];

  // Cards shown to admins
  const adminCards = [
    { label: "Create Interview Slot", desc: "Add a new slot for candidates",      path: "/interview-slots/create", emoji: "➕" },
    { label: "All Interview Slots",   desc: "View, edit or remove existing slots", path: "/interview-slots",        emoji: "📋" },
    { label: "Manage Bookings",       desc: "Review applications & approvals",     path: "/admin/bookings",         emoji: "✅" },
    { label: "Email Logs",            desc: "Check sent and failed notifications", path: "/admin/email-logs",       emoji: "📧" },
  ];

  const cards = dbUser?.role === "admin" ? adminCards : candidateCards;
  const isAdmin = dbUser?.role === "admin";

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Dashboard</div>
            <h1 style={styles.title}>
              Welcome back, {dbUser?.name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <span style={{
              ...styles.badge,
              background: isAdmin ? "#EEF2FF" : "#EFF6FF",
              color:      isAdmin ? "#4338CA" : "#1D4ED8",
            }}>
              {dbUser?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={styles.logoutBtn}
            onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            Sign out
          </button>
        </div>

        {/* Cards */}
        <div style={styles.grid}>
          {cards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              style={styles.card}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(15, 23, 42, 0.08)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = "#DBEAFE";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#F1F5F9";
              }}
            >
              <div style={styles.cardIconWrap}>
                <span style={styles.cardEmoji}>{card.emoji}</span>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={styles.cardLabel}>{card.label}</div>
                <div style={styles.cardDesc}>{card.desc}</div>
              </div>
              <span style={styles.cardArrow}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: "100vh", background: "#F9FAFB", fontFamily: "system-ui, -apple-system, sans-serif" },
  container: { maxWidth: "720px", margin: "0 auto", padding: "48px 24px" },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "40px",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9CA3AF",
    marginBottom: "6px",
  },
  title: {
    margin: "0 0 12px",
    fontSize: "28px",
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.02em",
  },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  logoutBtn: {
    padding: "8px 16px",
    background: "transparent",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    color: "#374151",
    transition: "background 0.15s ease",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px",
    background: "#FFFFFF",
    border: "1px solid #F1F5F9",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
  },
  cardIconWrap: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    background: "#F8FAFC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardEmoji: { fontSize: "22px" },
  cardLabel: { fontWeight: 600, fontSize: "15px", color: "#111827", marginBottom: "2px" },
  cardDesc:  { fontSize: "13px", color: "#9CA3AF", lineHeight: 1.4 },
  cardArrow: { marginLeft: "auto", color: "#D1D5DB", fontSize: "16px", flexShrink: 0 },
};