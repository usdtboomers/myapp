import React, { useState, useEffect } from "react";
import api from "api/axios";

// ----------------------------------------------------------------------
// ✅ REAL IMPORTS (Jab aap apne project mein use karein to inhein uncomment karein)
// ----------------------------------------------------------------------
import SuccessModal from "./SuccessModal";
import MessageModal from "./MessageModal";
import { useAuth } from "../../context/AuthContext";

// --- CONFIGURATION ---
const packages = [10, 25, 50, 100, 200, 500, 1000];
const packageNames = {
  10: "Bronze",
  25: "Silver",
  50: "Gold",
  100: "Platinum",
  200: "Diamond",
  500: "Elite",
  1000: "Infinity",
};

// UI Details for cards
const packageDetails = {
  10: {
    title: "Plan 1",
    subtitle: "Bronze",
    features: ["Daily Income", "Duration: 10 Days", "24/7 Support"],
  },
  25: {
    title: "Plan 2",
    subtitle: "Silver",
    features: ["Daily Income", "Duration: 10 Days", "Silver Badge"],
  },
  50: {
    title: "Plan 3",
    subtitle: "Gold",
    features: [
      "Higher Daily Income",
      "Duration: 10 Days",
       "Gold Badge",    ],
  },
  100: {
    title: "Plan 4",
    subtitle: "Platinum",
    isPopular: true,
    features: [
      "Higher Daily Income",
      "Duration: 10 Days",
       "Platinum Badge",
     ],
  },
  200: {
    title: "Plan 5",
    subtitle: "Diamond",
    features: [
      "Maximum Daily Income",
      "Duration: 10 Days",
      "Diamond Badge",
     ],
  },
  500: {
    title: "Plan 6",
    subtitle: "Elite",
    features: [
      "Maximum Daily Cap",
      "Duration: 10 Days",
      "Elite Badge",
     ],
  },
  1000: {
    title: "Plan 7 (VIP)",
    subtitle: "Infinity",
    isVip: true,
    features: [
      "Ultimate Daily Cap",
      "Duration: 10 Days",
      "Infinity Badge",
      "All Bonuses Unlocked",
      "Priority Instant Withdrawals",
      " VIP Support Manager",
      "Exclusive Events Access",
    ],
  },
};



const TopUpModal = ({ onClose, onTopUpSuccess }) => {
  // --- STATE & AUTH ---
  const { user: loggedInUser, token, login } = useAuth();
  const [userId, setUserId] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [walletBalance, setWalletBalance] = useState(null);
  const [transactionPassword, setTransactionPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const isPromoUser = loggedInUser?.role === "promo";

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState({ userId: "", name: "", amount: 0 });
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "", type: "info" });

  const showMessage = (title, message, type = "info") => setMessageModal({ open: true, title, message, type });

  // --- LOGIC: Fetch Balance ---
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

  // --- LOGIC: Fetch User ---
  const fetchUser = async () => {
    try {
      const res = await api.get(`/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserInfo(res.data.user);
    } catch {
       showMessage("Error", "❌ User not found", "error");
       setUserInfo(null);
    }
  };

  // --- LOGIC: Handle Top Up ---
  const handleTopUp = async () => {
    if (!userInfo) return showMessage("Error", "❌ Please fetch user first.", "error");

    if (!transactionPassword)
      return showMessage("Error", "❌ Enter transaction password.", "error");

    if (!isPromoUser && walletBalance < selectedAmount)
      return showMessage(
        "Error",
        `❌ Insufficient balance. You have $${walletBalance}`,
        "error"
      );

    // 🔹 PACKAGE RESTRICTIONS — SKIP FOR PROMO USERS
    if (!isPromoUser) {
      const currentTopUp = userInfo.topUpAmount || 0;
      const validNextPackages = packages.filter((pkg) => pkg > currentTopUp);
      const expectedNext = validNextPackages[0];

      if (selectedAmount < currentTopUp) return showMessage("Error", "❌ Cannot downgrade package.", "error");
      if (selectedAmount !== expectedNext) return showMessage("Error", `❌ Next allowed package is $${expectedNext}.`, "warning");
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
      
      {/* CSS Injection for Styles */}
      <style>{`
        .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:hover {
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
        /* Custom Scrollbar */
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
      <div className="bg-pattern w-full max-w-5xl h-full max-h-[85vh] flex flex-col rounded border border-slate-700 shadow-2xl overflow-hidden relative">
        
        {/* Header (Fixed) */}
        <div className="bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center z-20 shrink-0">
          <div>
             <h2 className="text-blue-400 font-bold tracking-widest uppercase text-[10px] md:text-xs">Premium Plans</h2>
             <h1 className="text-xl md:text-2xl font-bold text-white">Topup <span className="gold-text">Zone</span></h1>
          </div>
          <button onClick={onClose} className="group bg-slate-800 hover:bg-red-500/20 p-2 rounded-full transition-all border border-slate-700 hover:border-red-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content (min-h-0 added for scroll fix) */}
        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 p-4 md:p-6 space-y-6">
          
          {/* 1. Control Panel (User & Wallet) */}
          <div className="glass-card p-4 md:p-6 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
               {/* Wallet */}
               <div className="md:col-span-3 bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <span className="text-gray-400 text-xs block uppercase tracking-wider">Your Balance</span>
                  <div className="text-2xl font-bold text-white text-emerald-400 font-mono">
                    {walletBalance !== null ? `$${walletBalance}` : "Loading..."}
                  </div>
               </div>

               {/* User Input */}
               <div className="md:col-span-5 flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="number" 

                      placeholder="User ID (e.g. 123)"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-600 text-black rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-600 font-mono"
                    />
                  </div>
                  <button onClick={fetchUser} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20">
                    Fetch
                  </button>
               </div>

               {/* User Info Display */}
               <div className="md:col-span-4">
                 {userInfo ? (
                   <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-sm">{userInfo.name}</div>
                        <div className="text-xs text-gray-400">ID: {userInfo.userId}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 uppercase">Current</div>
                        <div className="text-green-400 font-bold text-sm">
                           {userInfo.topUpAmount ? `${packageNames[userInfo.topUpAmount] || ''} ($${userInfo.topUpAmount})` : "None"}
                        </div>
                      </div>
                   </div>
                 ) : (
                   <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center text-gray-500 text-sm">
                     Target user details will appear here
                   </div>
                 )}
               </div>
            </div>
          </div>

          {/* 2. Packages Grid */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full"></div>
              <h3 className="text-white text-lg font-bold">Select a Plan</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkgAmount) => {
                const details = packageDetails[pkgAmount];
                const isSelected = selectedAmount === pkgAmount;
                const isVip = details.isVip;
                const isPopular = details.isPopular;

                return (
                  <div 
                    key={pkgAmount}
                    onClick={() => setSelectedAmount(pkgAmount)}
                    className={`
                      glass-card relative rounded-2xl p-5 cursor-pointer group select-none
                      ${isSelected ? 'selected' : ''}
                      ${isVip ? 'md:col-span-2 lg:col-span-2 bg-gradient-to-br from-blue-900/20 to-purple-900/20' : ''}
                      ${isPopular ? 'bg-yellow-900/10 border-yellow-500/30' : ''}
                    `}
                  >
                    {isPopular && (
                      <div className="absolute top-0 right-0">
                         <div className="bg-yellow-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg">POPULAR</div>
                      </div>
                    )}
                    {pkgAmount === 10 && !isPopular && (
                       <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg">STARTER</div>
                    )}

                    {isVip ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between h-full gap-4">
                        <div className="text-left">
                           <h3 className="text-white text-xl font-bold">{details.title}</h3>
                           <div className="text-4xl font-extrabold gold-text my-1">${pkgAmount}</div>
                           <p className="text-gray-400 text-xs">{details.subtitle}</p>
                        </div>
                        <div className="w-full sm:w-auto">
                            <ul className="text-gray-300 text-xs space-y-1.5 mb-3">
                              {details.features.map((feat, i) => (
                                <li key={i} className="flex items-center"><span className="text-purple-400 mr-2">★</span> {feat}</li>
                              ))}
                            </ul>
                            <div className={`text-center py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${isSelected ? 'bg-green-500 text-white' : 'bg-slate-800 text-gray-400 group-hover:bg-slate-700'}`}>
                               {isSelected ? '✓ Plan Selected' : 'Click to Select'}
                            </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <h3 className={`text-lg font-medium mb-1 ${isPopular ? 'gold-text' : 'text-gray-300'}`}>{details.title}</h3>
                        <div className="text-3xl font-bold text-white mb-1">${pkgAmount}</div>
                        <p className={`text-xs mb-4 ${isPopular ? 'text-yellow-500/70' : 'text-gray-500'}`}>{details.subtitle}</p>
                        
                        <ul className={`text-xs space-y-2 mb-5 text-left pl-2 ${isPopular ? 'text-gray-300' : 'text-gray-400'}`}>
                           {details.features.map((feat, i) => (
                             <li key={i} className="flex items-center">
                               <span className={`${isPopular ? 'text-yellow-400' : 'text-green-400'} mr-2`}>✓</span> {feat}
                             </li>
                           ))}
                        </ul>
                        
                        <div className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${isSelected ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : (isPopular ? 'gold-btn text-white' : 'border border-slate-600 text-gray-400 group-hover:border-blue-500 group-hover:text-blue-400')}`}>
                           {isSelected ? 'Selected' : 'Select'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer (Payment Action) */}
        <div className="bg-[#0f172a] border-t border-slate-800 p-4 md:p-6 shrink-0 z-20">
          <div className="flex flex-col md:flex-row items-stretch gap-4">
             <div className="flex-1 relative">
                <input
                  type="password"
                  placeholder="Enter Transaction Password"
                  value={transactionPassword}
                  onChange={(e) => setTransactionPassword(e.target.value)}
                  className="w-full h-full bg-slate-900 border border-slate-700 text-balck rounded-xl px-4 py-3 md:py-0 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all placeholder-gray-600"
                />
             </div>
             <button 
               onClick={handleTopUp} 
               disabled={loading}
               className={`
                 md:w-64 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                 ${loading ? 'bg-slate-700 text-gray-400 cursor-not-allowed' : 'gold-btn text-white hover:scale-[1.02] active:scale-[0.98]'}
               `}
             >
               {loading ? (
                 <>Processing...</>
               ) : (
                 <>
                   <span>Pay Now</span>
                   <span className="bg-black/10 px-2 py-0.5 rounded text-sm">${selectedAmount}</span>
                 </>
               )}
             </button>
          </div>
          <div className="text-center mt-3 text-xs text-gray-600">
             Secure SSL Payment  
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