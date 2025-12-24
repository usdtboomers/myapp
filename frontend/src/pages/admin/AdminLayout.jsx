import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const AdminLayout = () => {
  return (
    <div className="flex">
      {/* Fixed Sidebar */}
      <div className="fixed top-0 left-0 h-screen w-64 z-50">
        <Sidebar />
      </div>

      {/* Main content with left margin equal to sidebar width */}
      <div className="ml-64 flex-1 bg-gray-100 p-6 min-h-screen overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
