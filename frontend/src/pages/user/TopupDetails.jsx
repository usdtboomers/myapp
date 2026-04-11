import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import api from "api/axios";
import BASE_URL from "../../config";

const TopupDetails = () => {
  const { user } = useAuth();
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔹 New States for Search and Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchTopups = async () => {
      if (!user?.userId) {
        setLoading(false);
        setError("User not found. Please log in.");
        return;
      }

      try {
        const res = await api.get(`/wallet/topup-history/${user.userId}`);
        if (Array.isArray(res.data)) {
          const userTopups = res.data
            .filter((t) => t.type === "topup")
            // Ignore PROMOTION topups
            .filter((t) => !t.description?.toUpperCase().includes("PROMOTION"));

          // Remove duplicates based on _id + createdAt
          const uniqueTopups = Array.from(
            new Map(userTopups.map((t) => [`${t._id}-${t.createdAt}`, t])).values()
          );

          setTopups(uniqueTopups);
        } else {
          setTopups([]);
        }
      } catch (err) {
        console.error("Topup fetch error:", err.response?.data || err.message);
        setError(err.response?.data?.message || "Failed to load top-ups.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopups();
  }, [user]);

  // 🔹 Search Logic
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Jab bhi search karein, page 1 par wapas aa jayein
  };

  const filteredTopups = topups.filter((t) => {
    const searchLower = searchQuery.toLowerCase();
    const senderIdStr = (t.fromUserId || t.userId || "").toString().toLowerCase();
    const receiverIdStr = (t.toUserId || t.userId || "").toString().toLowerCase();
    const descStr = (t.description || "").toLowerCase();
    const amountStr = (t.amount || "").toString().toLowerCase();

    return (
      senderIdStr.includes(searchLower) ||
      receiverIdStr.includes(searchLower) ||
      descStr.includes(searchLower) ||
      amountStr.includes(searchLower)
    );
  });

  // 🔹 Pagination Logic
  const totalPages = Math.ceil(filteredTopups.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredTopups.slice(indexOfFirstRow, indexOfLastRow);

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1); // Rows badalne par page 1 par wapas
  };

  return (
    <div className="p-4 sm:p-6 text-gray-900">
      <h1 className="text-xl sm:text-2xl text-white font-bold mb-2">💰 Top-Up Details</h1>
      <p className="text-sm sm:text-base text-white mb-4">
        View all your top-up history, including self and team top-ups.
      </p>

      <div className="bg-white shadow-sm rounded-lg p-3 sm:p-4 border border-gray-200">
        
        {/* 🔹 Search Bar */}
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <input
            type="text"
            placeholder="Search by ID, Details, or Amount..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full sm:w-1/3 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse whitespace-nowrap">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="p-2 sm:p-3 border border-blue-400 text-center">Sr No</th>
                <th className="p-2 sm:p-3 border border-blue-400">Sender ID</th>
                <th className="p-2 sm:p-3 border border-blue-400">Receiver ID</th>
                <th className="p-2 sm:p-3 border border-blue-400">Details</th>
                <th className="p-2 sm:p-3 border border-blue-400">Amount</th>
                <th className="p-2 sm:p-3 border border-blue-400">Top-Up Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    Loading top-ups...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : currentRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    No top-up records found.
                  </td>
                </tr>
              ) : (
                currentRows.map((t, idx) => {
                  
                  // 🔥 Accurate Logic for Sender & Receiver
                  const senderId = t.fromUserId || t.userId || "N/A";
                  const receiverId = t.toUserId || t.userId || "N/A";
                  const descLower = (t.description || "").toLowerCase();
                  
                  let tag = null;

                  // Conditions to check if it's Self, Received, or Sent
                  if (senderId === receiverId || descLower.includes("self")) {
                    tag = <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold border border-green-200">Self</span>;
                  } else if (receiverId === user.userId || descLower.includes("received")) {
                    tag = <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold border border-purple-200">Received</span>;
                  } else if (senderId === user.userId || descLower.includes("sent")) {
                    tag = <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold border border-orange-200">Sent</span>;
                  }

                  return (
                    <tr
                      key={`${t._id}-${t.createdAt}-${idx}`}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100 transition-colors"}
                    >
                      {/* Sr No */}
                      <td className="p-2 sm:p-3 border text-gray-800 text-center font-medium">
                        {indexOfFirstRow + idx + 1}
                      </td>

                      {/* Sender ID (fromUserId) */}
                      <td className="p-2 sm:p-3 border text-gray-800 font-bold">
                        {senderId}
                      </td>

                      {/* Receiver ID (toUserId) + TAG */}
                      <td className="p-2 sm:p-3 border text-gray-800 font-bold">
                        {receiverId} 
                        {tag}
                      </td>

                      {/* Description Details */}
                      <td className="p-2 sm:p-3 border text-gray-600 capitalize">
                        {t.description || "Top-up package"}
                      </td>

                      {/* Amount */}
                      <td className="p-2 sm:p-3 border text-blue-600 font-bold">
                        ${t.amount}
                      </td>

                      {/* Date */}
                      <td className="p-2 sm:p-3 border text-gray-700">
                        {t.createdAt
                          ? format(new Date(t.createdAt), "dd-MM-yyyy HH:mm")
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 🔹 Pagination Controls */}
        {!loading && filteredTopups.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-700">
            <div>
              Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, filteredTopups.length)} of {filteredTopups.length} entries
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                Rows per page:
                <select
                  value={rowsPerPage}
                  onChange={handleRowsPerPageChange}
                  className="p-1 border border-gray-300 rounded focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-blue-600 hover:bg-blue-50 border-blue-300"
                  }`}
                >
                  Prev
                </button>
                <span className="px-3 py-1 bg-blue-500 text-white rounded">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-blue-600 hover:bg-blue-50 border-blue-300"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TopupDetails;