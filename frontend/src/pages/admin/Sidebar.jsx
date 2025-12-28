import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaHome,
  FaUsers,
  FaMoneyBill,
  FaWallet,
  FaListAlt,
  FaCog,
  FaSignOutAlt,
  FaSitemap,
  FaProjectDiagram,
  FaExchangeAlt,
  FaFileAlt,
  FaUserPlus,
  FaArrowCircleUp,
  FaArrowCircleDown,
  FaBell,
  FaClipboardList,
  FaCoins,
  FaUserSlash,
  FaBars, 
  FaTimes, 
} from 'react-icons/fa';

const Sidebar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // Default BAND rahega

  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded hover:bg-indigo-200 ${
      isActive ? 'bg-indigo-600 text-white' : 'text-gray-800'
    }`;

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin-login');
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* 🟢 HAMBURGER BUTTON (Hamesha Dikhega jab sidebar band hai) */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 60, // Sabse upar
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#4f46e5' // Indigo color
          }}
        >
          <FaBars />
        </button>
      )}

      {/* ⚫ OVERLAY (Background kaala karne ke liye) */}
      {isOpen && (
        <div 
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40
          }}
        ></div>
      )}

      {/* 🚪 MAIN SIDEBAR (Direct CSS Logic) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: '260px', // Thoda chauda
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          zIndex: 50,
          // 🔥 MAGIC LINE: Ye andar-bahar karega
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out', // Smooth Animation
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isOpen ? '4px 0 15px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <div className="flex-1 overflow-y-auto p-4 custom-scroll">
          
          {/* Header inside Sidebar */}
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-indigo-600">Admin Panel</h2>
            <button 
              onClick={toggleSidebar} 
              className="text-gray-500 hover:text-red-500 text-2xl"
            >
              <FaTimes />
            </button>
          </div>

          <nav className="space-y-2">
            <NavLink to="/admin" end className={linkClass} onClick={toggleSidebar}>
              <FaHome className="inline-block mr-2" /> Dashboard
            </NavLink>

            <NavLink to="/admin/users" className={linkClass} onClick={toggleSidebar}>
              <FaUsers className="inline-block mr-2" /> All Users
            </NavLink>
            <NavLink to="/admin/blocked-users" className={linkClass} onClick={toggleSidebar}>
              <FaUserSlash className="inline-block mr-2" /> Blocked Users
            </NavLink>

            <NavLink to="/admin/notifications" className={linkClass} onClick={toggleSidebar}>
              <FaBell className="inline-block mr-2" /> Notifications
            </NavLink>

            <NavLink to="/admin/topups" className={linkClass} onClick={toggleSidebar}>
              <FaArrowCircleUp className="inline-block mr-2" /> Top-Ups
            </NavLink>
            <NavLink to="/admin/deposits" className={linkClass} onClick={toggleSidebar}>
              <FaMoneyBill className="inline-block mr-2" /> Deposit Log
            </NavLink>
            <NavLink to="/admin/withdrawals/request" className={linkClass} onClick={toggleSidebar}>
              <FaArrowCircleDown className="inline-block mr-2" /> Withdrawal Req
            </NavLink>
            <NavLink to="/admin/withdrawals/all" className={linkClass} onClick={toggleSidebar}>
              <FaClipboardList className="inline-block mr-2" /> All Withdrawals
            </NavLink>

            <NavLink to="/admin/direct-income" className={linkClass} onClick={toggleSidebar}>
              <FaProjectDiagram className="inline-block mr-2" /> Direct Income
            </NavLink>
            <NavLink to="/admin/level-income" className={linkClass} onClick={toggleSidebar}>
              <FaSitemap className="inline-block mr-2" /> Level Income
            </NavLink>
            <NavLink to="/admin/spin-income" className={linkClass} onClick={toggleSidebar}>
              <FaCoins className="inline-block mr-2" /> Spin Income
            </NavLink>

            <NavLink to="/admin/manual-deposit" className={linkClass} onClick={toggleSidebar}>
              <FaCoins className="inline-block mr-2" /> Manual Deposit
            </NavLink>

            <NavLink to="/admin/support" className={linkClass} onClick={toggleSidebar}>
              <FaFileAlt className="inline-block mr-2" /> Support
            </NavLink>

            <NavLink to="/admin/wallet-summary" className={linkClass} onClick={toggleSidebar}>
              <FaWallet className="inline-block mr-2" /> Wallet Summary
            </NavLink>
            <NavLink to="/admin/credit-to-wallet" className={linkClass} onClick={toggleSidebar}>
              <FaCoins className="inline-block mr-2" /> Credit Wallet
            </NavLink>
            <NavLink to="/admin/transactions" className={linkClass} onClick={toggleSidebar}>
              <FaListAlt className="inline-block mr-2" /> Transactions
            </NavLink>
            <NavLink to="/admin/transactions/reverse" className={linkClass} onClick={toggleSidebar}>
              <FaExchangeAlt className="inline-block mr-2" /> Reverse Txn
            </NavLink>

            <NavLink to="/admin/add-user" className={linkClass} onClick={toggleSidebar}>
              <FaUserPlus className="inline-block mr-2" /> Add User
            </NavLink>

            <NavLink to="/admin/settings" className={linkClass} onClick={toggleSidebar}>
              <FaCog className="inline-block mr-2" /> Settings
            </NavLink>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-3 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition font-semibold"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;