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
    directIncome: 0 
  });
  
  const [userROI, setUserROI] = useState([]);
  const [levelWithdrawals, setLevelWithdrawals] = useState({}); 
  const [otherWithdrawals, setOtherWithdrawals] = useState({});
  
  const [transactionPassword, setTransactionPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState(""); 
  const [isAddressMissing, setIsAddressMissing] = useState(false);
  
  const [successOpen, setSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({ userId: "", amount: 0, source: "" });
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "", type: "info" });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [latestWithdrawals, setLatestWithdrawals] = useState({});

  const { user: loggedInUser, token } = useAuth();

  const showMessage = (title, message, type = "error") =>
    setMessageModal({ open: true, title, message, type });

  // --- CONFIG ---
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
  const packageOffsets = { 10: 0, 30: 1, 60: 6, 120: 11, 240: 16, 480: 21, 960: 26 };

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
          directIncome: res.data.direct || 0, 
        });
      }

      if (profileRes.data?.user) {
        setUserROI(profileRes.data.user.packages || []);
        setLatestWithdrawals(profileRes.data.user.pendingWithdrawals || {});
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

  // --- 🚀 SYNCED TIMER LOGIC ---
  const getLevelData = (planKey, idx) => {
    const amount = planToPackageAmount[planKey];
    const activePkg = userROI.find(r => r.plan === planKey);
    const hasPackage = !!activePkg;
    
    const joinDate = loggedInUser?.createdAt ? new Date(loggedInUser.createdAt).getTime() : Date.now();

    const hoursSinceJoined = Math.max(0, Math.floor((currentTime - joinDate) / (1000 * 60 * 60)));
    const daysSinceJoined = Math.max(0, Math.floor((currentTime - joinDate) / (1000 * 60 * 60 * 24)));
    let isAchievedFree = false;

    if (amount === 10) {
      isAchievedFree = hoursSinceJoined >= (idx * 4); 
    } else {
      const reqDaysFree = packageOffsets[amount] + idx; 
      isAchievedFree = daysSinceJoined >= reqDaysFree;
    }

    let isUnlockedPaid = false;
    let timeLeftPaid = 0;

    if (hasPackage) {
      const startDate = new Date(activePkg.startDate || activePkg.date).getTime();
      const targetTime = startDate + (unlockDays[idx] * 24 * 60 * 60 * 1000);
      timeLeftPaid = Math.max(0, Math.floor((targetTime - currentTime) / 1000));
      isUnlockedPaid = timeLeftPaid === 0;
    }

    const fullEarning = packageEarnings[amount][idx];
    
    let withdrawnInPlan = (loggedInUser?.pendingWithdrawals?.[planKey] || 0);
    for(let i = 0; i < idx; i++) {
        withdrawnInPlan -= packageEarnings[amount][i];
    }
    
    const levelWithdrawn = Math.max(0, withdrawnInPlan);
    const availableInLevel = hasPackage 
        ? (isUnlockedPaid ? Math.max(0, fullEarning - levelWithdrawn) : 0) 
        : Math.max(0, fullEarning - levelWithdrawn); 

    return { 
      originalIdx: idx, 
      hasPackage, 
      isAchievedFree, 
      isUnlockedPaid, 
      timeLeftPaid, 
      earning: fullEarning, 
      availableInLevel 
    };
  };

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
      setLevelWithdrawals((prev) => ({
        ...prev, 
        [`${planKey}_${levelIdx}`]: value 
      }));
    }
  };

  const handleOtherInputChange = (e, sourceName) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setOtherWithdrawals((prev) => ({
        ...prev, 
        [sourceName]: value 
      }));
    }
  };

  const handleWithdraw = async () => {
    try {
      // 🌟 Promo User Check
      const isPromo = loggedInUser?.role === "promo";

      const planEntries = Object.entries(levelWithdrawals).filter(([_, val]) => Number(val) > 0);
      const otherEntries = Object.entries(otherWithdrawals).filter(([_, val]) => Number(val) > 0);

      let totalRequested = 0;
      planEntries.forEach(([_, val]) => totalRequested += Number(val));
      otherEntries.forEach(([_, val]) => totalRequested += Number(val));

      if (totalRequested === 0) return showMessage("Warning", "Enter amount to withdraw.");
      
      // 🛡️ Bypassed for Promo: $5 Minimum Check
      if (!isPromo && totalRequested < 5) {
        return showMessage("Warning", "Minimum total withdrawal amount is $5.");
      }
      
      if (!walletAddress.trim()) return showMessage("Warning", "Please enter your USDT BEP20 Wallet Address.");
      if (!transactionPassword.trim()) return showMessage("Warning", "Enter transaction password.");

      let items = []; 
      let successMessages = [];

      // Process Matrix Levels
      for (const [key, val] of planEntries) {
        const [planKey, levelIdx] = key.split("_");
        const requestedAmount = Number(val);
        const levelData = getLevelData(planKey, parseInt(levelIdx));

        // 🛡️ Bypassed for Promo: Package & Timer Checks
        if (!isPromo) {
            if (!levelData.hasPackage) {
                return showMessage("Top-up Required ⚠️", `You must activate the $${planToPackageAmount[planKey]} Package to withdraw.`, "error");
            }
            if (!levelData.isUnlockedPaid) {
              return showMessage("Warning", `Level ${parseInt(levelIdx) + 1} timer is still running.`);
            }
            if (requestedAmount > levelData.availableInLevel) {
              return showMessage("Insufficient Funds", `Available: $${levelData.availableInLevel}`);
            }
        }

        items.push({
          source: planKey,
          level: parseInt(levelIdx),
          package: planToPackageAmount[planKey],
          amount: requestedAmount,
        });
        successMessages.push(planNames[planKey]);
      }

      // Process Reward & Direct
      for (const [sourceKey, val] of otherEntries) {
        const requestedAmount = Number(val);
        
        // 🛡️ Bypassed for Promo: Balance checks
        if (!isPromo) {
            if (sourceKey === 'reward' && requestedAmount > balances.rewardIncome) {
                return showMessage("Insufficient Funds", `You only have $${balances.rewardIncome} in Reward Income.`);
            }
            if (sourceKey === 'direct' && requestedAmount > balances.directIncome) {
                return showMessage("Insufficient Funds", `You only have $${balances.directIncome} in Direct Income.`);
            }
        }

        items.push({
          source: sourceKey,
          amount: requestedAmount,
        });
        successMessages.push(sourceKey === "reward" ? "USDT Reward" : "Direct Income");
      }

      setLoading(true);

      if (isAddressMissing) {
        try {
          await api.put(`/user/${userId}`, { walletAddress });
        } catch (e) {
          console.log("Wallet update failed, continuing...", e);
        }
      }

      // 🔥 DYNAMIC ENDPOINT
      const endpoint = isPromo ? "/wallet/promo-withdraw" : "/wallet/withdraw";

      // 🔥 Yahan API response capture kar rahe hain
      const response = await api.post(endpoint, {
        transactionPassword,
        items
      }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      const uniqueSources = [...new Set(successMessages)].join(", ");

      // 🔥 DYNAMIC ID LOGIC: Promo hai aur backend se id aayi hai to wo use karo, nahi to normal real userId use karo
      const finalUserId = (isPromo && response.data.generatedId) ? response.data.generatedId : userId;

      setSuccessData({
        userId: finalUserId,
        amount: totalRequested,
        source: uniqueSources,
      });

      setSuccessOpen(true);
      setLevelWithdrawals({});
      setOtherWithdrawals({});
      setTransactionPassword("");
      await fetchData();

    } catch (err) {
      console.log(err);
      const msg = err.response?.status === 403
        ? "Invalid Transaction Password"
        : err.response?.data?.message || "Withdrawal failed.";
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
                {/* 🔥 User ko Modal Title mein bhi apna ID dikhega */}
                <h2 style={styles.title}>Withdraw Funds <span style={{fontSize: "14px", color: "#94a3b8", fontWeight: "normal"}}></span></h2>
              </div>
              <button onClick={onClose} style={{background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer'}}>&times;</button>
            </div>

            <div className="custom-scroll" style={styles.body}>
              
              {/* OTHER BALANCES */}
              <div>
                <div style={{fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '1px'}}>Reward & Direct Income BALANCES</div>
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

              {/* MATRIX INCOME WALLETS */}
              <div>
                <div style={{fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '10px', marginTop:'5px', letterSpacing: '1px'}}>Global Growth INCOME</div>
                
                {Object.keys(planToPackageAmount).map((planKey) => {
                  const pkgAmount = planToPackageAmount[planKey];
                  const userPackages = loggedInUser?.packages || [];
                  const activePackage = userPackages.find(p => p.amount === pkgAmount);
                  const hasPackage = !!activePackage;

                  const joinDate = loggedInUser?.createdAt ? new Date(loggedInUser.createdAt).getTime() : Date.now();
                  const daysSinceJoined = Math.max(0, Math.floor((currentTime - joinDate) / (1000 * 60 * 60 * 24)));
                  const hoursSinceJoined = Math.max(0, Math.floor((currentTime - joinDate) / (1000 * 60 * 60)));
                  const pkgOffset = packageOffsets[pkgAmount];

                  const earningsArray = packageEarnings[pkgAmount] || [];
                  const allProcessedLevels = [];

                  for (let idx = 0; idx < earningsArray.length; idx++) {
                      
                      let isAchievedFree = false;
                      if (pkgAmount === 10) {
                        isAchievedFree = hoursSinceJoined >= (idx * 4);
                      } else {
                        isAchievedFree = daysSinceJoined >= (pkgOffset + idx);
                      }

                      let isAchievedPaid = false;
                      let isUnlockedPaid = false;
                      let timeLeftPaid = 0;

                      if (hasPackage) {
                        const startDateMs = new Date(activePackage.startDate || activePackage.date).getTime(); 
                        
                        if (pkgAmount === 10) {
                          const activeHours = Math.max(0, Math.floor((currentTime - startDateMs) / (1000 * 60 * 60)));
                          isAchievedPaid = activeHours >= (idx * 4);
                        } else {
                          const activeDays = Math.max(0, Math.floor((currentTime - startDateMs) / (1000 * 60 * 60 * 24)));
                          isAchievedPaid = activeDays >= idx;
                        }

                        const targetTime = startDateMs + (unlockDays[idx] * 24 * 60 * 60 * 1000);
                        timeLeftPaid = Math.max(0, Math.floor((targetTime - currentTime) / 1000));
                        isUnlockedPaid = timeLeftPaid === 0;
                      }

                      allProcessedLevels.push({
                          originalIdx: idx,
                          earning: earningsArray[idx],
                          isAchieved: isAchievedFree || isAchievedPaid,
                          isUnlockedPaid,
                          timeLeftPaid
                      });
                  }

                  const activeTimerIdx = allProcessedLevels.findIndex(l => !l.isUnlockedPaid);
                  const achievedLevels = allProcessedLevels.filter(l => l.isAchieved);

                  if (achievedLevels.length === 0) return null;

                  return (
                   <div key={planKey} style={styles.planRow}>
                      <div style={{padding: '12px', background: '#1e293b', borderBottom: '2px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <span style={{fontWeight: '900', color: 'white', fontSize: '13px'}}>{planNames[planKey]}</span>
                           {hasPackage ? (
                             <span >-</span>
                           ) : (
                             <span>-</span>
                           )}
                         </div>
                         
                         {(() => {
                            const totalEarningsOfAchievedLevels = achievedLevels.reduce((sum, levelData) => sum + (levelData.earning || 0), 0);
                            const totalWithdrawnInThisPlan = latestWithdrawals[planKey] || 0;
                            const frontendAvailableInThisPlan = Math.max(0, totalEarningsOfAchievedLevels - totalWithdrawnInThisPlan);
                            
                            return (
                                <span style={{fontSize: '11px', color: '#34d399', fontWeight: 'bold'}}>
                                    Withdraw Available Amt: ${frontendAvailableInThisPlan.toFixed(2)}
                                </span>
                            );
                        })()}
                      </div>
                      
                      <div className="custom-scroll" style={{ overflowX: 'auto', width: '100%' }}>
                        <div style={{ minWidth: '360px' }}> 
                          
                          {achievedLevels.map((data, vIdx) => {
                            const originalIdx = data.originalIdx; 
                            const isLast = vIdx === achievedLevels.length - 1;
                            
                            const isCurrentlyCountingPaid = hasPackage && originalIdx === activeTimerIdx;
                            const { d, h, m, s } = getFormattedTime(data.timeLeftPaid);

                            return (
                              <div key={originalIdx} style={{
                                  display: 'grid', 
                                  gridTemplateColumns: '65px 180px 80px', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  padding: '12px 10px', 
                                  borderBottom: isLast ? 'none' : '1px solid #1e293b'
                              }}>
                                
                                <div>
                                   <span style={{color: '#e2e8f0', fontWeight: 'bold', fontSize: '11px'}}>
                                      Level {originalIdx+1} <br/><span className="font-bold text-yellow-500" >${data.earning}</span>
                                   </span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                   {isCurrentlyCountingPaid ? (
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
                                   ) : data.isUnlockedPaid ? (
                                      <span style={{fontSize: '11px', color: '#34d399', fontWeight: 'bold'}}></span>
                                   ) : (
                                      <div></div>
                                   )}
                                </div>

                                <div style={{ width: '100%' }}>
                                     <input 
                                       type="number" 
                                       placeholder="0.00" 
                                       style={{
                                         ...styles.levelInput, 
                                         width: '100%', 
                                         opacity: 1 
                                       }} 
                                       value={levelWithdrawals[`${planKey}_${originalIdx}`] || ""} 
                                       onChange={e => handleLevelInputChange(e, planKey, originalIdx)} 
                                       max={data.earning}
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
              <div style={{marginBottom: '12px'}}>
                <label style={{fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                  USDT (BEP20) WALLET ADDRESS
                  {!isAddressMissing && <span style={{color: '#10b981', marginLeft: '10px'}}>(Saved & Locked)</span>}
                  {isAddressMissing && <span style={{color: '#eab308', marginLeft: '10px'}}>(Once saved, cannot be changed)</span>}
                </label>
                <input 
                  type="text" 
                  placeholder="Enter your BEP20 Wallet Address" 
                  style={{
                      ...styles.mainInput,
                      backgroundColor: !isAddressMissing ? '#0f172a' : '#1e293b', 
                      cursor: !isAddressMissing ? 'not-allowed' : 'text',
                      opacity: !isAddressMissing ? 0.6 : 1,
                      border: !isAddressMissing ? '1px solid #334155' : '1px solid #475569'
                  }} 
                  value={walletAddress} 
                  onChange={e => setWalletAddress(e.target.value)} 
                  disabled={!isAddressMissing} 
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
                disabled={loading} 
                style={styles.confirmBtn}
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