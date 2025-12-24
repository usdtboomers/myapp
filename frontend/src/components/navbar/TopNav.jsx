import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Bell } from "lucide-react";
import axios from "axios";

const TopNav = ({ onHamburgerClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifCount, setNotifCount] = useState(0);

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

  return (
    <header className="fixed top-0 left-0 w-full bg-black text-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Left section: Hamburger */}
          <div className="flex items-center gap-4">
            <button onClick={onHamburgerClick} className="lg:hidden">
              {/* Optional hamburger icon */}
            </button>
          </div>

          {/* Center Logo */}
          <div
            className="cursor-pointer flex items-center"
            onClick={() => navigate("/dashboard")}
          >
            <img
              src="/eliteinfinitylogo.png"
              alt="Elite Infinity"
              className="pl-20 pt-1 h-16 object-contain"
            />
          </div>

          {/* Right section: Notifications + Logout */}
          <div className="flex items-center gap-4 relative">
            {/* Notification Bell */}
            <button
              onClick={() => navigate("/notifications")}
              className="relative right-2"
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse"></span>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default TopNav;
