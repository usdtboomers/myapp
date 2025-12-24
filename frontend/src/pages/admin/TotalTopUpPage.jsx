import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

const ITEMS_PER_PAGE = 10;
const packages = [10, 25, 50, 100, 200, 500, 1000];

// 🔐 Helper: safely convert Decimal128 / string / number to JS number
const toNumber = (val) => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (typeof val === 'object' && val.$numberDecimal) {
    return parseFloat(val.$numberDecimal) || 0;
  }
  return Number(val) || 0;
};

const TotalTopUpPage = () => {
  const [topupUsers, setTopupUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);

  // 🟢 Fetch Data
  useEffect(() => {
    const fetchTopupUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('Missing admin token');

        const res = await axios.get('http://143.198.205.94:5000/api/admin/topup-users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rawUsers = res.data || [];

        // ✅ Normalize topUpAmount here (Decimal128 → number)
        const users = rawUsers.map((u) => ({
          ...u,
          topUpAmount: toNumber(u.topUpAmount),
        }));

        setTopupUsers(users);
      } catch (err) {
        console.error('❌ Failed to fetch top-up users:', err);
        setError('Unauthorized or failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchTopupUsers();
  }, []);

  // 🔍 Filter Logic
  useEffect(() => {
    const filtered = topupUsers.filter((user) => {
      const matchesId = searchId ? String(user.userId).includes(searchId) : true;
      const date = user.topUpDate ? new Date(user.topUpDate) : null;
      const matchesFrom = fromDate ? (date && date >= new Date(fromDate)) : true;
      const matchesTo = toDate ? (date && date <= new Date(toDate)) : true;
      return matchesId && matchesFrom && matchesTo;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchId, fromDate, toDate, topupUsers]);

  // 📊 Calculations
  const today = new Date().toISOString().split('T')[0];

  const todayTopUps = filteredUsers.filter((user) => {
    const date = user.topUpDate ? new Date(user.topUpDate) : null;
    if (!date || isNaN(date)) return false;
    return date.toISOString().split('T')[0] === today;
  });

  const todayBusiness = todayTopUps.reduce(
    (sum, user) => sum + toNumber(user.topUpAmount),
    0
  );

  const totalBusiness = filteredUsers.reduce(
    (sum, user) => sum + toNumber(user.topUpAmount),
    0
  );

  const totalIds = filteredUsers.length;

  // 🔹 Count by package
  const planCount = {};
  packages.forEach((pkg) => {
    planCount[pkg] = filteredUsers.filter(
      (u) => toNumber(u.topUpAmount) === pkg
    ).length;
  });

  // 📦 Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 📤 Export CSV
  const exportToCSV = () => {
    const csvData = filteredUsers.map((user) => ({
      UserID: user.userId,
      Name: user.name || '',
      TopUpAmount: toNumber(user.topUpAmount),
      TopUpDate: user.topUpDate ? new Date(user.topUpDate).toLocaleString() : '',
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `topup-report-${Date.now()}.csv`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-indigo-700 mb-6">💰 Total Top-Up Report</h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="🔎 Search by User ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded w-full md:w-1/3"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded w-full md:w-1/3"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded w-full md:w-1/3"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          label="💵 Total Business"
          value={`$${totalBusiness.toFixed(2)}`}
          color="bg-green-100"
        />
        <SummaryCard
          label="👥 Total IDs Top-Ups"
          value={totalIds}
          color="bg-blue-100"
        />
        <SummaryCard
          label="📆 Today's Top-Ups"
          value={todayTopUps.length}
          color="bg-yellow-100"
        />
        <SummaryCard
          label="📈 Today's Business"
          value={`$${todayBusiness.toFixed(2)}`}
          color="bg-orange-100"
        />
        {Object.entries(planCount).map(([plan, count]) => (
          <SummaryCard
            key={plan}
            label={`📄 Plan $${plan}`}
            value={count}
            color="bg-purple-100"
          />
        ))}
      </div>

      {/* Export Button */}
      <div className="mb-4 text-right">
        <button
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
        >
          📁 Export to CSV
        </button>
      </div>

      {/* Error & Loading */}
      {loading && <p className="text-gray-500">Loading data...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-auto border rounded shadow">
          <table className="min-w-full bg-white text-sm text-left">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-4 py-3 border">User ID</th>
                <th className="px-4 py-3 border">Name</th>
                <th className="px-4 py-3 border">Top-Up Amount</th>
                <th className="px-4 py-3 border">Top-Up Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{user.userId}</td>
                    <td className="px-4 py-2 border">{user.name || '-'}</td>
                    <td className="px-4 py-2 border">
                      ${toNumber(user.topUpAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border">
                      {user.topUpDate
                        ? new Date(user.topUpDate).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center px-4 py-6 text-gray-500">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            ◀ Prev
          </button>
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next ▶
          </button>
        </div>
      )}
    </div>
  );
};

// ✅ SummaryCard Component (safe)
const SummaryCard = ({ label, value, color }) => (
  <div className={`${color} p-4 rounded shadow`}>
    <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
    <p className="text-xl font-bold">
      {typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : value}
    </p>
  </div>
);

export default TotalTopUpPage;
