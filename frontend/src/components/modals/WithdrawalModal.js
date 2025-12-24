import React, { useState, useEffect } from "react";
import axios from "axios";
import SuccessModal from "./SuccessModal";
import MessageModal from "./MessageModal";
import { useAuth } from "../../context/AuthContext";

const WithdrawalModal = ({ userId, onClose }) => {
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState({ walletBalance: 0, planIncomes: {} });
  const [withdrawals, setWithdrawals] = useState({});
  const [transactionPassword, setTransactionPassword] = useState("");
  const [walletAddress, setwalletAddress] = useState("");
  const [isAddressMissing, setIsAddressMissing] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({ userId: "", amount: 0 });
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "", type: "info" });

  const { user: loggedInUser } = useAuth();
  const isPromoUser = loggedInUser?.role === "promo";

  // Use token from localStorage
  const authToken = localStorage.getItem("token"); 

  const showMessage = (title, message, type = "error") =>
    setMessageModal({ open: true, title, message, type });

  // --- CONFIG ---
  const planToPackageAmount = {
    plan1: 10,
    plan2: 25,
    plan3: 50,
    plan4: 100,
    plan5: 200,
    plan6: 500,
    plan7: 1000,
  };

  const planNames = {
    plan1: "Bronze",
    plan2: "Silver",
    plan3: "Gold",
    plan4: "Platinum",
    plan5: "Diamond",
    plan6: "Elite",
    plan7: "Infinity",
  };

  // --- LOGIC: Fetch Data ---
  const fetchData = async () => {
    try {
      // 🔹 Withdrawable balances
      const res = await axios.get(`http://178.128.20.53:5000/api/wallet/withdrawable/${userId}`);
      if (res.data) {
        setBalances({
          walletBalance: res.data.walletBalance || 0,
          planIncomes: res.data.planIncomes || {}
        });

        const initialWithdrawals = {};
        Object.keys(res.data.planIncomes || {}).forEach(plan => {
          initialWithdrawals[plan] = "";
        });
        setWithdrawals(initialWithdrawals);
      }

      // 🔹 User profile for USDT address
      const profileRes = await axios.get(`http://178.128.20.53:5000/api/user/${userId}`);
      const userData = profileRes.data?.user || {};
      const finalAddress = (userData.walletAddress || "").trim();
      
      setwalletAddress(finalAddress);
      setIsAddressMissing(!finalAddress);

    } catch (err) {
      console.error(err);
      showMessage("Error", "Failed to fetch balances.", "error");
    }
  };

  useEffect(() => { fetchData(); }, [userId]);

  const handleInputChange = (e, plan) => {
    const value = e.target.value;
    // Allow numbers and decimals
    if (/^\d*\.?\d{0,2}$/.test(value)) {
       setWithdrawals({ ...withdrawals, [plan]: value });
    }
  };

  // --- LOGIC: Handle Withdraw ---
  const handleWithdraw = async () => {
    try {
      const entries = Object.entries(withdrawals).filter(
        ([_, amt]) => amt && Number(amt) > 0
      );

      if (!entries.length)
        return showMessage("Warning", "Enter amount to withdraw.", "warning");

      // 🔹 Transaction password check
      if (!transactionPassword.trim()) {
        return showMessage("Warning", "Enter transaction password.", "warning");
      }

      if (!isPromoUser && (!walletAddress || walletAddress.length < 10))
        return showMessage("Error", "Invalid USDT address.", "error");

      // 🔹 Validate withdrawals
      let walletBalanceLeft = balances.walletBalance;

      for (const [plan, amountStr] of entries) {
        const amount = parseFloat(amountStr);
        const available = balances.planIncomes[plan] || 0;

        // 🔓 Skip plan balance check for PROMO user
        if (!isPromoUser && amount > available)
          return showMessage("Error", `Insufficient balance in ${plan}`, "error");

        const walletNeeded = parseFloat((amount * 0.5).toFixed(2));
        if (!isPromoUser) {
          if (walletBalanceLeft < walletNeeded)
            return showMessage(
              "Error",
              `Wallet must cover 50% ($${walletNeeded}) for ${plan}`,
              "error"
            );

          walletBalanceLeft -= walletNeeded;
        }
      }

      // 🔹 Process withdrawals
      setLoading(true);
      let totalWithdraw = 0;

      for (const [plan, amountStr] of entries) {
        const amount = parseFloat(amountStr);

        await axios.post(
          "http://178.128.20.53:5000/api/wallet/withdraw",
          {
            userId,
            amount,
            source: plan,
            transactionPassword
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );

        totalWithdraw += amount;
      }

      setSuccessData({ userId, amount: totalWithdraw });
      setSuccessOpen(true);

      // Reset
      setWithdrawals({});
      await fetchData();

    } catch (err) {
      console.error(err);
      showMessage(
        "Error",
        err.response?.data?.message || "Withdrawal failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- INLINE STYLES (PREMIUM DARK THEME - Solid Colors) ---
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.9)", // Solid dark overlay
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      backdropFilter: "blur(5px)",
    },
    modal: {
      backgroundColor: "#0f172a", // Solid Dark Slate Blue
      width: "100%",
      maxWidth: "550px",
      borderRadius: "16px",
      border: "1px solid #334155",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      display: "flex",
      flexDirection: "column",
      maxHeight: "90vh",
      position: "relative",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #1e293b",
      backgroundColor: "#0f172a",
      borderTopLeftRadius: "16px",
      borderTopRightRadius: "16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexShrink: 0,
    },
    title: {
      fontSize: "20px",
      fontWeight: "700",
      color: "#ffffff",
      margin: 0,
    },
    subtitle: {
      fontSize: "12px",
      color: "#94a3b8",
      marginTop: "2px",
      margin: 0,
    },
    closeBtn: {
      background: "transparent",
      border: "none",
      color: "#94a3b8",
      fontSize: "28px",
      cursor: "pointer",
      lineHeight: 1,
      padding: "0 8px",
    },
    body: {
      padding: "24px",
      overflowY: "auto",
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      backgroundColor: "#0f172a",
    },
    balanceCard: {
      backgroundColor: "#1e293b", // Solid lighter slate
      padding: "16px",
      borderRadius: "12px",
      border: "1px solid #334155",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    labelSmall: {
      fontSize: "11px",
      color: "#94a3b8",
      textTransform: "uppercase",
      fontWeight: "bold",
      letterSpacing: "0.5px",
    },
    balanceValue: {
      fontSize: "22px",
      fontWeight: "bold",
      color: "#34d399", // Emerald Green
      fontFamily: "monospace",
    },
    sectionTitle: {
        fontSize: "12px", 
        color: "#cbd5e1", 
        fontWeight: "bold", 
        marginBottom: "8px", 
        display: "block",
        borderBottom: "1px solid #334155",
        paddingBottom: "8px"
    },
    plansList: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    planRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px",
      backgroundColor: "#1e293b",
      borderRadius: "10px",
      border: "1px solid #334155",
    },
    planName: {
      color: "white",
      fontWeight: "600",
      fontSize: "14px",
    },
    planSub: {
      color: "#34d399",
      fontSize: "11px",
      fontFamily: "monospace",
    },
    input: {
      backgroundColor: "#0f172a",
      border: "1px solid #475569",
      color: "white",
      padding: "8px 12px",
      borderRadius: "8px",
      width: "100px",
      fontSize: "14px",
      textAlign: "right",
      outline: "none",
    },
    infoBox: {
      padding: "12px",
      borderRadius: "8px",
      fontSize: "13px",
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
    },
    addressBox: {
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      color: "#e2e8f0",
    },
    errorBox: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      color: "#fca5a5",
    },
    mainInput: {
      width: "100%",
      backgroundColor: "#1e293b",
      border: "1px solid #475569",
      color: "white",
      padding: "14px",
      borderRadius: "10px",
      fontSize: "14px",
      outline: "none",
      marginTop: "6px",
    },
    footer: {
      padding: "20px",
      borderTop: "1px solid #334155",
      backgroundColor: "#0f172a",
      borderBottomLeftRadius: "16px",
      borderBottomRightRadius: "16px",
      display: "flex",
      gap: "12px",
      flexShrink: 0,
    },
    cancelBtn: {
      flex: 1,
      padding: "14px",
      backgroundColor: "#1e293b",
      color: "#cbd5e1",
      border: "1px solid #334155",
      borderRadius: "10px",
      fontWeight: "600",
      cursor: "pointer",
      fontSize: "14px",
    },
    confirmBtn: {
      flex: 1,
      padding: "14px",
      background: "linear-gradient(90deg, #eab308 0%, #ca8a04 100%)", // Gold Gradient
      color: "#000000",
      border: "none",
      borderRadius: "10px",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "14px",
      boxShadow: "0 4px 6px -1px rgba(234, 179, 8, 0.2)",
    },
    disabledBtn: {
      flex: 1,
      padding: "14px",
      backgroundColor: "#334155",
      color: "#64748b",
      border: "none",
      borderRadius: "10px",
      fontWeight: "bold",
      cursor: "not-allowed",
    }
  };

  return (
    <>
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {successOpen && (
        <SuccessModal
          isOpen={successOpen}
          onClose={() => { setSuccessOpen(false); onClose(); }}
          type="withdrawal"
          userId={successData.userId}
          amount={successData.amount}
        />
      )}

      {!successOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            
            {/* Header */}
            <div style={styles.header}>
              <div>
                <h2 style={styles.title}>Withdraw Funds</h2>
                <p style={styles.subtitle}>Select plans and enter amounts.</p>
              </div>
              <button onClick={onClose} style={styles.closeBtn}>&times;</button>
            </div>

            {/* Scrollable Body */}
            <div className="custom-scroll" style={styles.body}>
              
              {/* Wallet Balance */}
              <div style={styles.balanceCard}>
                <div>
                  <div style={styles.labelSmall}>Wallet Balance</div>
                  <div style={styles.balanceValue}>${balances.walletBalance.toFixed(2)}</div>
                </div>
                <div style={{fontSize: '24px'}}>💰</div>
              </div>

              {/* Plans List */}
              <div>
                <div style={styles.sectionTitle}>AVAILABLE PLANS</div>
                <div style={styles.plansList}>
                    {Object.keys(balances.planIncomes).length > 0 ? (
                      Object.keys(balances.planIncomes).map((plan) => (
                        <div key={plan} style={styles.planRow}>
                           <div style={{flex: 1}}>
                              <div style={styles.planName}>{planNames[plan]}</div>
                              <div style={styles.planSub}>
                                 Available: ${balances.planIncomes[plan].toFixed(2)}
                              </div>
                           </div>
                         <input
  type="number"
  placeholder="0.00"
  style={styles.input}
  value={withdrawals[plan] || ""}
  onChange={e => handleInputChange(e, plan)}
  onWheel={e => e.target.blur()} // prevent scroll wheel changing value
  onKeyDown={e => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault(); // prevent arrows changing the number
    }
  }}
/>

                        </div>
                      ))
                    ) : (
                      <div style={{padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontStyle: 'italic', backgroundColor: '#1e293b', borderRadius: '10px'}}>
                         No active plans found.
                      </div>
                    )}
                </div>
              </div>

              {/* Wallet Address Status */}
              {isAddressMissing ? (
                <div style={{...styles.infoBox, ...styles.errorBox}}>
                   <span style={{fontSize: '18px'}}>⚠️</span>
                   <div>
                      <strong style={{display:'block', marginBottom:'2px'}}>Missing Wallet Address</strong>
                      Please add your USDT (BEP20/TRC20) address in your <a href="/profile" style={{color: 'inherit', textDecoration: 'underline'}}>Profile</a>.
                   </div>
                </div>
              ) : (
                <div style={{...styles.infoBox, ...styles.addressBox, flexDirection: 'column', gap: '5px'}}>
                   <div style={{display:'flex', justifyContent:'space-between', width:'100%'}}>
                      <span style={styles.labelSmall}>Withdrawal Address</span>
                      <span style={{fontSize: '10px', backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1'}}>USDT</span>
                   </div>
                   <div style={{fontFamily: 'monospace', wordBreak: 'break-all', color: 'white'}}>{walletAddress}</div>
                </div>
              )}

              {/* Transaction Password */}
              <div>
                <label style={{...styles.labelSmall, display:'block'}}>Transaction Password</label>
                <input
                  type="password"
                  placeholder="Enter secure password"
                  style={styles.mainInput}
                  value={transactionPassword}
                  onChange={e => setTransactionPassword(e.target.value)}
                />
              </div>

            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <button 
                onClick={onClose} 
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button 
                onClick={handleWithdraw} 
                disabled={loading || isAddressMissing}
                style={loading || isAddressMissing ? styles.disabledBtn : styles.confirmBtn}
              >
                {loading ? "Processing..." : "Withdraw Now"}
              </button>
            </div>

          </div>
        </div>
      )}

      <MessageModal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ ...messageModal, open: false })}
        title={messageModal.title}
        message={messageModal.message}
        type={messageModal.type}
      />
    </>
  );
};

export default WithdrawalModal;