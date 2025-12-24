import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";

import {
  Home,
  Wallet,
  Banknote,
  History,
  Users,
  UserCircle2,
  LogOut,
  Menu,
  HelpCircle,
  BadgeDollarSign,
  BarChart,
  Bell,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

// ✅ Sidebar Item with optional notification badge
const SidebarItem = ({ label, icon: Icon, active, onClick, badge }) => (
  <div
    onClick={onClick}
    className={`relative flex items-center gap-2 bg-black px-3 py-2 cursor-pointer rounded-md font-medium text-white text-sm transition duration-200 ${
      active ? "bg-white/20 shadow-md" : "hover:bg-white/10"
    }`}
  >
    <Icon size={16} />
    <span>{label}</span>

    {badge > 0 && (
      <span className="absolute -top- -1 -right-0 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
        {badge}
      </span>
    )}
  </div>
);

const Sidebar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Fetch notification count every 15 seconds
  useEffect(() => {
    const fetchNotifCount = async () => {
      try {
        const res = await axios.get(
          `/api/admin/notifications/count/${user.userId}`
        );
        setNotifCount(res.data.count || 0);
      } catch (err) {
        console.log("Notification error", err);
      }
    };

    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 15000);
    return () => clearInterval(interval);
  }, [user.userId]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
  }, [isOpen]);


const downloadPDF = () => {
  const link = document.createElement("a");
  link.href = "/files/eliteinfinity.pdf";  // path relative to public folder
  link.download = "EliteInfinity.pdf"; // filename jo user ke paas download hoga
  link.click();
};


  const menuItems = [

    { label: "Download PDF", icon: Banknote, path: "#", onClick: downloadPDF },
    { label: "Spin Income", icon: BadgeDollarSign, path: "/spin-income" },

    { label: "Dashboard", icon: Home, path: "/dashboard" },
    { label: "Profile", icon: UserCircle2, path: "/profile" },
    { label: "Deposit History", icon: History, path: "/deposit-history" },
    { label: "Withdrawals", icon: Banknote, path: "/withdrawals" },
    { label: "Direct Team", icon: Users, path: "/direct-team" },
    { label: "All Team", icon: Users, path: "/all-team" },
    { label: "Top-Up Details", icon: BarChart, path: "/topup-details" },
    { label: "Wallet History", icon: History, path: "/wallet-history" },
    { label: "Downline Business", icon: BarChart, path: "/downline-business" },
    { label: "Credit To Wallet", icon: BadgeDollarSign, path: "/credit-to-wallet" },
    { label: "Direct Income", icon: Banknote, path: "/direct-income" },
    { label: "Level Income", icon: Banknote, path: "/level-income" },
    { label: "My Transfers", icon: History, path: "/my-transfers" },
    { label: "Transaction Details", icon: Wallet, path: "/transaction-details" },
    { label: "Notifications", icon: Bell, path: "/notifications", badge: notifCount },
    { label: "Support", icon: HelpCircle, path: "/support" },

 

  ];

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-50 bg-emerald-700 text-white p-2 rounded-md shadow-md"
      >
        <Menu size={20} />

        
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-56 z-40 flex flex-col bg-black text-white shadow-lg transform transition-transform duration-300 ease-in-out
          bg-[linear-gradient(135deg,_#2a9d8f,_#1f6f65)]
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col justify-between h-full">
          {/* User Info */}
          <div className="p-3 border-b border-white/20 text-center">
            <div
              onClick={() => {
                navigate("/profile");
                setIsOpen(false);
              }}
              className="w-12 h-12 mx-auto bg-white/30 rounded-full flex items-center justify-center text-white text-lg font-bold cursor-pointer"
            >
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <h3 className="mt-1 text-sm font-semibold">{user?.name}</h3>
            <p className="text-xs opacity-80">
              ID: <strong>{user?.userId}</strong>
            </p>
            <p className="text-xs opacity-80">
              Top-Up: <strong>${user?.topUpAmount || 0}</strong>
            </p>
          </div>

          {/* Menu Items - scrollable */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
  {menuItems.map((item) => (
    <SidebarItem
      key={item.path}
      label={item.label}
      icon={item.icon}
      badge={item.badge}
      active={location.pathname === item.path}
     onClick={() => {
  if (item.onClick) item.onClick();
  else navigate(item.path);
  setIsOpen(false);
}}

    />
  ))}
</nav>


          {/* Logout - fixed at bottom */}
          <div className="p-3 border-t border-white/20">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-md flex items-center justify-center gap-1 font-semibold text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
