import React, { useEffect, useState } from 'react';
import axios from 'axios';

// 🔹 Helper: Decimal128 / number ko normalize karo
const getNumericAmount = (amount) => {
  if (!amount) return 0;

  if (typeof amount === 'object' && amount.$numberDecimal) {
    return Number(amount.$numberDecimal);
  }

  return Number(amount);
};

const formatAmount = (amount) => {
  const num = getNumericAmount(amount);
  if (Number.isNaN(num)) return '-';
  return num.toFixed(2);
};

const DepositTable = () => {
  const [deposits, setDeposits] = useState([]);
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [depositsPerPage, setDepositsPerPage] = useState(10); // Default 10

  const [searchId, setSearchId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return console.error('No admin token found.');

      const res = await axios.get('http://143.198.205.94:5000/api/admin/deposits', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allDeposits = res.data || [];
      setDeposits(allDeposits);
      setFilteredDeposits(allDeposits);
    } catch (err) {
      console.error('Failed to fetch deposits:', err);
    }
  };

  // Filter deposits based on search & date
  useEffect(() => {
    const filtered = deposits.filter((deposit) => {
      const matchId = searchId ? String(deposit.userId).includes(searchId) : true;
      const created = new Date(deposit.createdAt);
      const matchFrom = fromDate ? created >= new Date(fromDate) : true;
      const matchTo = toDate ? created <= new Date(toDate) : true;
      return matchId && matchFrom && matchTo;
    });

    setFilteredDeposits(filtered);
    setCurrentPage(1);
  }, [searchId, fromDate, toDate, deposits]);

  // Pagination calculations
  const indexOfLast = currentPage * depositsPerPage;
  const indexOfFirst = indexOfLast - depositsPerPage;
  const currentDeposits = filteredDeposits.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredDeposits.length / depositsPerPage);

  const handleNext = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const handlePrev = () => currentPage > 1 && setCurrentPage(prev => prev - 1);

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    return date.getTime() === today.getTime();
  };

  const totalAmount = filteredDeposits.reduce(
    (sum, d) => sum + getNumericAmount(d.amount),
    0
  );

  const totalToday = filteredDeposits
    .filter(d => isToday(d.createdAt))
    .reduce((sum, d) => sum + getNumericAmount(d.amount), 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-indigo-600">💰 All Deposits</h2>

      {/* Totals */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 text-sm font-medium">
        <div className="bg-gray-100 p-3 rounded w-full md:w-1/3">
          Total Deposits:{' '}
          <span className="text-green-600">${totalAmount.toFixed(2)}</span>
        </div>
        <div className="bg-yellow-100 p-3 rounded w-full md:w-1/3">
          Today's Total:{' '}
          <span className="text-orange-600">${totalToday.toFixed(2)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by User ID"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/3"
        />
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/3"
        />
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/3"
        />
        <select
          value={depositsPerPage}
          onChange={e => setDepositsPerPage(Number(e.target.value))}
          className="px-4 py-2 border rounded w-full md:w-1/6"
        >
          {[10, 20, 50, 100].map(num => (
            <option key={num} value={num}>
              {num} per page
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-sm">
              <th className="p-2 border">User ID</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Txn Hash</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Time</th>
              <th className="p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {currentDeposits.length > 0 ? (
              currentDeposits.map((deposit, index) => {
                const createdAt = new Date(deposit.createdAt);
                const date = createdAt.toLocaleDateString('en-GB');
                const time = createdAt.toLocaleTimeString('en-US');

                return (
                  <tr
                    key={index}
                    className={`border-t text-sm ${
                      isToday(deposit.createdAt) ? 'bg-yellow-50 font-medium' : ''
                    }`}
                  >
                    <td className="p-2 border">{deposit.userId}</td>
                    <td className="p-2 border">{deposit.name || '-'}</td>
                    <td className="p-2 border">
                      ${formatAmount(deposit.amount)}
                    </td>
                    <td className="p-2 border break-all text-blue-700">
                      {deposit.txnHash || (
                        <span className="italic text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="p-2 border">{date}</td>
                    <td className="p-2 border">{time}</td>
                    <td className="p-2 border capitalize">{deposit.status}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-500">
                  No deposits found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm">
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded ${
              currentPage === 1
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded ${
              currentPage === totalPages
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DepositTable;
