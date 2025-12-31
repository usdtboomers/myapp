import React, { useState, useEffect } from "react";
import api from "api/axios";
import MessageModal from "./MessageModal";
import SuccessModal from "./SuccessModal";
import { useAuth } from "../../context/AuthContext";

const CreditToWalletModal = ({ userId, onClose, onSuccess }) => {
  // --- STATE ---
  const [credits, setCredits] = useState({ direct: "", level: "", spin: "", binary: "" });
  const [transactionPassword, setTransactionPassword] = useState("");
  const [available, setAvailable] = useState({
    directIncome: 0,
    levelIncome: 0,
    spinIncome: 0,
    binaryIncome: 0,
    walletBalance: 0,
  });
  const [loading, setLoading] = useState(false);

  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "", type: "info" });
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState({ userId: "", amount: 0 });
  
  const token = localStorage.getItem("token");

  const showMessage = (title, message, type = "info") =>
    setMessageModal({ open: true, title, message, type });

  // --- LOGIC: Fetch Data ---
  const fetchAvailable = async () => {
    try {
      const res = await api.get(`/wallet/withdrawable/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailable(res.data || {});
    } catch (err) {
      console.error("Failed to fetch available incomes", err);
    }
  };

  useEffect(() => {
    fetchAvailable();
  }, [userId]);

  // --- 🔥 UPDATED LOGIC: Handle Credit (Single Call) ---
  const handleCredit = async () => {
    // 1. Prepare Values
    const dDirect = parseFloat(credits.direct) || 0;
    const dLevel = parseFloat(credits.level) || 0;
    const dSpin = parseFloat(credits.spin) || 0;
    const dBinary = parseFloat(credits.binary) || 0;

    const totalAmount = dDirect + dLevel + dSpin + dBinary;

    // 2. Validate
    if (totalAmount < 10) {
      return showMessage("Warning", `⚠️ Minimum credit amount is $10. Total: $${totalAmount}`, "warning");
    }

    if (!transactionPassword.trim())
      return showMessage("Error", "⚠️ Please enter transaction password.", "error");

    setLoading(true);
    try {
      // 3. Single API Request (No Loop)
      const payload = {
        userId,
        transactionPassword,
        // Backend ke naye format ke hisaab se keys bhejo 👇
        deductDirect: dDirect,
        deductLevel: dLevel,
        deductSpin: dSpin,
        deductBinary: dBinary,
        amount: totalAmount // Optional, but good for cross-check
      };

      const res = await api.post(
        "/wallet/credit-to-wallet",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setSuccessData({ userId, amount: totalAmount });
        setSuccessModalOpen(true);
        setCredits({ direct: "", level: "", spin: "", binary: "" }); // Reset inputs
        setTransactionPassword("");
        await fetchAvailable(); // Refresh balances
        
        // Notify parent component
        if(onSuccess) onSuccess({ userId, walletBalance: (available.walletBalance || 0) + totalAmount });
      } else {
        showMessage("Error", res.data.message || "❌ Failed to credit.", "error");
      }

    } catch (err) {
      showMessage("Error", err.response?.data?.message || "❌ Error crediting income", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e, source) => {
    let value = e.target.value;
    // Prevent negative
    if (value < 0) value = 0;
    // Prevent exceeding balance
    if (parseFloat(value) > available[`${source}Income`]) {
      value = available[`${source}Income`];
    }
    setCredits({ ...credits, [source]: value });
  };

  const totalAvailable =
    (available.directIncome || 0) +
    (available.levelIncome || 0) +
    (available.spinIncome || 0) +
    (available.binaryIncome || 0);

  // --- STYLES (No Change) ---
  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.9)", 
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
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
      textAlign: "center",
      flexShrink: 0,
    },
    infoLabel: {
      fontSize: "12px",
      color: "#94a3b8",
      textTransform: "uppercase",
      fontWeight: "bold",
      marginBottom: "4px",
      display: "block",
    },
    infoValue: {
      fontSize: "18px",
      fontWeight: "bold",
      color: "#34d399", 
      fontFamily: "monospace",
    },
    tableContainer: {
        border: "1px solid #334155",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "#1e293b",
        flexShrink: 0,
    },
    tableRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid #334155",
    },
    sourceName: {
        color: "white",
        fontWeight: "500",
        fontSize: "14px",
    },
    sourceBal: {
        fontSize: "13px",
color: "#22c55e"
,        marginTop: "2px",
    },
    input: {
        backgroundColor: "#0f172a",
        border: "1px solid #475569",
        color: "white",
        padding: "8px",
        borderRadius: "8px",
        width: "100px",
        fontSize: "14px",
        textAlign: "right",
        outline: "none",
    },
    mainInput: {
        width: "100%",
        backgroundColor: "#1e293b",
        border: "1px solid #475569",
        color: "white",
        padding: "12px",
        borderRadius: "8px",
        fontSize: "14px",
        outline: "none",
        marginTop: "6px",
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
        borderRadius: "8px",
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
    cancelBtn: {
        backgroundColor: "#1e293b",
        color: "#cbd5e1",
        border: "1px solid #334155",
    }
  };

  return (
    <>
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
           <h2 style={styles.title}>Credit To Wallet</h2>
        </div>

        {/* Body */}
        <div className="custom-scroll" style={styles.body}>

           {/* Info Card */}
           <div style={styles.infoCard}>
              <div style={{marginBottom: '12px'}}>
                 <span style={styles.infoLabel}>Total Available</span>
                 <span style={styles.infoValue}>${totalAvailable.toFixed(2)}</span>
              </div>
              <div style={{borderTop: '1px solid #334155', paddingTop: '12px'}}>
                 <span style={styles.infoLabel}>Wallet Balance</span>
                 <span style={{...styles.infoValue, color: '#eab308'}}>${(available.walletBalance || 0).toFixed(2)}</span>
              </div>
           </div>

           {/* Input Table */}
           <div style={styles.tableContainer}>
              <div style={{padding: '10px 16px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155'}}>
                 <span style={{fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', textTransform:'uppercase'}}>Select Amount to Credit</span>
              </div>
              {["direct", "level", "spin", "binary"].map((src, index) => (
                <div key={src} style={{
                    ...styles.tableRow,
                    borderBottom: index === 3 ? 'none' : '1px solid #334155'
                }}>
                    <div>
                        <div style={styles.sourceName}>{src.charAt(0).toUpperCase() + src.slice(1)} Income</div>
                        <div style={styles.sourceBal}>Avl: ${(available[`${src}Income`] || 0).toFixed(2)}</div>
                    </div>
                    <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          style={styles.input}
                          value={credits[src]}
                          onChange={(e) => handleInputChange(e, src)}
                        />
                    </div>
                </div>
              ))}
           </div>

           {/* Transaction Password */}
           <div>
              <label style={{fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', marginLeft: '4px'}}>Transaction Password</label>
              <input
                type="password"
                value={transactionPassword}
                onChange={(e) => setTransactionPassword(e.target.value)}
                placeholder="Enter password"
                style={styles.mainInput}
              />
           </div>

        </div>

        {/* Footer */}
        <div style={styles.footer}>
           <button onClick={onClose} style={{...styles.btn, ...styles.cancelBtn}}>Cancel</button>
           <button 
             onClick={handleCredit} 
             disabled={loading}
             style={{...styles.btn, ...styles.confirmBtn, opacity: loading ? 0.7 : 1}}
           >
             {loading ? "Processing..." : "Credit Now"}
           </button>
        </div>

      </div>
    </div>

    {/* Success Modal */}
    <SuccessModal
      isOpen={successModalOpen}
      onClose={() => { setSuccessModalOpen(false); onClose(); }}
      type="credit"
      userId={successData.userId}
      amount={successData.amount}
      zIndex={10000}
    />

    {/* Message Modal */}
    <MessageModal
      isOpen={messageModal.open}
      onClose={() => setMessageModal({ ...messageModal, open: false })}
      title={messageModal.title}
      message={messageModal.message}
      type={messageModal.type}
      zIndex={11000}
    />
    </>
  );
};

export default CreditToWalletModal;