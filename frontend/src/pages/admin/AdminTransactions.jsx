import React, { useEffect, useState } from 'react';
import axios from 'axios';

// 🔹 Helpers for Decimal / number normalization
const normalizeAmount = (value) => {
  if (value == null) return 0;

  if (typeof value === "number") {
    return Number.isNaN(value) ? 0 : value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
  }

  if (typeof value === "object") {
    if (value.$numberDecimal) {
      const n = Number(value.$numberDecimal);
      return Number.isNaN(n) ? 0 : n;
    }

    if (value._bsontype === "Decimal128" && typeof value.toString === "function") {
      const n = Number(value.toString());
      return Number.isNaN(n) ? 0 : n;
    }
  }

  return 0;
};

const formatAmount = (value, digits = 2) => {
  const n = normalizeAmount(value);
  return n.toFixed(digits);
};

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [viewTransferType, setViewTransferType] = useState('all');

  const [filters, setFilters] = useState({
    userId: '',
    type: '',
    fromDate: '',
    toDate: '',
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions, viewTransferType]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Admin token not found');

      const res = await axios.get('http://178.128.20.53/api/admin/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTransactions(res.data || []);
      setFiltered(res.data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const applyFilters = () => {
    let result = [...transactions];
    const uid = Number(filters.userId);

    // Filter by type
    if (filters.type) {
      result = result.filter(tx => tx.type === filters.type);

      // Special handling for transfer
      if (filters.type === 'transfer') {
        // Only keep sender-side records to avoid duplicates
        result = result.filter(tx => tx.userId === tx.fromUserId);

        if (filters.userId) {
          if (viewTransferType === 'sent') {
            result = result.filter(tx => tx.fromUserId === uid);
          } else if (viewTransferType === 'received') {
            result = result.filter(tx => tx.toUserId === uid);
          } else {
            result = result.filter(tx => tx.fromUserId === uid || tx.toUserId === uid);
          }
        }
      }
    }

    // Filter by userId (non-transfer)
    if (filters.userId && filters.type !== 'transfer') {
      result = result.filter(tx => String(tx.userId).includes(filters.userId));
    }

    // Filter by date range
    if (filters.fromDate) {
      const from = new Date(filters.fromDate);
      result = result.filter(tx => new Date(tx.date || tx.createdAt) >= from);
    }

    if (filters.toDate) {
      const to = new Date(filters.toDate);
      result = result.filter(tx => new Date(tx.date || tx.createdAt) <= to);
    }

    setFiltered(result);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4 text-indigo-600 text-center">
        All User Transactions
      </h2>

      {/* Filters */}
      <div className="grid md:grid-cols-4 gap-4 mb-4">
        <input
          type="text"
          placeholder="User ID"
          value={filters.userId}
          onChange={e => setFilters({ ...filters, userId: e.target.value })}
          className="border p-2 rounded"
        />
        <select
          value={filters.type}
          onChange={e => setFilters({ ...filters, type: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="transfer">Transfer</option>
          <option value="direct_income">Direct Income</option>
          <option value="level_income">Level Income</option>
          <option value="roi_income">ROI Income</option>
           <option value="topup">Top-up</option>
          <option value="spin_income">Spin Income</option>
          <option value="buy_spin">Buy Spin</option>
          <option value="credit_to_wallet">Credit to Wallet</option>
        </select>
        <input
          type="date"
          value={filters.fromDate}
          onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={filters.toDate}
          onChange={e => setFilters({ ...filters, toDate: e.target.value })}
          className="border p-2 rounded"
        />
      </div>

      {/* Transfer Type Toggle */}
      {filters.type === 'transfer' && filters.userId && (
        <div className="mb-4 flex gap-2">
          <button
            className={`px-3 py-1 rounded ${
              viewTransferType === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setViewTransferType('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded ${
              viewTransferType === 'sent' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setViewTransferType('sent')}
          >
            Sent
          </button>
          <button
            className={`px-3 py-1 rounded ${
              viewTransferType === 'received' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setViewTransferType('received')}
          >
            Received
          </button>
        </div>
      )}

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="w-full border rounded shadow text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">User ID</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">From</th>
              <th className="p-2 border">To</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Source</th>
              <th className="p-2 border">Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center p-4">
                  No transactions found.
                </td>
              </tr>
            ) : (
              filtered.map((tx, index) => (
                <tr key={tx._id} className="text-center">
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{tx.userId}</td>
                  <td className="border p-2">{tx.name || '-'}</td>
                  <td className="border p-2 capitalize">
                    {tx.type.replace('_', ' ')}
                  </td>
                  <td className="border p-2 text-green-700 font-bold">
                    ${formatAmount(tx.amount)}
                  </td>
                  <td className="border p-2">{tx.fromUserId || '-'}</td>
                  <td className="border p-2">{tx.toUserId || '-'}</td>
                  <td className="border p-2">
                    {tx.date
                      ? new Date(tx.date).toLocaleString('en-IN')
                      : tx.createdAt
                      ? new Date(tx.createdAt).toLocaleString('en-IN')
                      : 'N/A'}
                  </td>
                  <td className="border p-2">{tx.source || '-'}</td>
                  <td className="border p-2">{tx.description || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTransactions;
