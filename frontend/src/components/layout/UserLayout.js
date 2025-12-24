// src/components/layout/UserLayout.js
import React, { useState } from "react";
import TopNav from "../navbar/TopNav";
import Sidebar from "../sidebar/Sidebar";
import { useAuth } from "../../context/AuthContext";

const UserLayout = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      {/* Top Navigation */}
      <TopNav onHamburgerClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Sidebar */}
      <Sidebar user={user} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <main className="pt-16">{children}</main> {/* pt-16 = height of navbar */}
    </div>
  );
};

export default UserLayout;
