import React, { useState, useEffect } from "react";
import api from '../api/userAxios'; 
import Confetti from "react-confetti";

import { useAuth } from '../context/AuthContext';
import SuccessModal from './modals/SuccessModal';
import MessageModal from './modals/MessageModal';

const PreLaunchPromo = () => {
  const { user, token, login } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [transactionPassword, setTransactionPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState({ userId: "", amount: 0 });
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "", type: "info" });

  const showMessage = (title, message, type = "info") => setMessageModal({ open: true, title, message, type });

  // 🟢 CHECK: Agar user ne topup nahi kiya hai, tabhi popup dikhao
  useEffect(() => {
    if (user) {
      // Agar topUpAmount 0 hai ya undefined hai, matlab id inactive hai
      const isInactive = !user.topUpAmount || user.topUpAmount === 0;
      if (isInactive) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }
  }, [user]);

  const handleFreeTopUp = async () => {
    if (!transactionPassword) {
      return showMessage("Error", "❌ Please enter your Transaction Password.", "error");
    }

    setLoading(true);
    try {
      // ⚠️ IMPORTANT: Backend API call. 
      // (Backend me bhi ensure karna ki is API route pe free topup allow ho pre-launch tak)
      await api.put(
        `/user/topup/${user.userId}`,
        { amount: 10, transactionPassword, isPromoFree: true }, // isPromoFree flag bheja hai
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Success Data Set karo
      setSuccessData({ userId: user.userId, amount: 10 });
      setIsOpen(false); // Popup band karo
      setSuccessModalOpen(true); // Success Modal kholo

      // User data refresh karo taaki topup update ho jaye aur popup dubara na aaye
      const refreshedRes = await api.get(`/user/${user.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      login(refreshedRes.data.user, token);

    } catch (err) {
      console.error('Free Top-up Error:', err);
      const msg = err.response?.data?.message || "❌ Failed to activate free ID";
      showMessage("Error", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Agar popup open nahi hai aur success modal bhi open nahi hai, to kuch mat dikhao
  if (!isOpen && !successModalOpen) return null;

  return (
    <>
      {/* 🔴 SUCCESS MODAL (Wahi same topup wala modal) */}
      {successModalOpen && (
        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          type="topup"
          userId={successData.userId}
          amount={successData.amount}
          reward={0}
        />
      )}

      {/* 🔴 MESSAGE MODAL (For errors) */}
      <MessageModal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ ...messageModal, open: false })}
        title={messageModal.title}
        message={messageModal.message}
        type={messageModal.type}
      />

      {/* 🔴 PRE-LAUNCH PROMO POPUP */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm p-4">
          <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={200} gravity={0.1} style={{ position: 'absolute', zIndex: 0 }} />
          
          <div className="relative z-10 bg-slate-900 border-2 border-yellow-500 rounded-2xl w-full max-w-md p-6 shadow-[0_0_40px_rgba(234,179,8,0.3)] text-center">
            
            {/* Tag */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black font-black px-4 py-1 rounded-full text-sm tracking-widest shadow-lg">
              LIMITED TIME OFFER
            </div>

            <img src="/usdtboomer.png" alt="Logo" className="h-16 mx-auto mt-4 mb-2 animate-bounce" />
            
            <h2 className="text-2xl font-bold text-white mb-2">
              🎉 Pre-Launch Mega Offer 🎉
            </h2>
            
            <p className="text-gray-300 text-sm mb-4">
              Valid only until <strong className="text-yellow-400">30th April</strong>! Activate your ID absolutely FREE and start your journey.
            </p>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
              <h3 className="text-white font-bold text-lg mb-1">🎁 FREE $10 Package</h3>
              <p className="text-xs text-white mb-4">Enter your transaction password below to claim your free ID activation instantly.</p>
              
              <input
                type="password"
                placeholder="Enter Transaction Password"
                value={transactionPassword}
                onChange={(e) => setTransactionPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-600 text-black rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 text-center font-mono"
              />
            </div>

            <button
              onClick={handleFreeTopUp}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-lg text-black transition-all ${
                loading ? "bg-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:scale-105 shadow-lg shadow-yellow-600/50"
              }`}
            >
              {loading ? "Activating..." : "CLAIM FREE TOP-UP NOW"}
            </button>
            
          </div>
        </div>
      )}
    </>
  );
};

export default PreLaunchPromo;