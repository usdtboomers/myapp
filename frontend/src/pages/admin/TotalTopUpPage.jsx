import React, { useEffect, useState } from 'react';
import api from 'api/axios';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

const ITEMS_PER_PAGE = 10;
const packages = [30, 60, 120, 240, 480, 960];

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
  const [selectedPlan, setSelectedPlan] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // FETCH
  useEffect(() => {
    const fetchTopupUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken');

        const res = await api.get('/admin/topup-users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const users = (res.data || []).map((u) => ({
          ...u,
          topUpAmount: toNumber(u.topUpAmount),
        }));

        setTopupUsers(users);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopupUsers();
  }, []);

  // FILTER
  useEffect(() => {
    const filtered = topupUsers.filter((user) => {
      const matchesId = searchId
        ? String(user.userId).includes(searchId)
        : true;

      const matchesPlan = selectedPlan
        ? toNumber(user.topUpAmount) === Number(selectedPlan)
        : true;

      const date = user.topUpDate ? new Date(user.topUpDate) : null;

      const matchesFrom = fromDate
        ? date && date >= new Date(fromDate)
        : true;

      const matchesTo = toDate
        ? date && date <= new Date(toDate)
        : true;

      return matchesId && matchesPlan && matchesFrom && matchesTo;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchId, selectedPlan, fromDate, toDate, topupUsers]);

  // STATS
  const today = new Date().toISOString().split('T')[0];

  const todayTopUps = filteredUsers.filter((user) => {
    const date = user.topUpDate ? new Date(user.topUpDate) : null;
    return date && date.toISOString().split('T')[0] === today;
  });

  const todayBusiness = todayTopUps.reduce(
    (sum, u) => sum + toNumber(u.topUpAmount),
    0
  );

  const totalBusiness = filteredUsers.reduce(
    (sum, u) => sum + toNumber(u.topUpAmount),
    0
  );

  const totalIds = filteredUsers.length;

  const planCount = {};
  packages.forEach((pkg) => {
    planCount[pkg] = filteredUsers.filter(
      (u) => toNumber(u.topUpAmount) === pkg
    ).length;
  });

  // PAGINATION
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ✅ CSV EXPORT (MOBILE ADDED)
  const exportToCSV = () => {
    const summary = [
      { Metric: 'Total Business', Value: totalBusiness },
      { Metric: 'Total IDs', Value: totalIds },
      { Metric: 'Today TopUps', Value: todayTopUps.length },
      { Metric: 'Today Business', Value: todayBusiness },
    ];

    packages.forEach((pkg) => {
      summary.push({
        Metric: `Plan ${pkg}`,
        Value: planCount[pkg],
      });
    });

    const table = filteredUsers.map((u) => ({
      UserID: u.userId,
      Name: u.name || '',
      Mobile: u.mobile || '',   // ✅ NEW
      Amount: toNumber(u.topUpAmount),
      Date: u.topUpDate
        ? new Date(u.topUpDate).toLocaleString()
        : '',
    }));

    const csv =
      Papa.unparse(summary) +
      '\n\n' +
      Papa.unparse(table);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    saveAs(blob, `topup-report-${Date.now()}.csv`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-indigo-700 mb-6">
        💰 Total Top-Up Report
      </h2>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search User ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/4"
        />

        <select
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/4"
        >
          <option value="">All Plans</option>
          {packages.map((p) => (
            <option key={p} value={p}>
              ${p}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/4"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/4"
        />
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard label="Total Business" value={`$${totalBusiness}`} color="bg-green-100" />
        <SummaryCard label="Total IDs" value={totalIds} color="bg-blue-100" />
        <SummaryCard label="Today TopUps" value={todayTopUps.length} color="bg-yellow-100" />
        <SummaryCard label="Today Business" value={`$${todayBusiness}`} color="bg-orange-100" />

        {packages.map((pkg) => (
          <SummaryCard key={pkg} label={`$${pkg}`} value={planCount[pkg]} color="bg-purple-100" />
        ))}
      </div>

      {/* EXPORT */}
      <div className="text-right mb-4">
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Export CSV
        </button>
      </div>

      {/* TABLE */}
      {!loading && (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Mobile</th> {/* ✅ NEW */}
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u._id}>
                  <td>{u.userId}</td>
                  <td>{u.name}</td>
                  <td>{u.mobile || '-'}</td> {/* ✅ NEW */}
                  <td>${toNumber(u.topUpAmount)}</td>
                  <td>{new Date(u.topUpDate).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color }) => (
  <div className={`${color} p-4 rounded`}>
    <h4>{label}</h4>
    <p>{value}</p>
  </div>
);

export default TotalTopUpPage;