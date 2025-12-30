import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import api from './api/axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import RequireUserAuth from './components/RequireUserAuth';
import RequireAdminAuth from './components/RequireAdminAuth';

// 🔹 Public Pages
import Home from './pages/auth/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MaintenancePage from './pages/error/MaintenancePage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword'; // 👈 Import karein
// 🔹 User Pages
import Dashboard from './pages/user/Dashboard';
import Settings from './pages/user/Settings';
import UserProfile from './pages/user/UserProfile';
import UserWithdrawalHistory from './pages/user/UserWithdrawalHistory';
import WalletHistory from './pages/user/WalletHistory';
import AllTeamPage from './pages/user/AllTeamPage';
import AllTeamTreePage from './pages/user/AllTeamTreePage';
import DirectTeamPage from './pages/user/DirectTeamPage';
import DirectIncome from './pages/user/DirectIncome';
import LevelIncome from './pages/user/LevelIncome';
import DailyROIIncome from './components/dashboard/DailyROI';
import MyTransfers from './pages/user/MyTransfers';
import DepositHistory from "./pages/user/DepositHistory";
import TopupDetails from "./pages/user/TopupDetails";
import Support from "./pages/user/Support";
import SpinIncome from './pages/user/SpinIncome';
import TransactionDetails from './pages/user/TransactionDetails';
import DownlineBusiness from './pages/user/DownlineBusiness';
import CreditToWallet from './pages/user/CreditToWallet';
import Notifications from "./pages/user/Notifications";

import UserLayout from "./components/layout/UserLayout";

// 🔹 Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Admin';
import UserListTable from './pages/admin/UserListTable';
import DepositTable from './pages/admin/DepositTable';
import AdminTransactions from './pages/admin/AdminTransactions';
import TotalTopUpPage from './pages/admin/TotalTopUpPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import RequestWithdrawalPage from './pages/admin/RequestWithdrawalPage';
import AllWithdrawalsPage from './pages/admin/AllWithdrawalsPage';
import DirectIncomePage from './pages/admin/DirectIncomePage';
import LevelIncomePage from './pages/admin/LevelIncomePage';
import WalletSummaryPage from './pages/admin/WalletSummaryPage';
import CreditToWalletPage from './pages/admin/CreditToWallet';
import BlockedUsers from "./pages/admin/BlockedUsers";
import ReverseTransaction from './pages/admin/ReverseTransaction';
import AddUser from './pages/admin/AddUser';
import AdminNotifications from './pages/admin/AdminCreateNotification.jsx';
import AdminSupport from "./pages/admin/AdminSupport";
import ManualDeposit from './pages/admin/ManualDeposit';
import AdminSpinIncome from './pages/admin/SpinIncomePage';

// 📜 Scroll Restoration
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
};

function AppContent() {
  const location = useLocation();
  const path = location.pathname;
  const [maintenance, setMaintenance] = useState(false);
  const [checked, setChecked] = useState(false);
  const [whitelist, setWhitelist] = useState([]);

  const isAdmin = !!localStorage.getItem('adminToken');
  
  // 🔥 UPDATE 1: Logic me 'super-panal' kar diya taaki maintenance me access mile
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/super-panal') || path === '/community-access';
  
  const isPublicPath = ['/', '/login', '/register'].includes(path);

  useEffect(() => {
    api.get('/setting/public')
      .then((res) => {
        setMaintenance(res.data.maintenanceMode);
        setWhitelist(res.data.maintenanceWhitelist || []);
      })
      .catch((err) => {
        console.error('⚠️ Maintenance fetch failed:', err);
        setMaintenance(false);
        setWhitelist([]);
      })
      .finally(() => setChecked(true));
  }, []);

  // ✅ Current logged-in user ID
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.userId;

  // ✅ Check if user is allowed during maintenance
  const isAllowed = !maintenance || isPublicPath || isAdmin || isAdminPath || whitelist.includes(currentUserId);

  if (!checked) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div>
        <p className="text-slate-400 text-sm">Loading settings...</p>
      </div>
    </div>
  );

  if (!isAllowed) return <MaintenancePage />;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-yellow-500/30">
      <style>{`
        body { background-color: #0f172a; margin: 0; }
        .bg-pattern {
            background-color: #0f172a;
            background-image: radial-gradient(#334155 1px, transparent 1px);
            background-size: 24px 24px;
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      <div className="bg-pattern min-h-screen">
        <ScrollToTop />
        <Routes>
          {/* 🌐 Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />  {/* 👈 Yeh line add karein */}

          {/* 🔐 User Routes */}
          <Route path="/dashboard" element={<RequireUserAuth><UserLayout><Dashboard /></UserLayout></RequireUserAuth>} />
          <Route path="/dashboard/:userId" element={<RequireUserAuth><UserLayout><Dashboard /></UserLayout></RequireUserAuth>} />
          <Route path="/settings" element={<RequireUserAuth><UserLayout><Settings /></UserLayout></RequireUserAuth>} />
          <Route path="/profile" element={<RequireUserAuth><UserLayout><UserProfile /></UserLayout></RequireUserAuth>} />
          <Route path="/withdrawals" element={<RequireUserAuth><UserLayout><UserWithdrawalHistory /></UserLayout></RequireUserAuth>} />
          <Route path="/notifications" element={<RequireUserAuth><UserLayout><Notifications/></UserLayout></RequireUserAuth>} />
          <Route path="/wallet-history" element={<RequireUserAuth><UserLayout><WalletHistory /></UserLayout></RequireUserAuth>} />
          <Route path="/direct-team" element={<RequireUserAuth><UserLayout><DirectTeamPage /></UserLayout></RequireUserAuth>} />
          <Route path="/all-team" element={<RequireUserAuth><UserLayout><AllTeamPage /></UserLayout></RequireUserAuth>} />
          <Route path="/team-tree" element={<RequireUserAuth><UserLayout><AllTeamTreePage /></UserLayout></RequireUserAuth>} />
          <Route path="/direct-income" element={<RequireUserAuth><UserLayout><DirectIncome /></UserLayout></RequireUserAuth>} />
          <Route path="/level-income" element={<RequireUserAuth><UserLayout><LevelIncome /></UserLayout></RequireUserAuth>} />
          <Route path="/daily-roi" element={<RequireUserAuth><UserLayout><DailyROIIncome /></UserLayout></RequireUserAuth>} />
          <Route path="/my-transfers" element={<RequireUserAuth><UserLayout><MyTransfers /></UserLayout></RequireUserAuth>} />
          <Route path="/deposit-history" element={<RequireUserAuth><UserLayout><DepositHistory /></UserLayout></RequireUserAuth>} />
          <Route path="/topup-details" element={<RequireUserAuth><UserLayout><TopupDetails /></UserLayout></RequireUserAuth>} />
          <Route path="/support" element={<RequireUserAuth><UserLayout><Support /></UserLayout></RequireUserAuth>} />
          <Route path="/spin-income" element={<RequireUserAuth><UserLayout><SpinIncome /></UserLayout></RequireUserAuth>} />
          <Route path="/transaction-details" element={<RequireUserAuth><UserLayout><TransactionDetails /></UserLayout></RequireUserAuth>} />
          <Route path="/downline-business" element={<RequireUserAuth><UserLayout><DownlineBusiness /></UserLayout></RequireUserAuth>} />
          <Route path="/credit-to-wallet" element={<RequireUserAuth><UserLayout><CreditToWallet /></UserLayout></RequireUserAuth>} />


          {/* 🔐 Admin Routes */}
          
          {/* Login Path */}
          <Route path="/community-access" element={<AdminLogin />} />

           {/* 🔥 UPDATE 2: Route path ko '/super-panal' kar diya */}
           <Route path="/super-panal" element={<RequireAdminAuth><AdminLayout /></RequireAdminAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserListTable />} />
            <Route path="topups" element={<TotalTopUpPage />} />
            <Route path="deposits" element={<DepositTable />} />
            <Route path="withdrawals/request" element={<RequestWithdrawalPage />} />
            <Route path="withdrawals/all" element={<AllWithdrawalsPage />} />
            <Route path="direct-income" element={<DirectIncomePage />} />
            
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="level-income" element={<LevelIncomePage />} />
            <Route path="wallet-summary" element={<WalletSummaryPage />} />
            <Route path="spin-income" element={<AdminSpinIncome />} />
            <Route path="credit-to-wallet" element={<CreditToWalletPage />} />
            <Route path="blocked-users" element={<BlockedUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="transactions/reverse" element={<ReverseTransaction />} />
            
            <Route path="add-user" element={<AddUser />} />
            <Route path="manual-deposit" element={<ManualDeposit />} />
            <Route path="support" element={<AdminSupport />} />
          </Route>

          {/* 🚧 Fallback */}
          <Route path="*" element={<Navigate to={maintenance ? '/maintenance' : '/'} />} />
        </Routes>
      </div>
    </div>
  );
}

function AppWithAuthReady() {
  const { ready } = useAuth();
  if (!ready) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div>
        <p className="text-slate-400 text-sm">Loading authentication...</p>
      </div>
    </div>
  );
  return <AppContent />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppWithAuthReady />
      </Router>
    </AuthProvider>
  );
}