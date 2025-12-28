import React, { useEffect, useState } from 'react';
import api from 'api/axios';
import DashboardCards from '../../components/DashboardCards';
import UserSearch from './UserSearch';
import ReferralTree from '../../components/ReferralTree';
import AdminWithdrawalTable from './AdminWithdrawalTable';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    todayUsers: 0,
    todayUserIds: [],
    totalDeposit: 0,
    todayDeposit: 0,
    totalWithdrawal: 0,
    todayWithdrawal: 0,
  });

  const [withdrawals, setWithdrawals] = useState([]);
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchDashboardData();
    fetchWithdrawals();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats({
        totalUsers: statsRes.data.totalUsers || 0,
        todayUsers: statsRes.data.todayUsers || 0,
        todayUserIds: statsRes.data.todayUserIds || [],
        totalDeposit: statsRes.data.totalDeposit || 0,
        todayDeposit: statsRes.data.todayDeposit || 0,
        totalWithdrawal: statsRes.data.totalWithdrawal || 0,
        todayWithdrawal: statsRes.data.todayWithdrawal || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await api.get('/admin/withdrawals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWithdrawals(res.data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6 pt-20">
      
      {/* Stats Cards */}
      <DashboardCards stats={stats} />

      {/* Grid Layout for Search & Tree */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-4 rounded-lg shadow">
            <UserSearch />
        </div>
        <div className="bg-white p-4 rounded-lg shadow overflow-hidden">
            <ReferralTree />
        </div>
      </div>

      {/* Withdrawal Table Section */}
      <div className="mt-8 bg-white rounded-lg shadow p-4">
         <h3 className="text-lg font-bold text-gray-700 mb-4">Recent Withdrawals</h3>
         
         {/* 🔥 SCROLL FIX START */}
         {/* overflow-x-auto: Scrollbar laane ke liye */}
         <div className="w-full overflow-x-auto pb-2">
            
            {/* min-w-[1000px]: Table ko zabardasti chauda (wide) rakhega taaki scroll kaam kare */}
            <div className="min-w-[1000px]"> 
                <AdminWithdrawalTable withdrawals={withdrawals} refreshWithdrawals={fetchWithdrawals} />
            </div>

         </div>
         {/* 🔥 SCROLL FIX END */}
         
      </div>

    </div>
  );
};

export default AdminDashboard;