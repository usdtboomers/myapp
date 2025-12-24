import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import SuccessModal from "./SuccessModal";
import MessageModal from "./MessageModal";

const WalletTransferModal = ({ onClose }) => {
  // --- STATE ---
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionPassword, setTransactionPassword] = useState("");
  const [senderBalance, setSenderBalance] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false); // Added loading state for button feedback

  const { user: loggedInUser, token } = useAuth();
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "", type: "info" });

  const showMessage = (title, message, type = "error") => 
    setMessageModal({ open: true, title, message, type });

  // --- LOGIC: Fetch Sender Balance ---
  useEffect(() => {
    if (!loggedInUser?.userId || !token) return;
    const fetchSenderBalance = async () => {
      try {
        const res = await axios.get(`http://143.198.205.94:5000/api/user/${loggedInUser.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSenderBalance(res.data.user.walletBalance || 0);
      } catch (err) { 
        setSenderBalance(0); 
        console.error(err); 
      }
    };
    fetchSenderBalance();
  }, [loggedInUser?.userId, token]);

  // --- LOGIC: Fetch Recipient Name ---
  const fetchUserName = async () => {
    const trimmedId = userId.trim();
    if (!trimmedId) return;
    try {
      const res = await axios.get(`http://143.198.205.94:5000/api/user/${trimmedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserName(res.data.user?.name || "User not found");
    } catch { 
      setUserName("User not found"); 
    }
  };

  // --- LOGIC: Handle Transfer ---
  const handleTransfer = async () => {
    const trimmedId = userId.trim();
    const amt = Number(amount);

    if (!trimmedId || amt <= 0 || !userName || userName === "User not found")
      return showMessage("Error", "❌ Provide a valid recipient and amount.", "error");
    if (!transactionPassword) return showMessage("Error", "❌ Enter transaction password.", "error");
    if (trimmedId === String(loggedInUser.userId))
      return showMessage("Error", "❌ You cannot transfer to yourself.", "error");
    if (amt > senderBalance) return showMessage("Error", `❌ Insufficient balance ($${senderBalance.toFixed(2)})`, "error");

    setLoading(true);
    try {
      await axios.post(
        "http://143.198.205.94:5000/api/wallet/transfer",
        { fromUserId: loggedInUser.userId, toUserId: trimmedId, amount: amt, transactionPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessOpen(true);
    } catch (error) {
      showMessage("Error", error.response?.data?.message || "❌ Transfer failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    setUserId("");
    setUserName("");
    setAmount("");
    setTransactionPassword("");
    onClose();
  };

  // --- PREMIUM DARK STYLES ---
  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      padding: "16px",
      backdropFilter: "blur(5px)",
    },
    modal: {
      backgroundColor: "#0f172a",
      width: "100%",
      maxWidth: "480px",
      borderRadius: "16px",
      border: "1px solid #334155",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      display: "flex",
      flexDirection: "column",
      maxHeight: "90vh",
      overflow: "hidden",
    },
    header: {
      padding: "20px",
      borderBottom: "1px solid #1e293b",
      textAlign: "center",
      backgroundColor: "#0f172a",
      flexShrink: 0,
    },
    title: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#ffffff",
      margin: 0,
    },
    subtitle: {
      fontSize: "12px",
      color: "#94a3b8",
      marginTop: "2px",
    },
    closeBtn: {
      position: "absolute",
      right: "16px",
      top: "16px",
      background: "transparent",
      border: "none",
      color: "#94a3b8",
      fontSize: "24px",
      cursor: "pointer",
    },
    body: {
      padding: "20px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      backgroundColor: "#0f172a",
      flex: 1,
      minHeight: 0, 
    },
    infoCard: {
      backgroundColor: "#1e293b",
      padding: "16px",
      borderRadius: "12px",
      border: "1px solid #334155",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexShrink: 0,
    },
    infoLabel: {
      fontSize: "11px",
      color: "#94a3b8",
      textTransform: "uppercase",
      fontWeight: "bold",
    },
    infoValue: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#34d399",
      fontFamily: "monospace",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "12px",
      color: "#94a3b8",
      fontWeight: "bold",
      marginLeft: "4px",
    },
    input: {
      width: "100%",
      backgroundColor: "#0f172a",
      border: "1px solid #475569",
      color: "white",
      padding: "12px 16px",
      borderRadius: "10px",
      fontSize: "14px",
      outline: "none",
    },
    readOnlyInput: {
      width: "100%",
      backgroundColor: "#1e293b", // Slightly different bg for readonly
      border: "1px solid #334155",
      color: "#cbd5e1",
      padding: "12px 16px",
      borderRadius: "10px",
      fontSize: "14px",
      outline: "none",
    },
    footer: {
      padding: "20px",
      borderTop: "1px solid #334155",
      display: "flex",
      gap: "12px",
      backgroundColor: "#0f172a",
      flexShrink: 0,
    },
    btn: {
      flex: 1,
      padding: "12px",
      borderRadius: "10px",
      fontWeight: "bold",
      fontSize: "14px",
      cursor: "pointer",
      border: "none",
    },
    confirmBtn: {
      background: "linear-gradient(90deg, #eab308 0%, #ca8a04 100%)",
      color: "black",
      boxShadow: "0 4px 6px -1px rgba(234, 179, 8, 0.2)",
    },
    disabledBtn: {
        backgroundColor: "#334155",
        color: "#64748b",
        cursor: "not-allowed",
    },
    cancelBtn: {
      backgroundColor: "#1e293b",
      color: "#cbd5e1",
      border: "1px solid #334155",
    }
  };

  return (
    <>
      {!successOpen && (
        <div style={styles.overlay}>
          {/* Scrollbar CSS */}
          <style>{`
            .custom-scroll::-webkit-scrollbar { width: 6px; }
            .custom-scroll::-webkit-scrollbar-track { background: #0f172a; }
            .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            .custom-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
          `}</style>

          <div style={styles.modal}>
            
            {/* Header */}
            <div style={styles.header}>
               <div>
                  <h2 style={styles.title}>Wallet Transfer</h2>
                  <p style={styles.subtitle}>Send funds securely to another user.</p>
               </div>
               <button onClick={onClose} style={styles.closeBtn}>&times;</button>
            </div>

            {/* Scrollable Body */}
            <div className="custom-scroll" style={styles.body}>

               {/* Balance Card */}
               <div style={styles.infoCard}>
                 <div>
                    <div style={styles.infoLabel}>Available Balance</div>
                    <div style={styles.infoValue}>
                      {senderBalance !== null ? `$${senderBalance.toFixed(2)}` : "Loading..."}
                    </div>
                 </div>
                 <div style={{fontSize: '24px'}}>💸</div>
               </div>

               {/* Inputs */}
               <div style={styles.inputGroup}>
                 <label style={styles.label}>Recipient User ID</label>
                 <input 
                   type="text" 
                   placeholder="Enter ID (e.g. 123)" 
                   value={userId} 
                   onChange={e => setUserId(e.target.value)} 
                   onBlur={fetchUserName}
                   style={styles.input} 
                 />
               </div>

               <div style={styles.inputGroup}>
                 <label style={styles.label}>Recipient Name</label>
                 <input 
                   type="text" 
                   placeholder="User Name" 
                   value={userName} 
                   readOnly
                   style={styles.readOnlyInput} 
                 />
               </div>

               <div style={styles.inputGroup}>
                 <label style={styles.label}>Amount ($)</label>
                 <input 
                   type="number" 
                   placeholder="0.00" 
                   value={amount} 
                   onChange={e => setAmount(e.target.value)}
                   style={styles.input} 
                 />
               </div>

               <div style={styles.inputGroup}>
                 <label style={styles.label}>Transaction Password</label>
                 <input 
                   type="password" 
                   placeholder="Enter password" 
                   value={transactionPassword} 
                   onChange={e => setTransactionPassword(e.target.value)}
                   style={styles.input} 
                 />
               </div>

            </div>

            {/* Footer */}
            <div style={styles.footer}>
               <button onClick={onClose} style={{...styles.btn, ...styles.cancelBtn}}>Cancel</button>
               <button 
                 onClick={handleTransfer} 
                 disabled={loading}
                 style={loading ? {...styles.btn, ...styles.disabledBtn} : {...styles.btn, ...styles.confirmBtn}}
               >
                 {loading ? "Processing..." : "Transfer Now"}
               </button>
            </div>

          </div>
        </div>
      )}

      <SuccessModal 
        isOpen={successOpen} 
        onClose={handleSuccessClose} 
        type="transfer" 
        userId={userId} 
        amount={amount} 
        zIndex={10000}
      />

      <MessageModal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ ...messageModal, open: false })}
        title={messageModal.title}
        message={messageModal.message}
        type={messageModal.type}
        style={{ zIndex: 11000 }}
      />
    </>
  );
};

export default WalletTransferModal;