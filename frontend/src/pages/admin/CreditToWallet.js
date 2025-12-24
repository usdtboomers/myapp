import React, { useEffect, useState } from "react";
import axios from "axios";
import BASE_URL from "../../config";

// 🔐 Helper: safely convert Decimal128 / string / number to JS number
const toNumber = (val) => {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  if (typeof val === "object" && val.$numberDecimal) {
    return parseFloat(val.$numberDecimal) || 0;
  }
  return Number(val) || 0;
};

const CreditToWallet = () => {
  const [transactions, setTransactions] = useState([]); // All wallet credit transactions
  const [filtered, setFiltered] = useState([]);        // Filtered list
  const [currentPage, setCurrentPage] = useState(1);   // Current page number
  const [perPage, setPerPage] = useState(10);          // Transactions per page

  const [searchUser, setSearchUser] = useState("");   // Filter: User ID
  const [fromDate, setFromDate] = useState("");       // Filter: Start Date
  const [toDate, setToDate] = useState("");           // Filter: End Date

  useEffect(() => {
    fetchTransactions();
  }, []);

  /** Fetch all transactions from the backend */
  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      const res = await axios.get(`${BASE_URL}/api/admin/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data || !Array.isArray(res.data)) {
        setTransactions([]);
        setFiltered([]);
        return;
      }

      // Filter only wallet credit transactions and normalize Decimal128 → number
      const walletCredits = res.data
        .filter((tx) => tx.type === "credit_to_wallet")
        .map((tx) => ({
          _id: tx._id,
          userId: tx.userId ?? "-",
          name: tx.name ?? "-",
          source: tx.source ?? "-", // direct / level / spin
          amount: toNumber(tx.amount), // ✅ Decimal128 safe
          description:
            tx.description && tx.description !== ""
              ? tx.description
              : `Credited $${toNumber(tx.amount)} from ${tx.source ?? "-"} income to wallet`,
          type: tx.type,
          createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date(),
        }));

      setTransactions(walletCredits);
      setFiltered(walletCredits);
    } catch (err) {
      console.error("Error fetching wallet credit transactions:", err);
      alert("Error fetching transactions");
    }
  };

  /** Apply filtering whenever search or date changes */
  useEffect(() => {
    const filteredTx = transactions.filter((tx) => {
      const matchUser = searchUser ? tx.userId.toString().includes(searchUser) : true;
      const created = new Date(tx.createdAt);
      const matchFrom = fromDate ? created >= new Date(fromDate) : true;
      const matchTo = toDate ? created <= new Date(toDate) : true;
      return matchUser && matchFrom && matchTo;
    });
    setFiltered(filteredTx);
    setCurrentPage(1);
  }, [searchUser, fromDate, toDate, transactions]);

  /** Pagination calculations */
  const indexOfLast = currentPage * perPage;
  const indexOfFirst = indexOfLast - perPage;
  const currentTransactions = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / perPage);

  /** Totals */
  const totalAmount = transactions.reduce((sum, tx) => sum + toNumber(tx.amount), 0);
  const filteredTotal = filtered.reduce((sum, tx) => sum + toNumber(tx.amount), 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-indigo-600">💰 Wallet Credit Transactions</h2>

      {/* Totals */}
      <div className="flex flex-col md:flex-row justify-between mb-6 text-sm">
        <div>
          <span className="font-medium text-gray-700">Filtered Total: </span>
          <span className="text-purple-600">${filteredTotal.toFixed(2)}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Overall Total: </span>
          <span className="text-green-600">${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by User ID"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/4"
        />
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
        <select
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          className="px-4 py-2 border rounded w-full md:w-1/6"
        >
          {[10, 20, 50, 100].map((num) => (
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
              <th className="p-2 border">Source</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Time</th>
            </tr>
          </thead>
          <tbody>
            {currentTransactions.length > 0 ? (
              currentTransactions.map((tx, idx) => {
                const createdAt = new Date(tx.createdAt);
                return (
                  <tr key={idx} className="border-t text-sm">
                    <td className="p-2 border">{tx.userId}</td>
                    <td className="p-2 border">{tx.name}</td>
                    <td className="p-2 border">{tx.source}</td>
                    <td className="p-2 border">
                      ${toNumber(tx.amount).toFixed(2)}
                    </td>
                    <td className="p-2 border">{tx.type}</td>
                    <td className="p-2 border">
                      {createdAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-2 border">
                      {createdAt.toLocaleTimeString("en-US")}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-500">
                  No transactions found.
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
            onClick={() => currentPage > 1 && setCurrentPage((prev) => prev - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded ${
              currentPage === 1
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => currentPage < totalPages && setCurrentPage((prev) => prev + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded ${
              currentPage === totalPages
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CreditToWallet;
