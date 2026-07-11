import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios"; 
import { useNavigate } from "react-router-dom"; 
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/sidebar/Sidebar";
import IncomeSummary from "../../components/dashboard/IncomeSummary";
import ReferralLink from "../../components/dashboard/ReferralLink";
import WalletBalance from "../../components/dashboard/WalletBalance";
import QuickActions from "../../components/dashboard/QuickActions";
import DailyROIPlan from "../../components/dashboard/DailyROI";
import SpinnerOverlay from "../../components/common/SpinnerOverlay";
import Modals from "../../components/modals/Modals";
import SuccessModal from "../../components/modals/SuccessModal";
import TopUpModalWithInput from "../../components/modals/TopUpModalWithInput";
import CreditToWalletModal from "../../components/modals/CreditToWalletModal";
import TopNav from "../../components/navbar/TopNav";
import PreLaunchPromo from "../../components/PreLaunchPromo"; 
import TeamPromoPopup from "../../components/TeamPromoPopup"; 
import RewardProgress from "./RewardProgress"; 
import TelegramPopup from "../../components/TelegramPopup";
import { Send, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';

// =========================================================================
// 🔴🔴🔴 MAIN SWITCH FOR MAINTENANCE MODE 🔴🔴🔴
// =========================================================================
const IS_UNDER_MAINTENANCE = true; 
const MAINTENANCE_END_DATE = new Date("2026-07-13T18:30:00").getTime(); 
// =========================================================================

// --- Maintenance Screen Component (FIXED TEXT VISIBILITY) ---
const MaintenanceScreen = ({ logout }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = MAINTENANCE_END_DATE - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden selection:bg-yellow-500/30">
      <style>{`
        .bg-pattern-main {
            background-color: #020617; 
            background-image: radial-gradient(#334155 1px, transparent 1px);
            background-size: 24px 24px;
        }
      `}</style>
      
      <div className="absolute inset-0 bg-pattern-main opacity-50 z-0"></div>
      
      <div className="relative z-10 bg-[#0f172a] backdrop-blur-md p-8 md:p-12 rounded-2xl border border-yellow-500/30 text-center max-w-xl w-full shadow-[0_0_50px_rgba(234,179,8,0.15)]">
        <Loader2 className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>System Upgrade</h1>
        
        {/* 🔥 Fixed Text Color for Paragraph 🔥 */}
        <p className="mb-10 text-sm md:text-base leading-relaxed" style={{ color: '#e2e8f0' }}>
          We are currently upgrading our systems to bring you exciting new features and better performance. The dashboard will be back online in:
        </p>
        
        {/* Countdown Timer */}
        <div className="flex justify-center gap-3 sm:gap-6 mb-10">
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Mins', value: timeLeft.minutes },
            { label: 'Secs', value: timeLeft.seconds },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1e293b] rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-yellow-500 border border-slate-700 shadow-inner">
                {item.value.toString().padStart(2, '0')}
              </div>
              {/* 🔥 Fixed Text Color for Timer Labels 🔥 */}
              <span className="text-[10px] sm:text-xs mt-3 uppercase tracking-wider font-semibold" style={{ color: '#94a3b8' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        
        {/* 🔥 Fixed Text Color and Background for Button 🔥 */}
        <button 
          onClick={logout} 
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg border border-gray-600 hover:border-gray-400"
          style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
        >
          Logout Securely
        </button>
      </div>
    </div>
  );
};
// ---------------------------------------------------------


const Dashboard = () => {
  const { user, token, setUser, logout } = useAuth();
  const navigate = useNavigate(); 
  const [showSidebar, setShowSidebar] = useState(false); 

  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false); 
  
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState({ type: '', msg: '' });

  const [income, setIncome] = useState({
    directIncome: 0,
    levelIncome: 0,
    dailyIncome: 0,
    spinIncome: 0,
    availableSpins: 0,
  });

  const [modalState, setModalState] = useState({
    showDeposit: false,
    showWalletTransfer: false,
    showWithdrawalModal: false,
    showTopUpForm: false,
    showCreditToWallet: false,
   });

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    userId: "",
    amount: 0,
  });

   const hasFetched = useRef(false);
  const [recentTransactions, setRecentTransactions] = useState({ deposits: [], withdrawals: [] });

  const fetchUserData = async () => {
    if (IS_UNDER_MAINTENANCE) return;

    if (!token || !user?.userId) return;
    try {
        setLoading(true);
        const userRes = await api.get(`/user/${user.userId}`, { headers: { Authorization: `Bearer ${token}` } });
        setUser(userRes.data.user); 
 
        const incomeRes = await api.get(`/wallet/${user.userId}`, { headers: { Authorization: `Bearer ${token}` } });
        setIncome({
          directIncome: incomeRes.data.directIncome || 0,
          levelIncome: incomeRes.data.levelIncome || 0,
          dailyIncome: incomeRes.data.planIncome || 0,
          spinIncome: incomeRes.data.spinIncome || 0,
          rewardIncome: incomeRes.data.rewardIncome || 0,
          totalDirectIncome: incomeRes.data.income?.totalDirectIncome || 0,
          totalLevelIncome: incomeRes.data.income?.totalLevelIncome || 0,
          totalRewardIncome: incomeRes.data.income?.totalRewardIncome || 0,
          totalSpinIncome: incomeRes.data.income?.totalSpinIncome || 0,
        });

        const recentDepRes = await api.get(`/transactions/deposits/recent`, { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        
        const recentWithRes = await api.get(`/transactions/withdrawals/recent`, { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        
        setRecentTransactions({
           deposits: recentDepRes.data.deposits?.slice(0, 3) || [],
           withdrawals: recentWithRes.data.withdrawals?.slice(0, 3) || []
        });

    } catch (err) {
        console.error("Failed to fetch user data:", err);
        if (err?.response?.status === 401) logout();
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userId) {
        hasFetched.current = false;
    }
  }, [user?.userId]);

  useEffect(() => {
    if (!hasFetched.current && token && user?.userId) {
      hasFetched.current = true;
      fetchUserData();
    }
  }, [user?.userId, token]); 

  const handleTopUpSuccess = async (amount = 0, userId = "") => {
    await fetchUserData();
    setWalletRefreshKey((prev) => prev + 1);
    if (amount > 0) {
      setSuccessModal({ isOpen: true, userId, amount });
    }
  };

  const claimDailyROI = async (dayIndex) => {
    try {
      setLoading(true);
      await api.put(
        `/user/claim-daily/${user.userId}`,
        { dayIndex },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await handleTopUpSuccess();
    } catch (err) {
      console.error("Failed to claim Daily ROI:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = async () => {
      setVerifyLoading(true);
      setVerifyStatus({ type: '', msg: '' }); 
      try {
          const idToCheck = user?._id || user?.userId;
          const res = await api.get(`/user/${idToCheck}`);

          if (res.data.user.isTelegramJoined) {
              setVerifyStatus({ type: 'success', msg: 'Account Verified Successfully! ✅ Refreshing...' });
              setTimeout(() => window.location.reload(), 1500);
          } else {
              setVerifyStatus({ type: 'error', msg: "Verification failed! Please complete Step 1 & 2 first. ❌" });
          }
      } catch (error) {
          setVerifyStatus({ type: 'error', msg: 'Connection error. Please try again.' });
      } finally {
          setVerifyLoading(false);
      }
  };

  if (IS_UNDER_MAINTENANCE) {
    return <MaintenanceScreen logout={logout} />;
  }

  if (!user || !token) return <SpinnerOverlay />;

  const referralLink = `${window.location.origin}/register?ref=${user.userId}`;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden font-sans selection:bg-yellow-500/30">
      <style>{`
        .bg-pattern {
            background-color: #020617; 
            background-image: radial-gradient(#334155 1px, transparent 1px);
            background-size: 24px 24px;
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #020617; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {loading && <SpinnerOverlay />}
      
      <PreLaunchPromo />
      <TeamPromoPopup />

      <div className="relative z-[100000000]"> 
        <TopNav onHamburgerClick={() => setShowSidebar(true)} />
      </div>

      <div className="pt-1 p-2 md:p-0 flex gap-1 h-screen box-border bg-pattern">
        
        <Sidebar user={user} isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

        <main className="flex-1 w-full max-w-full overflow-y-auto pb-20 custom-scroll rounded-2xl bg-slate-900/40 backdrop-blur-md p-2 md:p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] lg:mt-2">
          
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div>
            <div className="flex flex-col items-start gap-1.5">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Welcome{" "}
                <span className="text-yellow-500 font-bold">
                  {user?.name || "User"}
                </span>
              </h1>
            </div>
          </div>
        </div>

          <div className="space-y-8">
            <section className="relative z-10">
               <WalletBalance userId={user.userId} refreshKey={walletRefreshKey} />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-yellow-500 rounded-full"></span> Quick Actions
              </h3>
              <QuickActions
                onDepositClick={() => setModalState((prev) => ({ ...prev, showDeposit: true }))}
                onTopUpClick={() => setModalState((prev) => ({ ...prev, showTopUpForm: true }))}
                onWalletTransferClick={() => setModalState((prev) => ({ ...prev, showWalletTransfer: true }))}
                onWithdrawClick={() => setModalState((prev) => ({ ...prev, showWithdrawalModal: true }))}
                onCreditToWalletClick={() => setModalState((prev) => ({ ...prev, showCreditToWallet: true }))}
                />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               <div className="bg-slate-800/40 p-1 rounded-xl h-full border border-slate-700/50">
               <IncomeSummary 
                   income={income} 
                   user={user} 
                 />
               </div>
               <div className="space-y-6">
                  <ReferralLink link={referralLink} />
               </div>

               <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-1 h-5 bg-green-500 rounded-full"></span> Recent Deposits
                      </h3>
                      <button 
                        onClick={() => navigate('/system-deposit-history')}
                        className="text-sm text-yellow-500 hover:text-yellow-400 underline"
                      >
                        View All
                      </button>
                    </div>
                    {!recentTransactions?.deposits || recentTransactions.deposits.length === 0 ? (
                      <p className="text-white text-sm">Waiting for live deposits...</p>
                    ) : (
                      <ul className="space-y-3">
                        {recentTransactions.deposits.slice(0, 5).map((dep, i) => (
                          <li key={i} className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2 hover:bg-slate-800/30 p-1 rounded transition-colors">
                            <div className="flex flex-col">
                              <span className="text-white">
                                {new Date(dep.createdAt).toLocaleDateString()} 
                              </span>
                              {dep.hash && (
                                <span className="text-blue-400/80 text-xs font-mono mt-0.5">
                                  {dep.hash.substring(0, 6)}...{dep.hash.substring(dep.hash.length - 4)}
                                </span>
                              )}
                            </div>
                            <span className="text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded">
                              + ${dep.amount}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-1 h-5 bg-red-500 rounded-full"></span> Recent Withdrawals
                      </h3>
                      <button 
                        onClick={() => navigate('/system-withdrawal-history')}
                        className="text-sm text-yellow-500 hover:text-yellow-400 underline"
                      >
                        View All
                      </button>
                    </div>
                    {!recentTransactions?.withdrawals || recentTransactions.withdrawals.length === 0 ? (
                      <p className="text-gray-400 text-sm">Waiting for live withdrawals...</p>
                    ) : (
                      <ul className="space-y-3">
                        {recentTransactions.withdrawals.slice(0, 5).map((withd, i) => (
                          <li key={i} className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2 hover:bg-slate-800/30 p-1 rounded transition-colors">
                            <div className="flex flex-col">
                              <span className="text-white">
                                {new Date(withd.createdAt).toLocaleDateString()} 
                              </span>
                              {withd.hash && (
                                <span className="text-blue-400/80 text-xs font-mono mt-0.5">
                                  {withd.hash.substring(0, 6)}...{withd.hash.substring(withd.hash.length - 4)}
                                </span>
                              )}
                            </div>
                            <span className="text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded">
                              - ${withd.amount}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
               </section>
            </div>

            <section>
                <DailyROIPlan dailyROI={user.dailyROI || []} onClaim={claimDailyROI} />
            </section>
           
           <section className="mt-8 bg-slate-800/20 rounded-2xl border border-slate-700/30 overflow-hidden">
             <RewardProgress />
           </section>
          </div>

          <Modals
            user={user}
            modalState={modalState}
            setModalState={setModalState}
            setUser={setUser}
            onTopUpSuccess={handleTopUpSuccess}
          />

          <SuccessModal
            isOpen={successModal.isOpen}
            userId={successModal.userId}
            amount={successModal.amount}
            onClose={() => setSuccessModal((prev) => ({ ...prev, isOpen: false }))}
          />

          {modalState.showTopUpForm && (
            <TopUpModalWithInput
              onClose={() => setModalState((prev) => ({ ...prev, showTopUpForm: false }))}
              onTopUpSuccess={(amount) => handleTopUpSuccess(amount, user.userId)}
            />
          )}

          {modalState.showCreditToWallet && (
            <CreditToWalletModal
              userId={user.userId}
              balances={{
                direct: income.directIncome,
                level: income.levelIncome,
                reward: income.rewardIncome 
              }}
              onClose={() => setModalState((prev) => ({ ...prev, showCreditToWallet: false }))}
              onSuccess={(amount) => handleTopUpSuccess(amount, user.userId)}
            />
          )}

        </main>
      </div>

      {!loading && user && <TelegramPopup currentUser={user} />}
      
    </div>
  );
};

export default Dashboard;