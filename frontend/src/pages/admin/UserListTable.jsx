import React, { useEffect, useState } from 'react';
import api from 'api/axios';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

const UserListTable = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Admin token not found');

      const res = await api.get('/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = res.data || [];
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users by search and date
  useEffect(() => {
    const filtered = users.filter(user => {
      const nameMatch = user.name?.toLowerCase().includes(search.toLowerCase());
      const idMatch = String(user.userId).includes(search);
      const createdAt = new Date(user.createdAt);

      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;

      const inDateRange =
        (!fromDate || createdAt >= fromDate) &&
        (!toDate || createdAt <= toDate);

      return (nameMatch || idMatch) && inDateRange;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to page 1 when search/filter changes
  }, [search, users, dateFrom, dateTo]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleEntriesChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Export filtered users to CSV
  const exportToCSV = () => {
    const csvData = filteredUsers.map(user => ({
      UserID: user.userId,
      Name: user.name,
      Email: user.email,
      Mobile: user.mobile,
      WalletBalance: user.walletBalance?.toFixed(2) || 0,
      TopUpAmount: user.topUpAmount || 0,
      Joined: new Date(user.createdAt).toLocaleDateString(),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'user-list.csv');
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-600 text-lg">
        Loading users...
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Top Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
        
        {/* Search, Dates & Entries Select */}
        <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 w-full md:w-60"
            placeholder="Search Name / ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            type="date"
            className="border border-gray-300 rounded px-3 py-2"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="border border-gray-300 rounded px-3 py-2"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          
          {/* Show Entries Dropdown */}
          <select 
            className="border border-gray-300 rounded px-3 py-2 bg-white"
            value={itemsPerPage}
            onChange={handleEntriesChange}
          >
            <option value={10}>Show 10</option>
            <option value={20}>Show 20</option>
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
          </select>
        </div>

        {/* Export & Count */}
        <div className="flex gap-2 items-center justify-between md:justify-end">
          <span className="text-gray-600 text-sm font-medium">
            Total: {filteredUsers.length}
          </span>
          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded shadow text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded shadow">
        <table className="min-w-full bg-white text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 border">User ID</th>
              <th className="px-4 py-3 border">Name</th>
              <th className="px-4 py-3 border">Email</th>
              <th className="px-4 py-3 border">Mobile</th>
              <th className="px-4 py-3 border">Wallet</th>
              <th className="px-4 py-3 border">Top-Up</th>
              <th className="px-4 py-3 border">Joined</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center px-4 py-4 text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              currentItems.map((user, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{user.userId}</td>
                  <td className="px-4 py-2 border">{user.name}</td>
                  <td className="px-4 py-2 border">{user.email}</td>
                  <td className="px-4 py-2 border">{user.mobile}</td>
                  <td className="px-4 py-2 border">
                    ${user.walletBalance?.toFixed(2) || 0}
                  </td>
                  <td className="px-4 py-2 border">
                    ${user.topUpAmount || 0}
                  </td>
                  <td className="px-4 py-2 border">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 text-sm">
          <span className="text-gray-600">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} entries
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className={`px-3 py-1 border rounded ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              Previous
            </button>
            
            <button className="px-3 py-1 border rounded bg-indigo-600 text-white font-bold">
              {currentPage}
            </button>

            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 border rounded ${
                currentPage === totalPages 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListTable;