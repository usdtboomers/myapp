import React, { useState, useEffect, useMemo } from 'react';
import api from 'api/axios';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { FaCopy } from 'react-icons/fa';
import { ethers } from 'ethers'; // 👈 Ye add kiya


const AdminWithdrawalTable = () => {
  const token = localStorage.getItem('adminToken');
  const todayStr = format(new Date(), 'yyyy-MM-dd'); // Today's date

  const [withdrawals, setWithdrawals] = useState([]);
  const [search, setSearch] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedHash, setCopiedHash] = useState('');
  const [copiedAddress, setCopiedAddress] = useState('');
  const [fromDate, setFromDate] = useState(todayStr); 
  const [toDate, setToDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('pending'); 
  const [loading, setLoading] = useState(false);




  
  // ----------------- Helpers -----------------
  const normalizeDate = (d) => {
    if (!d) return null;
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    return n;
  };

  // ----------------- Fetch Withdrawals -----------------
  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (fromDate) params.from = format(new Date(fromDate), 'dd-MM-yyyy');
      if (toDate) params.to = format(new Date(toDate), 'dd-MM-yyyy');

      const { data } = await api.get('/admin/withdrawals', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setWithdrawals(Array.isArray(data.withdrawals) ? data.withdrawals : []);
    } catch (err) {
      console.error('Failed to fetch withdrawals:', err);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [fromDate, toDate]);

  // ----------------- Flatten withdrawals -----------------
  const flattenedData = useMemo(() => {
    return withdrawals.flatMap(w => {
      const schedule = Array.isArray(w.schedule) ? w.schedule : [];
      const totalFee = Number(w.fee ?? 0);
      const totalGross = Number(w.grossAmount ?? w.amount ?? 0);

      if (schedule.length) {
        const feePerDayRaw = totalFee / schedule.length;
        const grossPerDayRaw = totalGross / schedule.length;
        let accumulatedFee = 0;
        let accumulatedGross = 0;

        return schedule.map((d, idx) => {
          const fee = idx === schedule.length - 1 ? totalFee - accumulatedFee : parseFloat(feePerDayRaw.toFixed(2));
          const gross = idx === schedule.length - 1 ? totalGross - accumulatedGross : parseFloat(grossPerDayRaw.toFixed(2));
          const net = parseFloat((gross - fee).toFixed(2));
          accumulatedFee += fee;
          accumulatedGross += gross;

          const createdAt = d.date ? new Date(d.date) : new Date(w.createdAt);

          return {
            _id: `${w._id}-${createdAt.toISOString()}`,
            userId: w.userId ?? '-',
            name: w.name ?? '-',
            source: w.source ?? 'ROI',
            grossAmount: gross,
            fee: fee,
            netAmount: net,
walletAddress: d.walletAddress || 'No Wallet',


              txnHash: w.txnHash ?? '-',
            status: d.status ?? 'pending',
            createdAt,
          };
        });
      } else {
        const gross = parseFloat(totalGross.toFixed(2));
        const fee = parseFloat(totalFee.toFixed(2));
        const net = parseFloat((gross - fee).toFixed(2));
        const createdAt = w.date ? new Date(w.date) : new Date(w.createdAt);

        return [{
          _id: w._id,
          userId: w.userId ?? '-',
          name: w.name ?? '-',
          source: w.source ?? 'ROI',
          grossAmount: gross,
          fee: fee,
          netAmount: net,
walletAddress: w.walletAddress || w.walletAddress || 'No Wallet',

txnHash: w.txnHash ?? '-',
          status: w.status ?? 'pending',
          createdAt,
        }];
      }
    });
  }, [withdrawals]);

  // ----------------- Filtered Data -----------------
  const filteredData = useMemo(() => {
    return flattenedData.filter(w => {
      const createdAt = normalizeDate(new Date(w.createdAt));
      if (!createdAt) return false;

      const matchSearch =
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        String(w.userId).includes(search);

      const matchStatus = statusFilter === 'all' || w.status === statusFilter;
      const matchFromDate = fromDate ? createdAt >= normalizeDate(new Date(fromDate)) : true;
      const matchToDate = toDate ? createdAt <= normalizeDate(new Date(toDate)) : true;

      return matchSearch && matchStatus && matchFromDate && matchToDate;
    });
  }, [flattenedData, search, statusFilter, fromDate, toDate]);

  // ----------------- Sorting -----------------
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    if (!sortConfig.key) return sorted;

    sorted.sort((a, b) => {
      const aVal = sortConfig.key === 'createdAt' ? new Date(a[sortConfig.key]) : a[sortConfig.key];
      const bVal = sortConfig.key === 'createdAt' ? new Date(b[sortConfig.key]) : b[sortConfig.key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return sorted;
  }, [filteredData, sortConfig]);

  // ----------------- Pagination -----------------
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return sortedData.slice(start, start + entriesPerPage);
  }, [sortedData, currentPage, entriesPerPage]);

  // ----------------- Totals -----------------
  const totals = useMemo(() => {
    const filtered = paginatedData.length ? paginatedData : filteredData;

    return filtered.reduce(
      (acc, w) => {
        acc.totalCount += 1;
        acc.totalGross += w.grossAmount || 0;
        acc.totalFee += w.fee || 0;
        acc.totalNet += w.netAmount || 0;

        if (w.status === 'pending') {
          acc.pendingCount += 1;
          acc.pendingGross += w.grossAmount || 0;
          acc.pendingFee += w.fee || 0;
          acc.pendingNet += w.netAmount || 0;
        }

        return acc;
      },
      {
        totalCount: 0,
        totalGross: 0,
        totalFee: 0,
        totalNet: 0,
        pendingCount: 0,
        pendingGross: 0,
        pendingFee: 0,
        pendingNet: 0,
      }
    );
  }, [paginatedData, filteredData]);

  // ----------------- Copy Handler -----------------
  const handleCopy = (value, type) => {
    navigator.clipboard.writeText(value);
    if (type === 'hash') setCopiedHash(value);
    else setCopiedAddress(value);
    setTimeout(() => {
      if (type === 'hash') setCopiedHash('');
      else setCopiedAddress('');
    }, 2000);
  };

  // ----------------- Sorting Handler -----------------
  const handleSort = header => {
    const field =
      header === 'Gross Amount' ? 'grossAmount' :
      header === 'Fee' ? 'fee' :
      header === 'Net Amount' ? 'netAmount' :
      header === 'Date' ? 'createdAt' : null;
    if (!field) return;
    setSortConfig(prev =>
      prev.key === field
        ? { key: field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key: field, direction: 'asc' }
    );
  };

  // ----------------- Update Status -----------------
  const updateStatus = async (id, status) => {
    try {
      let url, body = {};
      if (status === 'dummy') {
        const txnHash = prompt('Enter Dummy Transaction Hash:');
        if (!txnHash) return alert('Transaction hash is required.');
        url = `/admin/withdrawals/dummy/${id}`;
        body = { txnHash };
      } else {
        const normalizedStatus = status === 'approved' ? 'approve' : 'reject';
        url = `/admin/withdrawals/${normalizedStatus}/${id}`;
      }
      await api.put(url, body, { headers: { Authorization: `Bearer ${token}` } });
      fetchWithdrawals();
    } catch (err) {
      console.error(err);
      alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
    }
  };

  // ----------------- CSV Export -----------------
  const exportCSV = () => {
    if (!paginatedData.length) return alert('No data to export.');
    const rows = paginatedData.map((w, idx) => ({
      'Sr. No.': idx + 1 + (currentPage - 1) * entriesPerPage,
      'User ID': w.userId,
      Name: w.name,
      Source: w.source,
      'Gross Amount': `$${(w.grossAmount || 0).toFixed(2)}`,
      Fee: `$${(w.fee || 0).toFixed(2)}`,
      'Net Amount': `$${(w.netAmount || 0).toFixed(2)}`,
      'Wallet Address': w.walletAddress,
      'Txn Hash': w.txnHash,
      Status: w.status.toUpperCase(),
      Date: format(new Date(w.createdAt), 'dd/MM/yyyy HH:mm:ss'),
    }));
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map(row => Object.values(row).join(','))].join('\n');
    saveAs(new Blob([csv], { type: 'text/csv' }), 'withdrawals.csv');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">💸 Withdrawal Requests</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name or ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-64"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={entriesPerPage}
          onChange={e => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
          className="border px-3 py-2 rounded"
        >
          {[10,50,100,200].map(num => <option key={num} value={num}>{num}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border px-3 py-2 rounded" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border px-3 py-2 rounded" />
        <button onClick={fetchWithdrawals} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Refresh</button>
        <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Export CSV</button>
      </div>

      {/* Totals */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-6 text-sm font-medium">
        <div>Pending Withdrawals: <span className="text-blue-600">{totals.pendingCount}</span></div>
        <div>Total Gross: <span className="text-green-600">${totals.pendingGross.toFixed(2)}</span></div>
        <div>Total Fee: <span className="text-red-600">${totals.pendingFee.toFixed(2)}</span></div>
        <div>Total Net: <span className="text-purple-600">${totals.pendingNet.toFixed(2)}</span></div>
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded-lg">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : (
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-gray-50 text-left">
              <tr>
                {['Sr. No.', 'User ID', 'Name', 'Source', 'Gross Amount', 'Fee', 'Net Amount', 'Wallet', 'Txn Hash', 'Status', 'Date', 'Actions'].map(h => (
                  <th
                    key={h}
                    className={`px-4 py-2 border-b font-semibold ${['Gross Amount','Fee','Net Amount','Date'].includes(h) ? 'cursor-pointer hover:text-blue-600' : ''}`}
                    onClick={() => handleSort(h)}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-4 text-gray-500">No data found</td></tr>
              ) : (
                paginatedData.map((w, idx) => (
                  <tr key={w._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{(currentPage-1)*entriesPerPage + idx + 1}</td>
                    <td className="px-4 py-2">{w.userId}</td>
                    <td className="px-4 py-2">{w.name || '-'}</td>
                    <td className="px-4 py-2">{w.source}</td>
                    <td className="px-4 py-2">${(w.grossAmount || 0).toFixed(2)}</td>
                    <td className="px-4 py-2">${(w.fee || 0).toFixed(2)}</td>
                    <td className="px-4 py-2">${(w.netAmount || 0).toFixed(2)}</td>
                   <td className="px-4 py-2 flex items-center gap-2">
  {w.walletAddress && w.walletAddress !== 'No Wallet' ? (
    <>
      <span title={w.walletAddress} className="truncate max-w-[150px]">
        {w.walletAddress.slice(0,6)}...{w.walletAddress.slice(-4)}
      </span>
      <FaCopy className="cursor-pointer text-gray-500 hover:text-white" onClick={() => handleCopy(w.walletAddress,'address')} />
      {copiedAddress === w.walletAddress && <span className="text-green-600 text-xs">Copied!</span>}
    </>
  ) : (
    <span className="text-red-500">No Wallet — <a href={`/admin/user/${w.userId}`} className="text-blue-600 underline">Open profile</a></span>
  )}
</td>

                    <td className="px-4 py-2">
                      {w.txnHash ? (
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[100px]">{w.txnHash.slice(0,6)}...{w.txnHash.slice(-4)}</span>
                          <FaCopy className="cursor-pointer text-gray-500 hover:text-white" onClick={() => handleCopy(w.txnHash,'hash')} />
                          {copiedHash === w.txnHash && <span className="text-green-600 text-xs">Copied!</span>}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${w.status==='pending'?'bg-yellow-100 text-yellow-800':w.status==='approved'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{w.status}</span>
                    </td>
                    <td className="px-4 py-2">{format(new Date(w.createdAt),'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-4 py-2 space-y-1">
                      {w.status==='pending' && (
                        <div className="space-y-1">
                          <button onClick={() => updateStatus(w._id,'approved')} className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded w-full">✅ Approve</button>
                          <button onClick={() => updateStatus(w._id,'dummy')} className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded w-full">🛠 Dummy Txn</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
 

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center text-sm">
        <p>Showing {(currentPage-1)*entriesPerPage+1} to {Math.min(currentPage*entriesPerPage, filteredData.length)} of {filteredData.length} entries</p>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(p-1,1))} className="px-3 py-1 border rounded hover:bg-gray-100">Prev</button>
          <span className="px-3 py-1 border rounded">{currentPage}</span>
          <button onClick={() => setCurrentPage(p => Math.min(p+1, Math.ceil(filteredData.length/entriesPerPage)))} className="px-3 py-1 border rounded hover:bg-gray-100">Next</button>
        </div>
      </div>
    </div>
  );
};

export default AdminWithdrawalTable
