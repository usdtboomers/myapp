import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardCards from '../../components/DashboardCards';
import UserSearch from './UserSearch';
import ReferralTree from '../../components/ReferralTree';
import AdminWithdrawalTable from './AdminWithdrawalTable'; // ✅

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

  const [withdrawals, setWithdrawals] = useState([]); // ✅ NEW
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchDashboardData();
    fetchWithdrawals(); // ✅ FETCH withdrawals
  }, []);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await axios.get('http://178.128.20.53/api/admin/dashboard', {
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
      const res = await axios.get('http://178.128.20.53/api/admin/withdrawals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWithdrawals(res.data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  return (
    <div className="p-6">
      <DashboardCards stats={stats} />

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <UserSearch />
        <ReferralTree />
      </div>

      <AdminWithdrawalTable withdrawals={withdrawals} refreshWithdrawals={fetchWithdrawals} /> {/* ✅ */}
    </div>
  );
};

export default AdminDashboard;
