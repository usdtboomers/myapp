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
    // 🔹 Ignore PROMOTION topups
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

  return (
    <div className="p-4 sm:p-6 text-gray-900">
      <h1 className="text-xl sm:text-2xl  text-white font-bold mb-2">💰 Top-Up Details</h1>
      <p className="text-sm sm:text-base text-white mb-4">
        View all your purchased top-up packages below.
      </p>

      <div className="bg-white shadow-sm rounded-lg p-3 sm:p-4 border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="p-2 sm:p-3 border border-blue-400">Amount</th>
              <th className="p-2 sm:p-3 border border-blue-400">Top-Up Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="2" className="p-4 text-center text-gray-500">
                  Loading top-ups...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="2" className="p-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : topups.length === 0 ? (
              <tr>
                <td colSpan="2" className="p-4 text-center text-gray-500">
                  No top-up records found.
                </td>
              </tr>
            ) : (
              topups.map((t, idx) => (
                <tr
                  key={`${t._id}-${t.createdAt}-${idx}`}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="p-2 sm:p-3 border text-gray-800 font-medium">
                    ${t.amount}
                  </td>
                  <td className="p-2 sm:p-3 border text-gray-700">
                    {t.createdAt
                      ? format(new Date(t.createdAt), "dd-MM-yyyy HH:mm")
                      : "N/A"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopupDetails;
