import React, { useEffect, useState } from "react";
import api from "api/axios";
import { useAuth } from "../../context/AuthContext";

const DirectTeamPage = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [totalTeamCount, setTotalTeamCount] = useState(0);
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
        
        const teamData = Array.isArray(res.data.team) ? res.data.team : [];
        setTeam(teamData);
        setTotalTeamCount(res.data.totalTeam || res.data.totalTeamCount || 0);

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
      u.country?.toLowerCase().includes(s)
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

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
          <h3 className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider">
            My Directs
          </h3>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-2">
            {team.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
          <h3 className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider">
            Total Team
          </h3>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-2">
            {totalTeamCount}
          </p>
        </div>
      </div>

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
              <th className="p-2 sm:p-3 font-semibold border text-center">Directs</th>
              <th className="p-2 sm:p-3 font-semibold border text-center">Team Size</th>
              <th className="p-2 sm:p-3 font-semibold border">Mobile</th>
              <th className="p-2 sm:p-3 font-semibold border">Top-Up ($)</th>
              <th className="p-2 sm:p-3 font-semibold border">Joined</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
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
                  <td className="p-2 sm:p-3 border text-gray-800 font-bold">
                    {member.userId}
                  </td>
                  <td className="p-2 sm:p-3 border font-medium text-indigo-700">
                    {member.name || "-"}
                  </td>

                  <td className="p-2 sm:p-3 border text-center">
                    <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded-full text-xs font-bold">
                      {member.totalDirects || member.directCount || 0}
                    </span>
                  </td>

                  <td className="p-2 sm:p-3 border text-center">
                    <span className="bg-purple-100 text-purple-800 py-1 px-2 rounded-full text-xs font-bold">
                      {member.totalTeam || member.teamCount || 0}
                    </span>
                  </td>

                  {/* ✅ EDITED: Mobile Number with Better WhatsApp Icon */}
                  <td className="p-2 sm:p-3 border">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-700">{member.mobile || "-"}</span>
                        {member.mobile && (
                            <a 
                                href={`https://wa.me/${member.mobile}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                            >
                                {/* Correct Filled WhatsApp SVG */}
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="24" 
                                  height="24" 
                                  viewBox="0 0 24 24" 
                                  fill="#25D366"
                                  className="hover:opacity-80 transition-opacity"
                                >
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                </svg>
                            </a>
                        )}
                    </div>
                  </td>

                  <td className="p-2 sm:p-3 border font-semibold text-green-600">
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

        <span className="text-white text-sm sm:text-base">
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