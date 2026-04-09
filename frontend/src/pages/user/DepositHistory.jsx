import React, { useEffect, useState } from 'react';
import api from '../../api/axios'; // Path apne hisaab se check kar lena
import { format } from 'date-fns';

const DepositHistory = () => {
  const [deposits, setDeposits] = useState([]);
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchDeposits = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user?.userId) {
          console.error('No user found in localStorage');
          setLoading(false);
          return;
        }

        // Wallet history fetch kar rahe hain jisme sab mix hota hai
        const res = await api.get(`/wallet/wallet-history/${user.userId}`);
        
        const historyData = res.data.history || res.data.data || (Array.isArray(res.data) ? res.data : []);

        // ✅ FIX: Filter lagaya taaki SIRF "deposit" type wale records hi dikhein
        const onlyDeposits = historyData.filter(item => item.type && item.type.toLowerCase() === 'deposit');

        setDeposits(onlyDeposits);
        setFilteredDeposits(onlyDeposits);
      } catch (err) {
        console.error('Failed to fetch deposit history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeposits();
  }, []);

  useEffect(() => {
    const query = search.toLowerCase();
    const filtered = deposits.filter((d) => {
      const amount = d.amount?.toString().toLowerCase() || d.grossAmount?.toString().toLowerCase() || '';
      const recordDate = d.createdAt || d.date; 
      const dateStr = recordDate
        ? format(new Date(recordDate), 'dd-MM-yyyy HH:mm').toLowerCase()
        : '';
        
      return amount.includes(query) || dateStr.includes(query);
    });

    setFilteredDeposits(filtered);
  }, [search, deposits]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">🪙 Deposit History</h2>

      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Search by amount or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
        />
      </div>

      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <table className="w-full text-sm md:text-base text-left border-collapse">
          <thead className="bg-blue-100 text-gray-700">
            <tr>
              <th className="p-3 border">💰 Amount</th>
              <th className="p-3 border">📅 Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="2" className="p-5 text-center text-gray-500">
                  Loading deposit history...
                </td>
              </tr>
            ) : filteredDeposits.length === 0 ? (
              <tr>
                <td colSpan="2" className="p-5 text-center text-gray-500">
                  No deposit records found.
                </td>
              </tr>
            ) : (
              filteredDeposits.map((record, index) => {
                const recordDate = record.createdAt || record.date;
                const displayAmount = record.amount || record.grossAmount || 0;
                
                return (
                  <tr key={record._id || index} className="hover:bg-gray-50 transition">
                    <td className="p-3 border font-medium text-green-600">
                      ${Number(displayAmount).toFixed(2)}
                    </td>
                    <td className="p-3 border text-gray-600">
                      {recordDate
                        ? format(new Date(recordDate), 'dd-MM-yyyy HH:mm')
                        : 'N/A'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepositHistory;