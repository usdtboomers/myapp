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
    // 🔥 CHANGE 1: min-w-[1280px]
    // Isse mobile screen par bhi ye 1280px chauda banega (Desktop Mode)
    // Mobile user ko side me scroll karna padega ya zoom out dikhega
    <div className="min-w-[1280px] min-h-screen bg-gray-50 p-6 pt-20">
      
      {/* Stats Cards */}
      <DashboardCards stats={stats} />

      {/* 🔥 CHANGE 2: Force 2 Columns (grid-cols-2) */}
      {/* Pehle 'grid-cols-1' tha mobile ke liye, wo hata diya */}
      <div className="grid grid-cols-2 gap-6 mt-6">
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
         
         {/* 🔥 CHANGE 3: Scroll Wrapper Hataya */}
         {/* Kyunki ab pura page hi 1280px ka hai, to table apne aap fit aayegi */}
         <AdminWithdrawalTable withdrawals={withdrawals} refreshWithdrawals={fetchWithdrawals} />
         
      </div>

    </div>
  );
};

export default AdminDashboard;