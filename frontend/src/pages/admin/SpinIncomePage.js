import React, { useEffect, useState } from "react";
import axios from "axios";

// 🔹 Helpers: Decimal128 / string / number -> safe number + formatted string
const normalizeAmount = (value) => {
  if (value == null) return 0;

  // Already number
  if (typeof value === "number") {
    return Number.isNaN(value) ? 0 : value;
  }

  // String like "$10", "10 USDT"
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
  }

  // Mongo Decimal128 JSON: { $numberDecimal: "123.45" }
  if (typeof value === "object") {
    if (value.$numberDecimal) {
      const n = Number(value.$numberDecimal);
      return Number.isNaN(n) ? 0 : n;
    }

    // Direct Decimal128 instance
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

const SpinIncomePage = () => {
  const [incomes, setIncomes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [searchUser, setSearchUser] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  // Fetch spin income from backend
  const fetchSpinIncome = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (searchUser) params.userId = searchUser;

      const { data } = await axios.get(
        "http://143.198.205.94:5000/api/admin/spin-income",
        { headers: { Authorization: `Bearer ${token}` }, params }
      );

      // Default sorting: newest first
      const sortedData = data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setIncomes(sortedData);
      setFiltered(sortedData);
    } catch (err) {
      console.error("Error fetching spin income:", err);
    }
  };

  useEffect(() => {
    fetchSpinIncome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and sort
  useEffect(() => {
    let filteredData = incomes.filter((tx) => {
      const matchUser = searchUser
        ? tx.userId?.toString().includes(searchUser)
        : true;
      const created = new Date(tx.createdAt);
      const matchFrom = fromDate ? created >= new Date(fromDate) : true;
      const matchTo = toDate ? created <= new Date(toDate) : true;
      return matchUser && matchFrom && matchTo;
    });

    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "createdAt") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortConfig.key === "amount") {
          aValue = normalizeAmount(aValue);
          bValue = normalizeAmount(bValue);
        } else if (
          sortConfig.key === "availableSpins" ||
          sortConfig.key === "usedSpins"
        ) {
          aValue = normalizeAmount(aValue);
          bValue = normalizeAmount(bValue);
        } else if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = (bValue || "").toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFiltered(filteredData);
    setCurrentPage(1);
  }, [searchUser, fromDate, toDate, incomes, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Pagination
  const indexOfLast = currentPage * perPage;
  const indexOfFirst = indexOfLast - perPage;
  const currentIncomes = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / perPage);

  // Totals (Decimal-safe)
  const totalAmount = incomes.reduce(
    (sum, tx) => sum + normalizeAmount(tx.amount),
    0
  );
  const filteredTotal = filtered.reduce(
    (sum, tx) => sum + normalizeAmount(tx.amount),
    0
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-indigo-600">
        🎰 Spin Transactions
      </h2>

      {/* Totals */}
      <div className="flex justify-between mb-4 text-sm font-medium">
        <span>
          Filtered Total:{" "}
          <span className="text-purple-600">
            ${filteredTotal.toFixed(2)}
          </span>
        </span>
        <span>
          Overall Total:{" "}
          <span className="text-green-600">
            ${totalAmount.toFixed(2)}
          </span>
        </span>
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
              {[
                { label: "User ID", key: "userId" },
                { label: "Name", key: "name" },
                { label: "Type", key: "type" },
                { label: "Amount", key: "amount" },
                { label: "Available Spins", key: "availableSpins" },
                { label: "Used Spins", key: "usedSpins" },
                { label: "Description", key: "description" },
                { label: "Date", key: "createdAt" },
                { label: "Time", key: "createdAt" },
              ].map((col) => (
                <th
                  key={col.label + col.key}
                  className="p-2 border cursor-pointer select-none"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{" "}
                  {sortConfig.key === col.key
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentIncomes.length ? (
              currentIncomes.map((tx) => {
                const createdAt = new Date(tx.createdAt);
                const availableSpins = normalizeAmount(tx.availableSpins ?? 0);
                const usedSpins = normalizeAmount(tx.usedSpins ?? 0);

                return (
                  <tr key={tx._id} className="border-t text-sm">
                    <td className="p-2 border">{tx.userId}</td>
                    <td className="p-2 border">{tx.name || "-"}</td>
                    <td className="p-2 border">{tx.type}</td>
                    <td className="p-2 border">
                      {tx.type === "buy_spin"
                        ? `$${formatAmount(tx.amount)}`
                        : formatAmount(tx.amount)}
                    </td>
                    <td className="p-2 border text-green-600 font-medium">
                      {availableSpins}
                    </td>
                    <td className="p-2 border text-red-600 font-medium">
                      {usedSpins}
                    </td>
                    <td className="p-2 border">{tx.description || "-"}</td>
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
                <td colSpan="9" className="text-center py-4 text-gray-500">
                  No records found.
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
            onClick={() =>
              currentPage > 1 && setCurrentPage((prev) => prev - 1)
            }
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
            onClick={() =>
              currentPage < totalPages && setCurrentPage((prev) => prev + 1)
            }
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

export default SpinIncomePage;
