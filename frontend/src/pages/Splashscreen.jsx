import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3050);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",        // stack children vertically
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "90px",
          height: "90px",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "24px",         // removed "margin: 0 auto 24px" (auto handles centering via parent now)
          fontSize: "2rem",
          fontWeight: "bold",
        }}
      >
        ISS
      </div>

      <h1
        style={{
          fontSize: "3.5rem",
          fontWeight: "800",
          marginBottom: "12px",
          letterSpacing: "1px",
          textAlign: "center",          //  center text on smaller screens
        }}
      >
        Interview Scheduling System
      </h1>

      <p
        style={{
          fontSize: "1.1rem",
          opacity: 0.85,
          marginBottom: "40px",
          textAlign: "center",          //  center text on smaller screens
        }}
      >
        Streamlining interview scheduling and management
      </p>

      <div
        style={{
          width: "220px",
          height: "4px",
          background: "rgba(255,255,255,0.2)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "60%",
            height: "100%",
            background: "#ffffff",
            animation: "loading 2s infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes loading {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}