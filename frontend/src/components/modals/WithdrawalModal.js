import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios"; 
import SuccessModal from "./SuccessModal";
import MessageModal from "./MessageModal";
import { useAuth } from "../../context/AuthContext";

const WithdrawalModal = ({ userId, onClose }) => {
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [balances, setBalances] = useState({
    walletBalance: 0,
    planIncomes: {},
    rewardIncome: 0, 
    directIncome: 0 // ✅ ADDED: Direct Income State
  });
  
  const [userROI, setUserROI] = useState([]);
  const [levelWithdrawals, setLevelWithdrawals] = useState({}); 
  const [otherWithdrawals, setOtherWithdrawals] = useState({});
  
  const [transactionPassword, setTransactionPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState(""); // State for BEP20 Address
  const [isAddressMissing, setIsAddressMissing] = useState(false);
  
  const [successOpen, setSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({ userId: "", amount: 0, source: "" });
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "", type: "info" });
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { user: loggedInUser, token } = useAuth();

  const showMessage = (title, message, type = "error") =>
    setMessageModal({ open: true, title, message, type });

  // --- CONFIG (Updated for $10 Package) ---
  const planToPackageAmount = { plan0: 10, plan1: 30, plan2: 60, plan3: 120, plan4: 240, plan5: 480, plan6: 960 };
  const planNames = {
    plan0: "$10 Package", plan1: "$30 Package", plan2: "$60 Package", plan3: "$120 Package",
    plan4: "$240 Package", plan5: "$480 Package", plan6: "$960 Package"
  };
  
  const packageEarnings = {
    10: [2, 3, 5, 5, 5], 
    30: [5, 10, 15, 15, 15],
    60: [10, 20, 30, 30, 30],
    120: [20, 40, 60, 60, 60],
    240: [40, 80, 120, 120, 120],
    480: [80, 160, 240, 240, 240], 
    960: [160, 320, 480, 480, 480]
  };

  const unlockDays = [3, 13, 43, 73, 103];

  // --- LOGIC: Fetch Data ---
  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/wallet/withdrawable/${userId}`);
      const profileRes = await api.get(`/user/${userId}`);

      if (res.data) {
        setBalances({
          walletBalance: res.data.walletBalance || 0,
          planIncomes: res.data.planIncomes || {},
          rewardIncome: res.data.reward || 0, 
          directIncome: res.data.direct || 0, // ✅ ADDED: Fetching Direct Income from backend
        });
      }

      if (profileRes.data?.user) {
        setUserROI(profileRes.data.user.packages || []);
        const addr = (profileRes.data.user.walletAddress || "").trim();
        setWalletAddress(addr);
        setIsAddressMissing(!addr);
      }
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- TIMER LOGIC ---
  const getLevelData = (pkg, planKey, idx) => {
    const startDate = new Date(pkg.startDate).getTime();
    const unlockTime = startDate + (unlockDays[idx] * 24 * 60 * 60 * 1000);
    const timeLeft = Math.max(0, Math.floor((unlockTime - currentTime) / 1000));
    const isUnlocked = timeLeft === 0;

    const fullEarning = packageEarnings[pkg.amount][idx];
    
    let withdrawnInPlan = (loggedInUser?.pendingWithdrawals?.[planKey] || 0);
    for(let i = 0; i < idx; i++) {
        withdrawnInPlan -= packageEarnings[pkg.amount][i];
    }
    
    const levelWithdrawn = Math.max(0, withdrawnInPlan);
    const availableInLevel = isUnlocked ? Math.max(0, fullEarning - levelWithdrawn) : 0;

    return { isUnlocked, timeLeft, earning: fullEarning, availableInLevel };
  };

  // Modern Timer Formatting (Premium Box Style)
  const getFormattedTime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { d, h, m, s };
  };

  // --- HANDLERS ---
  const handleLevelInputChange = (e, planKey, levelIdx) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setOtherWithdrawals({}); 
      setLevelWithdrawals({ [`${planKey}_${levelIdx}`]: value });
      setSelectedLevel({ type: "plan", planKey, levelIdx });
    }
  };

  const handleOtherInputChange = (e, sourceName) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setLevelWithdrawals({}); 
      setOtherWithdrawals({ [sourceName]: value });
      setSelectedLevel({ type: "other", sourceName });
    }
  };

  const handleWithdraw = async () => {
    try {
      const planEntries = Object.entries(levelWithdrawals).filter(([_, val]) => Number(val) > 0);
      const otherEntries = Object.entries(otherWithdrawals).filter(([_, val]) => Number(val) > 0);

      if (planEntries.length === 0 && otherEntries.length === 0) {
        return showMessage("Warning", "Enter amount to withdraw.");
      }
      if (!selectedLevel) {
        return showMessage("Warning", "Select a balance to withdraw.");
      }

      // ✅ Strict validation before attempting withdrawal
      if (selectedLevel.type === "plan") {
        const { planKey, levelIdx } = selectedLevel;
        const requestedAmount = Number(planEntries[0][1]);
        
        const pkg = userROI.find(r => r.plan === planKey);
        if (pkg) {
           const levelData = getLevelData(pkg, planKey, levelIdx);
           
           if (!levelData.isUnlocked) {
             return showMessage("Locked", `This level is locked. Please wait for the timer to complete before withdrawing.`);
           }
           if (requestedAmount > levelData.availableInLevel) {
             return showMessage("Insufficient Funds", `You only have $${levelData.availableInLevel} available in this level.`);
           }
        }
      }

      if (!walletAddress.trim()) {
        return showMessage("Warning", "Please enter your USDT BEP20 Wallet Address.");
      }
      if (!transactionPassword.trim()) {
        return showMessage("Warning", "Enter transaction password.");
      }

      setLoading(true);

      // Save Wallet Address if it was missing/updated
      if (isAddressMissing) {
        try {
          await api.put(`/user/${userId}`, { walletAddress });
        } catch (e) {
          console.log("Failed to update wallet address initially, continuing anyway...", e);
        }
      }

      let payload = { userId, transactionPassword };
      let successSourceTitle = "";

      if (selectedLevel.type === "plan") {
        const [key, val] = planEntries[0];
        const planKeyToUse = key.split("_")[0];
        payload = {
          ...payload,
          amount: Number(val),
          source: planKeyToUse,
          level: selectedLevel.levelIdx,
          package: planToPackageAmount[planKeyToUse],
        };
        successSourceTitle = planNames[planKeyToUse];
      } else if (selectedLevel.type === "other") {
        const [sourceKey, val] = otherEntries[0];
        payload = {
          ...payload,
          amount: Number(val),
          source: sourceKey, 
        };
        // ✅ ADDED: Title update for Direct
        successSourceTitle = sourceKey === "reward" ? "USDT Reward Income" : "Direct Income";
      }

      await api.post("/wallet/withdraw", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessData({
        userId,
        amount: payload.amount,
        source: successSourceTitle,
      });

      setSuccessOpen(true);
      setLevelWithdrawals({});
      setOtherWithdrawals({});
      setSelectedLevel(null);
      setTransactionPassword("");
      await fetchData();

    } catch (err) {
      console.log(err);
      const msg = err.response?.status === 403
        ? "Invalid Transaction Password"
        : err.response?.data?.message || "Withdrawal failed";
      showMessage("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const isAnySelected = Object.values(levelWithdrawals).some(v => Number(v) > 0) || Object.values(otherWithdrawals).some(v => Number(v) > 0);

  // --- STYLES ---
  const styles = {
    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.95)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(8px)" },
    modal: { backgroundColor: "#0f172a", width: "100%", maxWidth: "550px", borderRadius: "20px", border: "1px solid #334155", display: "flex", flexDirection: "column", maxHeight: "95vh", position: "relative", overflow: "hidden" },
    header: { padding: "20px", borderBottom: "1px solid #1e293b", backgroundColor: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: "18px", fontWeight: "700", color: "white", margin: 0 },
    body: { padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "15px" },
    planRow: { backgroundColor: "#1e293b", borderRadius: "12px", border: "1px solid #334155", marginBottom: "15px", overflow: "hidden" },
    levelBox: { display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", alignItems: "center", gap: "10px", padding: "15px", borderBottom: "1px solid #1e293b", fontSize: "12px" },
    levelInput: { width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #475569", color: "white", borderRadius: "8px", fontSize: "12px", textAlign: "center", outline: "none" },
    mainInput: { width: "100%", backgroundColor: "#0f172a", border: "1px solid #475569", color: "white", padding: "12px", borderRadius: "10px", outline: "none" },
    confirmBtn: { width: "100%", padding: "14px", background: "linear-gradient(90deg, #eab308 0%, #ca8a04 100%)", color: "black", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" },
    timerBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #10b981', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '6px', width: '36px', height: '40px' },
    timerValue: { fontSize: '12px', fontWeight: '900', color: '#34d399', lineHeight: '1.2' },
    timerLabel: { fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase' }
  };

  return (
    <>
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {successOpen && (
        <SuccessModal isOpen={successOpen} onClose={() => { setSuccessOpen(false); onClose(); }} type="withdrawal" userId={successData.userId} amount={successData.amount} source={successData.source} />
      )}

      {messageModal.open && (
         <MessageModal isOpen={messageModal.open} title={messageModal.title} message={messageModal.message} type={messageModal.type} onClose={() => setMessageModal({ ...messageModal, open: false })} />
      )}

      {!successOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.header}>
              <div>
                <h2 style={styles.title}>Withdraw Funds</h2>
              </div>
              <button onClick={onClose} style={{background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer'}}>&times;</button>
            </div>

            <div className="custom-scroll" style={styles.body}>
              
              {/* ✅ ADDED: OTHER BALANCES (Reward & Direct) */}
              <div>
                <div style={{fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '1px'}}>OTHER BALANCES</div>
                <div style={styles.planRow}>
                  
                  {/* USDT REWARD ROW */}
                  <div style={{...styles.levelBox, gridTemplateColumns: "1fr 1fr", borderBottom: '1px solid #334155'}}>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                       <span style={{color: '#e2e8f0', fontWeight: 'bold', fontSize: '14px'}}>USDT Reward</span>
                       <span style={{fontSize: '11px', color: '#a855f7'}}>Available: ${balances.rewardIncome || 0}</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      <input type="number" placeholder="Enter Amount" style={styles.levelInput} 
                        value={otherWithdrawals.reward || ""} 
                        onChange={e => handleOtherInputChange(e, "reward")} 
                        max={balances.rewardIncome} 
                      />
                    </div>
                  </div>

                  {/* DIRECT INCOME ROW */}
                  <div style={{...styles.levelBox, gridTemplateColumns: "1fr 1fr", borderBottom: 'none'}}>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                       <span style={{color: '#e2e8f0', fontWeight: 'bold', fontSize: '14px'}}>Direct Income</span>
                       <span style={{fontSize: '11px', color: '#f59e0b'}}>Available: ${balances.directIncome || 0}</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      <input type="number" placeholder="Enter Amount" style={styles.levelInput} 
                        value={otherWithdrawals.direct || ""} 
                        onChange={e => handleOtherInputChange(e, "direct")} 
                        max={balances.directIncome} 
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* ACTIVE PACKAGES */}
              <div>
                <div style={{fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '10px', marginTop:'5px', letterSpacing: '1px'}}>ACTIVE PACKAGES</div>
                {Object.keys(planToPackageAmount).map((planKey) => {
                  const pkg = userROI.find(r => r.plan === planKey);
                  if (!pkg) return null;
                  
                  const allLevelsData = [0, 1, 2, 3, 4].map(idx => getLevelData(pkg, planKey, idx));
                  const activeTimerIdx = allLevelsData.findIndex(l => !l.isUnlocked); 
                  
                  const availableInThisPlan = balances.planIncomes[planKey] || 0;

                  return (
                    <div key={planKey} style={styles.planRow}>
                      <div style={{padding: '12px', background: '#1e293b', borderBottom: '2px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                         <span style={{fontWeight: '900', color: 'white', fontSize: '13px'}}>{planNames[planKey]}</span>
                         <span style={{fontSize: '11px', color: '#34d399', fontWeight: 'bold'}}>Max Withdraw Avail: ${availableInThisPlan.toFixed(2)}</span>
                      </div>
                      
                      {/* WRAPPER FOR HORIZONTAL SCROLL */}
                      <div className="custom-scroll" style={{ overflowX: 'auto', width: '100%' }}>
                        <div style={{ minWidth: '360px' }}> {/* Prevents squishing on small phones */}
                          
                          {allLevelsData.map((data, idx) => {
                            const { isUnlocked, timeLeft, earning, availableInLevel } = data;
                            const isLast = idx === 4;
                            
                            const isCurrentlyCounting = idx === activeTimerIdx;
                            const { d, h, m, s } = getFormattedTime(timeLeft);

                            return (
                              <div key={idx} style={{
                                  display: 'grid', 
                                  // ✅ EXACT SIZES: Left (65px) | Center Timer (180px) | Right Input (80px)
                                  gridTemplateColumns: '65px 180px 80px', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  padding: '12px 10px', 
                                  borderBottom: isLast ? 'none' : '1px solid #1e293b'
                              }}>
                                
                                {/* Left Column: Level Info */}
                                <div>
                                   <span  style={{color: isUnlocked ? '#e2e8f0' : '#64748b', fontWeight: 'bold', fontSize: '11px'}}>
                                      Level {idx+1} <br/><span className="font-bold text-yellow-500" >${earning}</span>
                                   </span>
                                </div>
                                
                                {/* Center Column: Timer (Fixed 180px space keeps alignment perfect) */}
                                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                   {isUnlocked ? (
                                      <span style={{fontSize: '11px', color: '#34d399', fontWeight: 'bold'}}>✅ Unlocked</span>
                                   ) : isCurrentlyCounting ? (
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                          <div style={styles.timerBox}>
                                            <span style={styles.timerValue}>{d}</span>
                                            <span style={styles.timerLabel}>DAYS</span>
                                          </div>
                                          <div style={styles.timerBox}>
                                            <span style={styles.timerValue}>{h}</span>
                                            <span style={styles.timerLabel}>HRS</span>
                                          </div>
                                          <div style={styles.timerBox}>
                                            <span style={styles.timerValue}>{m}</span>
                                            <span style={styles.timerLabel}>MIN</span>
                                          </div>
                                          <div style={styles.timerBox}>
                                            <span style={styles.timerValue}>{s}</span>
                                            <span style={styles.timerLabel}>SEC</span>
                                          </div>
                                      </div>
                                   ) : (
                                      // Empty space that still respects the grid column
                                      <div></div> 
                                   )}
                                </div>

                                {/* Right Column: Input Box */}
                                <div style={{ width: '100%' }}>
                                     <input 
                                       type="number" 
                                       placeholder="0.00" 
                                       style={{
                                         ...styles.levelInput, 
                                         width: '100%', 
                                         opacity: 1 // Hamesha bright dikhega
                                       }} 
                                       value={levelWithdrawals[`${planKey}_${idx}`] || ""} 
                                       onChange={e => handleLevelInputChange(e, planKey, idx)} 
                                       max={availableInLevel}
                                     />
                                </div>

                              </div>
                            );
                          })}
                          
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* WALLET ADDRESS & SECURITY */}
              <div style={{padding: '15px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155'}}>
                
             {/* USDT (BEP20) WALLET ADDRESS SECTION */}
              <div style={{marginBottom: '12px'}}>
                <label style={{fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                  USDT (BEP20) WALLET ADDRESS
                  {/* 🔥 Info Badge */}
                  {walletAddress && <span style={{color: '#eab308', marginLeft: '10px'}}>(cannot change address after withdrawal)</span>}
                </label>
                
                <input 
                  type="text" 
                  placeholder="Enter your BEP20 Wallet Address" 
                  style={{
                      ...styles.mainInput,
                      // 🔥 Visual feedback: agar lock hai toh grey dikhega
                      backgroundColor: balances.isLocked ? '#1e293b' : '#0f172a',
                      cursor: balances.isLocked ? 'not-allowed' : 'text'
                  }} 
                  value={walletAddress} 
                  onChange={e => setWalletAddress(e.target.value)} 
                  // 🔥 Disable input if address is already set AND user is withdrawing
                  disabled={!!loggedInUser?.walletAddress && isAnySelected}
                />
              </div>

                <div>
                  <label style={{fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>SECURITY PASSWORD</label>
                  <input 
                    type="password" 
                    placeholder="Enter Transaction Password" 
                    style={styles.mainInput} 
                    value={transactionPassword} 
                    onChange={e => setTransactionPassword(e.target.value)} 
                  />
                </div>
              </div>

            </div>

            {/* ACTION BUTTON */}
            <div style={{padding: '20px', borderTop: '1px solid #334155', background: '#0f172a'}}>
           <button 
  onClick={handleWithdraw} 
  disabled={loading} // Sirf loading ke time disable hoga taaki double click na ho
  style={styles.confirmBtn} // Hamesha bright aur active dikhega
>
  {loading ? "Processing..." : "Withdraw Selected Amount"}
</button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default WithdrawalModal;