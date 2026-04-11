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
// ✅ 1. ADDED: PreLaunchPromo Import Kiya
import PreLaunchPromo from '../../components/PreLaunchPromo';


const Dashboard = () => {
  const { user, token, setUser, logout } = useAuth();
  const navigate = useNavigate(); 
  const [showSidebar, setShowSidebar] = useState(false); 

  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const [showWalletReminder, setShowWalletReminder] = useState(false);
  const hasFetched = useRef(false);

  const [recentTransactions, setRecentTransactions] = useState({ deposits: [], withdrawals: [] });

  const fetchUserData = async () => {
    if (!token || !user?.userId) return;
    try {
        setLoading(true);
        // 1. User details fetch karna
        const userRes = await api.get(`/user/${user.userId}`, { headers: { Authorization: `Bearer ${token}` } });
        setUser(userRes.data.user); 
        setShowWalletReminder(!userRes.data.user.walletAddress);

        // 2. Wallet/Income fetch karna
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!user || !token) return <SpinnerOverlay />;

  const referralLink = `${window.location.origin}/register?ref=${user.userId}`;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden font-sans selection:bg-yellow-500/30">
      
      {/* --- PREMIUM STYLES --- */}
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
      
      {/* ✅ 2. ADDED: Free Topup Popup (Agar ID inactive hai toh ye aage aayega) */}
      <PreLaunchPromo />

      {/* TopNav - Fixed at top */}
      <TopNav onHamburgerClick={() => setShowSidebar(true)} />

      {/* Main Layout Container */}
      <div className="pt-1 p-2 md:p-0 flex gap-1 h-screen box-border bg-pattern">
        
        {/* Sidebar */}
        <Sidebar user={user} isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-full overflow-y-auto pb-20 custom-scroll rounded-2xl bg-slate-900/40 backdrop-blur-md p-2 md:p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] lg:mt-2">
          
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Welcome {" "}
                <span className="text-yellow-500 font-bold">
                  {user?.name || "User"}
                </span>
              </h1>
            </div>
          </div>

          <div className="space-y-8">
            {/* Wallet Balance */}
            <section className="relative z-10">
               <WalletBalance userId={user.userId} refreshKey={walletRefreshKey} />
            </section>

            {/* Quick Actions */}
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

            {/* Income Summary & Binary */}
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

               {/* RECENT DEPOSITS & WITHDRAWALS PREVIEW */}
               <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Deposits Preview */}
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
                                <span className="text-slate-500 text-xs ml-2">
                                  {new Date(dep.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
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

                  {/* Withdrawals Preview */}
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
                                <span className="text-slate-500 text-xs ml-2">
                                  {new Date(withd.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
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
           
          </div>

          {/* General Modals */}
          <Modals
            user={user}
            modalState={modalState}
            setModalState={setModalState}
            setUser={setUser}
            onTopUpSuccess={handleTopUpSuccess}
          />

          {/* Success Modal */}
          <SuccessModal
            isOpen={successModal.isOpen}
            userId={successModal.userId}
            amount={successModal.amount}
            onClose={() => setSuccessModal((prev) => ({ ...prev, isOpen: false }))}
          />

          {/* TopUp Modal */}
          {modalState.showTopUpForm && (
            <TopUpModalWithInput
              onClose={() => setModalState((prev) => ({ ...prev, showTopUpForm: false }))}
              onTopUpSuccess={(amount) => handleTopUpSuccess(amount, user.userId)}
            />
          )}

          {/* Credit to Wallet Modal */}
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
    </div>
  );
};

export default Dashboard;