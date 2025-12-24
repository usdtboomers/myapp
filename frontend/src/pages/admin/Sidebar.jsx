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
  FaLock,
  FaFileAlt,
  FaUserPlus,
  FaArrowCircleUp,
  FaArrowCircleDown,
  FaBell,
  FaClipboardList,
  FaCoins,
  FaUserSlash, // 👤🚫 new icon for Blocked Users
} from 'react-icons/fa';

const Sidebar = () => {
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded hover:bg-indigo-200 ${
      isActive ? 'bg-indigo-600 text-white' : 'text-gray-800'
    }`;

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin-login');
  };

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-white border-r flex flex-col z-50">
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xl font-bold mb-6 text-indigo-600">Admin Panel</h2>
        <nav className="space-y-2">
          <NavLink to="/admin" end className={linkClass}>
            <FaHome className="inline-block mr-2" />
            Dashboard
          </NavLink>

          {/* 👥 User Management */}
          <NavLink to="/admin/users" className={linkClass}>
            <FaUsers className="inline-block mr-2" />
            All Users
          </NavLink>
          <NavLink to="/admin/blocked-users" className={linkClass}>
            <FaUserSlash className="inline-block mr-2" />
            Blocked Users
          </NavLink>

<NavLink to="/admin/notifications" className={linkClass}>
  <FaBell className="inline-block mr-2" />
  Send Notification
</NavLink>



          {/* 💳 Financial */}
          <NavLink to="/admin/topups" className={linkClass}>
            <FaArrowCircleUp className="inline-block mr-2" />
            Top-Ups
          </NavLink>
          <NavLink to="/admin/deposits" className={linkClass}>
            <FaMoneyBill className="inline-block mr-2" />
            Deposit Log
          </NavLink>
          <NavLink to="/admin/withdrawals/request" className={linkClass}>
            <FaArrowCircleDown className="inline-block mr-2" />
            Withdrawal Requests
          </NavLink>
          <NavLink to="/admin/withdrawals/all" className={linkClass}>
            <FaClipboardList className="inline-block mr-2" />
            All Withdrawals
          </NavLink>

          {/* 💰 Income Reports */}
          <NavLink to="/admin/direct-income" className={linkClass}>
            <FaProjectDiagram className="inline-block mr-2" />
            Direct Income
          </NavLink>
          <NavLink to="/admin/level-income" className={linkClass}>
            <FaSitemap className="inline-block mr-2" />
            Level Income
          </NavLink>
          <NavLink to="/admin/spin-income" className={linkClass}>
            <FaCoins className="inline-block mr-2" />
            Spin Income
          </NavLink>

          <NavLink to="/admin/manual-deposit" className={linkClass}>
  <FaCoins className="inline-block mr-2" />
  Manual Deposit
</NavLink>

 
 <NavLink to="/admin/support" className={linkClass}>
  <FaFileAlt className="inline-block mr-2" />
  Support Requests
</NavLink>



          {/* 💼 Wallet & Transfer */}
          <NavLink to="/admin/wallet-summary" className={linkClass}>
            <FaWallet className="inline-block mr-2" />
            Wallet Summary
          </NavLink>
          <NavLink to="/admin/credit-to-wallet" className={linkClass}>
            <FaCoins className="inline-block mr-2" />
            Credit to Wallet
          </NavLink>
          <NavLink to="/admin/transactions" className={linkClass}>
            <FaListAlt className="inline-block mr-2" />
            All Transactions
          </NavLink>

         <NavLink to="/admin/transactions/reverse" className={linkClass}>
  <FaExchangeAlt className="inline-block mr-2" />
  Reverse Transaction
</NavLink>

<NavLink to="/admin/add-user" className={linkClass}>
  <FaUserPlus className="inline-block mr-2" />
  Add User
</NavLink>


          {/* ⚙️ Settings */}
          <NavLink to="/admin/settings" className={linkClass}>
            <FaCog className="inline-block mr-2" />
            Settings
          </NavLink>
        </nav>
      </div>

      {/* 🚪 Logout */}
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 text-red-600 hover:bg-red-100 rounded transition w-full"
        >
          <FaSignOutAlt className="mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
