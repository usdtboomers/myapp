import React, { useState, useEffect, useMemo } from "react";
import api from "../../api/axios"; 
import SuccessModal from "./SuccessModal";
import MessageModal from "./MessageModal";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle, ShieldCheck } from "lucide-react"; 

// --- SIMPLE CONFIGURATION (10 package added) ---
const packages = [10, 30, 60, 120, 240, 480, 960];

const TopUpModal = ({ onClose, onTopUpSuccess }) => {
  // --- STATE & AUTH ---
  const { user: loggedInUser, token, login } = useAuth();
  const [userId, setUserId] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  
  // Default selected amount changed to 10
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [walletBalance, setWalletBalance] = useState(null);
  const [transactionPassword, setTransactionPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const isPromoUser = loggedInUser?.role === "promo";

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState({ userId: "", name: "", amount: 0 });
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "", type: "info" });

  const showMessage = (title, message, type = "info") => setMessageModal({ open: true, title, message, type });

  // --- 1. Fetch Balance ---
  useEffect(() => {
    const fetchBalance = async () => {
      if (!loggedInUser?.userId || !token) return;
      try {
        const res = await api.get(`/user/${loggedInUser.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWalletBalance(res.data.user.walletBalance || 0);
      } catch (err) {
        console.error(err);
        setWalletBalance(0);
      }
    };
    fetchBalance();
  }, [loggedInUser?.userId, token]);

  // --- 2. Calculate User's Package Status ---
  const userPackageStatus = useMemo(() => {
    if (!userInfo) return { boughtSet: new Set(), nextAvailable: 10 };

    const bought = new Set(userInfo.dailyROI?.map(p => Number(p.amount)) || []);
    
    // Auto-select logic
    let next = 10; 
    for (let i = 0; i < packages.length; i++) {
        if (!bought.has(packages[i])) {
            next = packages[i];
            break;
        }
    }

    return { boughtSet: bought, nextAvailable: next };
  }, [userInfo]);

  // --- 3. Auto Select Next Available ---
  useEffect(() => {
    if (userInfo && userPackageStatus.nextAvailable) {
        setSelectedAmount(userPackageStatus.nextAvailable);
    }
  }, [userInfo, userPackageStatus.nextAvailable]);

  // --- LOGIC: Fetch User (Updated for Auto-fetch) ---
  const fetchUser = async (idToFetch, showManualError = false) => {
    if (!idToFetch) {
        setUserInfo(null);
        return;
    }
    try {
      const res = await api.get(`/user/${idToFetch}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserInfo(res.data.user);
    } catch {
       setUserInfo(null);
       if (showManualError) {
           showMessage("Error", "❌ User not found", "error");
       }
    }
  };

  // --- AUTO-FETCH EFFECT ---
  useEffect(() => {
    // 500ms debounce to prevent API spam while typing
    const delayDebounceFn = setTimeout(() => {
      if (userId && userId.trim() !== "") {
        fetchUser(userId, false); // Don't show error popup automatically while typing
      } else {
        setUserInfo(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [userId, token]);

  // --- LOGIC: Handle Top Up ---
  const handleTopUp = async () => {
    if (!userInfo) return showMessage("Error", "❌ Please fetch user first.", "error");
    if (!transactionPassword) return showMessage("Error", "❌ Enter transaction password.", "error");

    if (!isPromoUser && walletBalance < selectedAmount) {
      return showMessage("Error", `❌ Insufficient balance. You have $${walletBalance}`, "error");
    }

    if (!isPromoUser) {
        if (userPackageStatus.boughtSet.has(selectedAmount)) {
             return showMessage("Active", `✅ You already have Plan $${selectedAmount}.`, "warning");
        }
    }

    setLoading(true);
    try {
      await api.put(
        `/user/topup/${Number(userId)}`,
        { amount: selectedAmount, transactionPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessData({ userId: userInfo.userId, name: userInfo.name, amount: selectedAmount });
      setSuccessModalOpen(true);

      const refreshedRes = await api.get(`/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshedUser = refreshedRes.data.user;

      if (Number(userId) === loggedInUser.userId) {
        login(refreshedUser, token);
        setWalletBalance(refreshedUser.walletBalance);
      } else {
        setUserInfo(refreshedUser);
      }

      if (onTopUpSuccess) onTopUpSuccess();

    } catch (err) {
      console.error('Top-up Error:', err);
      const msg = err.response?.data?.message || "❌ Top-up failed";
      showMessage("Error", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 mt-1 overflow-hidden">
      
      <style>{`
        .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:not(.bought):hover {
            transform: translateY(-4px);
            border-color: #fbbf24;
            box-shadow: 0 10px 40px -10px rgba(251, 191, 36, 0.2);
        }
        .glass-card.selected {
            border-color: #fbbf24;
            background: rgba(251, 191, 36, 0.08);
            box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.4), 0 0 20px rgba(251, 191, 36, 0.2);
            transform: scale(1.02);
        }
        .glass-card.bought {
            border-color: #10b981;
            background: rgba(16, 185, 129, 0.1);
            opacity: 0.8;
            cursor: default;
        }
        .gold-text {
            background: linear-gradient(to right, #fbbf24, #d97706);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .gold-btn {
            background: linear-gradient(135deg, #d97706, #fbbf24);
            transition: all 0.3s ease;
        }
        .gold-btn:hover {
            filter: brightness(115%);
            box-shadow: 0 0 25px rgba(251, 191, 36, 0.4);
        }
        .bg-pattern {
            background-color: #0f172a;
            background-image: radial-gradient(#334155 1px, transparent 1px);
            background-size: 24px 24px;
        }
        .custom-scroll {
            scrollbar-width: thin;
            scrollbar-color: #334155 transparent;
            overscroll-behavior: contain;
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>

      {/* Main Modal Container */}
      <div className="bg-pattern w-full max-w-4xl h-full max-h-[85vh] flex flex-col rounded border border-slate-700 shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center z-20 shrink-0">
          <div>
             <h2 className="text-blue-400 font-bold tracking-widest uppercase text-[10px] md:text-xs">Select Plan</h2>
             <h1 className="text-xl md:text-2xl font-bold text-white">Topup <span className="gold-text">Zone</span></h1>
          </div>
          <button onClick={onClose} className="group bg-slate-800 hover:bg-red-500/20 p-2 rounded-full transition-all border border-slate-700 hover:border-red-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 p-4 md:p-6 space-y-6">
          
          {/* 1. Control Panel (User & Wallet) */}
          <div className="glass-card p-4 md:p-6 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
               {/* Wallet */}
               <div className="md:col-span-3 bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center md:text-left">
                  <span className="text-gray-400 text-[10px] block uppercase tracking-wider">Your Balance</span>
                  <div className="text-xl text-yellow-500 font-bold text-emerald-400 font-mono">
                    {walletBalance !== null ? `$${walletBalance}` : "Loading..."}
                  </div>
               </div>

               {/* User Input (Updated for Green Indicator) */}
               <div className="md:col-span-5 flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      placeholder="Enter UserId"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className={`w-full bg-slate-900 border text-black rounded-xl px-4 py-2.5 outline-none transition-all placeholder-gray-500 font-mono ${
                          userInfo 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                            : 'border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    {userInfo && (
                       <div className="absolute right-3 top-1/2 transform -translate-y-1/2 font-medium text-green-500">
                           <CheckCircle size={20} />
                       </div>
                    )}
                  </div>
                  
                  {userInfo ? (
                     <div className="bg-emerald-500/20 text-green-400 border border-emerald-500/50 px-5 rounded-xl font-bold transition-all flex items-center justify-center">
                       Verified
                     </div>
                  ) : (
                     <button onClick={() => fetchUser(userId, true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20">
                       Fetch
                     </button>
                  )}
               </div>

               {/* User Info Display */}
               <div className="md:col-span-4">
                  {userInfo ? (
                    <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 border border-green-500/30 rounded-xl p-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-sm">{userInfo.name}</div>
                        <div className="text-xs text-gray-400">ID: {userInfo.userId}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 uppercase">Current</div>
                        <div className="text-green-400 font-bold text-sm">
                           {userInfo.topUpAmount ? `$${userInfo.topUpAmount}` : "None"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center text-gray-500 text-sm">
                      Enter ID to fetch details
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* 2. Normal Packages Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {packages.map((pkgAmount) => {
                const isBought = userPackageStatus.boughtSet.has(pkgAmount);
                const isSelected = selectedAmount === pkgAmount;

                return (
                  <div 
                    key={pkgAmount}
                    onClick={() => {
                      if (!isBought) setSelectedAmount(pkgAmount);
                    }}
                    className={`
                      glass-card relative rounded-2xl p-6 cursor-pointer select-none text-center flex flex-col items-center justify-center
                      ${isBought ? 'bought' : ''}
                      ${isSelected ? 'selected' : ''}
                    `}
                  >
                    {/* Status Badge */}
                    {isBought && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                            <CheckCircle size={10} /> ACTIVE
                        </div>
                    )}

                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">Package</h3>
                    <div className="text-4xl font-black text-white mb-4">${pkgAmount}</div>
                    
                    <div className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors 
                        ${isBought ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 
                          isSelected ? 'bg-yellow-500 text-slate-900 shadow-lg' : 'border border-slate-600 text-gray-400'}
                    `}>
                        {isBought ? <span className="flex items-center text-white justify-center gap-1"><ShieldCheck size={14}/> Active</span> : 
                        isSelected ? 'Selected' : 'Select'}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>

        {/* Footer (Payment Action) */}
        <div className="bg-[#0f172a] border-t border-slate-800 p-4 shrink-0 z-20">
          <div className="flex flex-col md:flex-row items-stretch gap-4 max-w-2xl mx-auto">
             <div className="flex-1 relative">
                <input
                  type="password"
                  placeholder="Transaction Password"
                  value={transactionPassword}
                  onChange={(e) => setTransactionPassword(e.target.value)}
                  className="w-full h-full bg-slate-900 border border-slate-700 text-black rounded-xl px-4 py-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all placeholder-gray-500"
                />
             </div>
             <button 
               onClick={handleTopUp} 
               disabled={loading || !selectedAmount || (userPackageStatus.boughtSet.has(selectedAmount))}
               className={`
                 md:w-48 py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                 ${loading || !selectedAmount || userPackageStatus.boughtSet.has(selectedAmount) ? 'bg-slate-800 text-gray-500 cursor-not-allowed border border-slate-700' : 'gold-btn text-white hover:scale-[1.02]'}
               `}
             >
               {loading ? "Processing..." : (
                 <>
                   <span>Pay Now</span>
                   {selectedAmount && <span className="bg-black/20 px-2 py-0.5 rounded text-sm">${selectedAmount}</span>}
                 </>
               )}
             </button>
          </div>
        </div>

      </div>

      {/* Helper Modals */}
      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => { setSuccessModalOpen(false); onClose(); }}
        type="topup"
        userId={successData.userId}
        amount={successData.amount}
        reward={0}
      />

      <MessageModal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ ...messageModal, open: false })}
        title={messageModal.title}
        message={messageModal.message}
        type={messageModal.type}
      />
    </div>
  );
};

export default TopUpModal;