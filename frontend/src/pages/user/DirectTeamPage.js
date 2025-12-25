import React, { useEffect, useState } from "react";
import api from "api/axios";
import { useAuth } from "../../context/AuthContext";

const DirectTeamPage = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  useEffect(() => {
    const fetchDirectTeam = async () => {
      if (!user?.userId) return;

      try {
        const res = await api.get(
          `/user/direct-team/${user.userId}`
        );
        setTeam(Array.isArray(res.data.team) ? res.data.team : []);
      } catch (err) {
        console.error("Error fetching direct team:", err);
        setTeam([]);
      }
    };

    fetchDirectTeam();
  }, [user?.userId]);

  const filtered = team.filter((u) => {
    const s = search.toLowerCase();
    return (
      u.userId?.toString().includes(s) ||
      u.name?.toLowerCase().includes(s) ||
      u.mobile?.toString().includes(s) ||
      u.country?.toLowerCase().includes(s) ||
      u.topUpAmount?.toString().includes(s) ||
      (u.createdAt &&
        new Date(u.createdAt).toLocaleDateString().toLowerCase().includes(s))
    );
  });

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / entriesPerPage);

  const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const handleEntriesChange = (e) => {
    setEntriesPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <h2 className="text-lg sm:text-2xl font-bold text-white mb-5 text-center">
        👥 Direct Team 
      </h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 justify-between">
        <input
          type="text"
          placeholder="🔍 Search by name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border border-gray-300 text-sm rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        <select
          value={entriesPerPage}
          onChange={handleEntriesChange}
          className="w-full sm:w-44 px-3 py-2 border border-gray-300 text-sm rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value={10}>Show 10</option>
          <option value={25}>Show 25</option>
          <option value={50}>Show 50</option>
          <option value={100}>Show 100</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="min-w-full text-xs sm:text-sm text-left border-collapse">
          <thead className="bg-indigo-50 text-indigo-800">
            <tr>
              <th className="p-2 sm:p-3 font-semibold border">Sr No.</th>
              <th className="p-2 sm:p-3 font-semibold border">User ID</th>
              <th className="p-2 sm:p-3 font-semibold border">Name</th>
              <th className="p-2 sm:p-3 font-semibold border">Mobile</th>
              <th className="p-2 sm:p-3 font-semibold border">Country</th>
              <th className="p-2 sm:p-3 font-semibold border">Top-Up ($)</th>
              <th className="p-2 sm:p-3 font-semibold border">Joined</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-4 text-white italic"
                >
                  No direct referrals found.
                </td>
              </tr>
            ) : (
              currentItems.map((member, index) => (
                <tr
                  key={member._id}
                  className={`${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-gray-100 transition`}
                >
                  <td className="p-2 sm:p-3 border text-gray-700 font-medium">
                    {indexOfFirst + index + 1}
                  </td>
                  <td className="p-2 sm:p-3 border text-gray-800">
                    {member.userId}
                  </td>
                  <td className="p-2 sm:p-3 border">{member.name || "-"}</td>
                  <td className="p-2 sm:p-3 border">{member.mobile || "-"}</td>
                  <td className="p-2 sm:p-3 border">{member.country || "-"}</td>
                  <td className="p-2 sm:p-3 border font-semibold text-gray-700">
                    ${member.topUpAmount || 0}
                  </td>
                  <td className="p-2 sm:p-3 border text-gray-600 whitespace-nowrap">
                    {member.createdAt
                      ? new Date(member.createdAt).toLocaleDateString("en-GB")
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-5 text-xs sm:text-sm">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`px-4 py-1 rounded-md text-white ${
            currentPage === 1
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          ⬅ Prev
        </button>

        <span className="text-gray-700 text-sm sm:text-base">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`px-4 py-1 rounded-md text-white ${
            currentPage === totalPages
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          Next ➡
        </button>
      </div>
    </div>
  );
};

export default DirectTeamPage;
