import React from 'react';
import { Users, UserPlus, Wallet, DollarSign, Network } from 'lucide-react';

function DashboardCards({ stats }) {
  const cardData = [
    {
      title: 'Total Users',
      value: stats.totalUsers?.toLocaleString() || 0,
      icon: <Users className="text-blue-600" size={32} />,
      bg: 'bg-blue-100'
    },
    {
      title: "Today's New Users",
      value: stats.todayUsers?.toLocaleString() || 0,
      icon: <UserPlus className="text-green-600" size={32} />,
      bg: 'bg-green-100'
    },
    {
      title: 'Total Deposits',
      value: `$${stats.totalDeposit?.toLocaleString() || 0}`,
      icon: <Wallet className="text-indigo-600" size={32} />,
      bg: 'bg-indigo-100'
    },
    {
      title: 'Total Withdrawals',
      value: `$${stats.totalWithdrawal?.toLocaleString() || 0}`,
      icon: <DollarSign className="text-red-600" size={32} />,
      bg: 'bg-red-100'
    },
    {
      title: 'Global Team',
      value: stats.totalGlobalTeam?.toLocaleString() || 0,
      icon: <Network className="text-purple-600" size={32} />,
      bg: 'bg-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {cardData.map((card, index) => (
        <div
          key={index}
          className={`rounded-2xl p-5 shadow-md flex items-center justify-between ${card.bg}`}
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-700">{card.title}</h2>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
          <div className="opacity-80">{card.icon}</div>
        </div>
      ))}
    </div>
  );
}

export default DashboardCards;
