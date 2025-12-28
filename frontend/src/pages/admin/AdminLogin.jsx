import React, { useState } from "react";
import api from "api/axios";
import { useNavigate } from "react-router-dom";
import { FaUserShield, FaLock, FaSignInAlt } from "react-icons/fa"; // Icons import kiye

const AdminLogin = () => {
  const [formData, setFormData] = useState({ adminId: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.adminId.trim() || !formData.password.trim()) {
      setError("Admin ID and Password are required.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        "/admin/login",
        {
          adminId: formData.adminId.trim(),
          password: formData.password.trim(),
        }
      );

      const token = res.data.token;

      // Save token
      localStorage.setItem("adminToken", token);
      localStorage.setItem("loginTime", Date.now());

      // ✅ Redirect to /admin
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- PREMIUM DARK STYLES ---
  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#020617", // Very Dark Blue/Black
      padding: "16px",
    },
    card: {
      width: "100%",
      maxWidth: "420px",
      backgroundColor: "#0f172a", // Dark Slate
      borderRadius: "20px",
      padding: "40px 30px",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)", // Deep shadow
      border: "1px solid #1e293b",
      textAlign: "center",
    },
    logoIcon: {
      fontSize: "48px",
      color: "#eab308", // Gold Color
      marginBottom: "16px",
    },
    title: {
      fontSize: "26px",
      fontWeight: "800",
      color: "#ffffff",
      marginBottom: "8px",
      letterSpacing: "0.5px",
    },
    subtitle: {
      fontSize: "14px",
      color: "#94a3b8",
      marginBottom: "32px",
    },
    inputGroup: {
      marginBottom: "20px",
      textAlign: "left",
    },
    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: "600",
      color: "#cbd5e1",
      marginBottom: "8px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    inputWrapper: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    icon: {
      position: "absolute",
      left: "14px",
      color: "#64748b",
      fontSize: "16px",
      zIndex: 1,
    },
    input: {
      width: "100%",
      padding: "14px 14px 14px 45px", // Left padding for icon
      backgroundColor: "#1e293b", // Input bg
      border: "1px solid #334155",
      borderRadius: "10px",
      color: "#ffffff",
      fontSize: "15px",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    button: {
      width: "100%",
      padding: "14px",
      borderRadius: "10px",
      border: "none",
      background: "linear-gradient(90deg, #eab308 0%, #ca8a04 100%)", // Gold Gradient
      color: "#000", // Black text for contrast
      fontWeight: "bold",
      fontSize: "16px",
      cursor: "pointer",
      marginTop: "10px",
      boxShadow: "0 4px 6px -1px rgba(234, 179, 8, 0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "transform 0.1s",
    },
    errorBox: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      color: "#fca5a5",
      padding: "12px",
      borderRadius: "8px",
      fontSize: "14px",
      marginBottom: "20px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* Logo / Icon */}
        <div style={styles.logoIcon}>
          <FaUserShield />
        </div>
        
        <h2 style={styles.title}>Admin Portal</h2>
        <p style={styles.subtitle}>Secure Access Required</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* Admin ID Input (Hidden Mode) */}
          <div style={styles.inputGroup}>
            <label htmlFor="adminId" style={styles.label}>Admin ID</label>
            <div style={styles.inputWrapper}>
              <FaUserShield style={styles.icon} />
              <input
                id="adminId"
                type="password" // 🔥 CHANGED TO PASSWORD (HIDDEN)
                value={formData.adminId}
                onChange={handleChange}
                style={styles.input}
                placeholder="••••••" // Placeholder bhi hidden style me
                autoComplete="off"
                onFocus={(e) => e.target.style.borderColor = "#eab308"} // Focus effect
                onBlur={(e) => e.target.style.borderColor = "#334155"}
              />
            </div>
          </div>

          {/* Password Input (Hidden Mode) */}
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <FaLock style={styles.icon} />
              <input
                id="password"
                type="password" // 🔥 ALREADY PASSWORD
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
                placeholder="••••••••"
                autoComplete="off"
                onFocus={(e) => e.target.style.borderColor = "#eab308"}
                onBlur={(e) => e.target.style.borderColor = "#334155"}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Authenticating..." : (
                <>
                    Access Panel <FaSignInAlt />
                </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;