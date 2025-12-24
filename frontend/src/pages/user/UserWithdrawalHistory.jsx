import React, { useEffect, useState } from "react";
import axios from "axios";

function UserWithdrawalHistory() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState({});
  const itemsPerPage = 10;

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = Number(user?.userId);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        const res = await axios.get(
          `http://178.128.20.53/api/wallet/withdrawals/${userId}`
        );
        setWithdrawals(res.data.withdrawals || []);
      } catch (error) {
        console.error("Error fetching withdrawal history:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchWithdrawals();
    else setLoading(false);
  }, [userId]);

  const totalAmount = withdrawals.reduce(
    (sum, w) => sum + Number(w.grossAmount || 0),
    0
  );

  const filtered = withdrawals.filter((w) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      // include status, amount, date, wallet and source in search
      w.status?.toLowerCase().includes(searchLower) ||
      (w.grossAmount?.toString() || "").includes(searchLower) ||
      new Date(w.createdAt).toLocaleDateString("en-GB").includes(searchLower) ||
      (w.walletAddress?.toLowerCase() || "").includes(searchLower) ||
      (w.source?.toLowerCase() || "").includes(searchLower);

    const matchStatus =
      statusFilter === "all" ||
      w.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = sorted.slice(startIdx, startIdx + itemsPerPage);

  useEffect(() => setCurrentPage(1), [search, statusFilter]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-5 text-center text-white">
        📋 Withdrawal History
      </h1>

      <div className="mb-4 sm:mb-6 text-center text-sm sm:text-lg font-medium text-white">
        Total Withdrawn:{" "}
        <span className="text-yellow-400 font-semibold">
          ${totalAmount.toFixed(2)}
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
        <input
          type="text"
          placeholder="Search amount, status, wallet, date or source"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border text-sm border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-center text-gray-600 text-sm sm:text-base">
          Loading withdrawal history...
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-center text-gray-500 italic text-sm sm:text-base">
          No matching withdrawals found.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
            <table className="min-w-full text-xs sm:text-sm text-left border-collapse">
              <thead className="bg-indigo-50 text-indigo-800">
                <tr>
                  <th className="p-2 sm:p-3 border">SR</th>
                  <th className="p-2 sm:p-3 border">Gross</th>
                  <th className="p-2 sm:p-3 border">Fee</th>
                  <th className="p-2 sm:p-3 border">Net</th>
                  <th className="p-2 sm:p-3 border">Source</th> {/* NEW */}
                  <th className="p-2 sm:p-3 border">Wallet</th>
                  <th className="p-2 sm:p-3 border">Status</th>
                  <th className="p-2 sm:p-3 border">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, idx) => (
                  <React.Fragment key={item._id}>
                    <tr
                      onClick={() => toggleRow(item._id)}
                      className={`cursor-pointer transition duration-200 hover:bg-gray-100 ${
                        idx % 2 === 0 ? "bg-gray-50" : "bg-gray-100"
                      }`}
                    >
                      <td className="p-2 sm:p-3 font-medium text-gray-700">
                        {startIdx + idx + 1}
                      </td>
                      <td className="p-2 sm:p-3 font-semibold text-gray-700">
                        ${Number(item.grossAmount || 0).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600">
                        ${Number(item.fee || 0).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-3 font-medium text-gray-800">
                        ${Number(item.netAmount || 0).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600">
                        {item.source || "-"}
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600 break-words max-w-[120px] sm:max-w-none truncate">
                        {item.walletAddress || "N/A"}
                      </td>
                     <td className="p-2 sm:p-3">
  <span className="px-2 py-1 text-[10px] sm:text-xs font-bold rounded-full bg-green-100 text-green-800">
    SUCCESS
  </span>
</td>

                      <td className="p-2 sm:p-3 text-gray-600 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("en-GB")}
                      </td>
                    </tr>

                    {expandedRows[item._id] && (
                      <tr className="bg-gray-50 border-t shadow-inner">
                        <td colSpan={8} className="p-3 sm:p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs sm:text-sm">
                            <div>
                              <strong>User ID:</strong> {item.userId}
                            </div>
                             <div>
                              <strong>Source:</strong> {item.source || "-"}
                            </div>
                          </div>

                          {item.schedule?.length > 0 && (
                            <div className="mt-3">
                              <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">
                                📅 Payout Schedule
                              </h3>
                              <div className="overflow-x-auto border rounded">
                              <table className="w-full text-[10px] sm:text-sm text-left border-collapse">
  <thead className="bg-gray-200 text-gray-900">
    <tr>
      <th className="p-2 border">SR</th>
      <th className="p-2 border">Date</th>
      <th className="p-2 border">Gross</th>
      <th className="p-2 border">Fee</th>
      <th className="p-2 border">Net</th>
      <th className="p-2 border">%</th>
      <th className="p-2 border">Status</th>
    </tr>
  </thead>

  <tbody>
    {item.schedule.map((day, dayIdx) => (
      <tr
        key={dayIdx}
        className={dayIdx % 2 === 0 ? "bg-gray-50" : "bg-gray-100"}
      >
        <td className="p-2 border">{dayIdx + 1}</td>
        <td className="p-2 border">
          {new Date(day.date).toLocaleDateString("en-GB")}
        </td>
        <td className="p-2 border">
          ${Number(day.grossAmount || 0).toFixed(2)}
        </td>
        <td className="p-2 border">
          ${Number(day.fee || 0).toFixed(2)}
        </td>
        <td className="p-2 border">
          ${Number(day.netAmount || 0).toFixed(2)}
        </td>
<td className="p-2 border">
  {(day.percent || 0) * 2}%
</td>
        <td className="p-2 border">
  <span
    className={`px-2 py-[2px] rounded-full text-xs font-semibold ${
      day.status?.toLowerCase() === "approved"
        ? "bg-green-200 text-green-900"
        : day.status?.toLowerCase() === "pending"
        ? "bg-yellow-200 text-yellow-900"
        : day.status?.toLowerCase() === "rejected"
        ? "bg-red-200 text-red-900"
        : "bg-gray-200 text-gray-800"
    }`}
  >
    {(day.status || "N/A").toUpperCase()}
  </span>
</td>

      </tr>
    ))}
  </tbody>
</table>

                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4 sm:mt-6 text-xs sm:text-sm">
            <span className="text-white">
              Showing {startIdx + 1}-
              {Math.min(startIdx + itemsPerPage, sorted.length)} of{" "}
              {sorted.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-1 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 sm:px-4 py-1 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default UserWithdrawalHistory;
