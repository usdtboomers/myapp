import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ChevronDown, Menu, Bell, Home, UserCircle2, BadgeDollarSign, History, Banknote, Users, BarChart, Wallet, HelpCircle, LogOut } from "lucide-react";

// ✅ REAL IMPORTS (Jab aap apne project mein use karein to inhein uncomment karein)

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
import PackageWithdrawals from "../../components/dashboard/PackageWithdrawals";
import InstantWithdrawModal from "../../components/modals/InstantWithdrawModal"; 
import TopNav from "../../components/navbar/TopNav";
import BinarySummary from "../../components/dashboard/BinarySummary";
import WalletReminderModal from "../../components/modals/WalletReminderModal";

 

const Dashboard = () => {
  const { user, token, setUser, logout } = useAuth();
  const navigate = useNavigate(); 
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar state

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
    showInstantWithdraw: false, 
  });

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    userId: "",
    amount: 0,
  });

  const [showWalletReminder, setShowWalletReminder] = useState(false);
  const hasFetched = useRef(false);

  // Fetch user + income
  const fetchUserData = async () => {
    if (!token || !user?.userId) return;

    try {
       setLoading(true);
       const userRes = await axios.get(`http://178.128.20.53/api/user/${user.userId}`, { headers: { Authorization: `Bearer ${token}` } });
       const updatedUser = userRes.data.user;
       setUser(updatedUser); 
       setShowWalletReminder(!updatedUser.walletAddress);
       const incomeRes = await axios.get(`http://178.128.20.53/api/wallet/${user.userId}`, { headers: { Authorization: `Bearer ${token}` } });
       setIncome({ ...incomeRes.data });
    } catch (err) {
      console.error("Failed to fetch user or income:", err);
      if (err?.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
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
      await axios.put(
        `http://178.128.20.53/api/user/claim-daily/${user.userId}`,
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
    <div className="relative min-h-screen bg-[#0f172a] text-slate-200 overflow-x-hidden font-sans selection:bg-yellow-500/30">
      
      {/* --- PREMIUM STYLES --- */}
      <style>{`
        .bg-pattern {
            background-color: #0f172a;
            background-image: radial-gradient(#334155 1px, transparent 1px);
            background-size: 24px 24px;
        }
        /* Custom Scrollbar for dashboard */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {loading && <SpinnerOverlay />}
      
      {/* TopNav - Fixed at top */}
      <TopNav onHamburgerClick={() => setShowSidebar(true)} />

      {/* Main Layout Container */}
      <div className="pt-1 p-2 md:p-0 flex gap-1 h-screen box-border bg-pattern">
        
        {/* Sidebar */}
        <Sidebar user={user} isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-full overflow-y-auto pb-20 custom-scroll rounded-2xl   bg-slate-900/30 backdrop-blur-sm p-1 md:p-6 shadow-2xl lg:mt-2">
          
          {/* Welcome Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold text-white">
      Welcome back,{" "}
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
                onInstantWithdrawClick={() => setModalState((prev) => ({ ...prev, showInstantWithdraw: true }))}
                onSpinClick={() => navigate("/spin-income")}
              />
            </section>

            {/* Income Summary & Binary */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               <div className="bg-slate-800/40   p-1 h-full">
                  <IncomeSummary income={income} user={user} />
               </div>
               <div className="space-y-6">
                  <ReferralLink link={referralLink} />
                  <BinarySummary />
               </div>
            </div>

            {/* Withdrawals Table */}
            <section>
               <PackageWithdrawals />
            </section>

            {/* Daily ROI */}
            {user.dailyROI && user.dailyROI.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-green-500 rounded-full"></span> Active Investments
                </h3>
                <DailyROIPlan dailyROI={user.dailyROI} onClaim={claimDailyROI} />
              </section>
            )}
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
                spin: income.spinIncome,
              }}
              onClose={() => setModalState((prev) => ({ ...prev, showCreditToWallet: false }))}
              onSuccess={(amount) => handleTopUpSuccess(amount, user.userId)}
            />
          )}

          {/* Instant Withdraw Modal */}
          {modalState.showInstantWithdraw && (
            <InstantWithdrawModal
              userId={user.userId}
              onClose={() => setModalState((prev) => ({ ...prev, showInstantWithdraw: false }))}
            />
          )}

          {/* Wallet Reminder Modal */}
          <WalletReminderModal
            isOpen={showWalletReminder}
            onClose={() => setShowWalletReminder(false)}
          />

        </main>
      </div>
    </div>
  );
};

export default Dashboard;