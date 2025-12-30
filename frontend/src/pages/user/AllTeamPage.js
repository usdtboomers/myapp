import React, { useEffect, useState } from "react";
import api from "api/axios";
import useAuth from "../../hooks/useAuth";

const AllTeamPage = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState({
    totalTeam: 0,
    activeTeam: 0
  });
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user?.userId) return;
    const fetchAllTeam = async () => {
      try {
        const res = await api.get(`/user/all-team/${user.userId}`);
        let teamData = res.data.team || [];

        // ✅ YAHAN HAI SORTING LOGIC (Change here)
        // new Date(b.createdAt) - new Date(a.createdAt) = Jo naya hai wo UPAR aayega
        teamData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setTeam(teamData);

        // Stats Calculate karna
        setStats({
          totalTeam: res.data.totalTeamCount || teamData.length,
          activeTeam: teamData.filter(u => u.topUpAmount > 0).length
        });

      } catch (err) {
        console.error("Error fetching all team:", err);
      }
    };
    fetchAllTeam();
  }, [user?.userId]);

  const filtered = team.filter(
    (u) =>
      u.userId?.toString().includes(search) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / entriesPerPage);

  const handleNext = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const handlePrev = () => currentPage > 1 && setCurrentPage(prev => prev - 1);
  const handleEntriesChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div style={styles.container}>
      <h2 className="text-white font-bold p-1 text-xl" style={{marginBottom: 10}}>🌍 All Team (Downline)</h2>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Total Team</h3>
          <p style={styles.statValue} className="text-blue-600">{stats.totalTeam}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Active Users</h3>
          <p style={styles.statValue} className="text-green-600">{stats.activeTeam}</p>
        </div>
      </div>

      {/* Search + Entries (Controls Upar) */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select value={entriesPerPage} onChange={handleEntriesChange} style={styles.select}>
          <option value={10}>Show 10</option>
          <option value={25}>Show 25</option>
          <option value={50}>Show 50</option>
          <option value={100}>Show 100</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              {["Sr", "Lvl", "User ID", "Top-Up ($)", "Name", "Country", "Joined"].map((col) => (
                <th key={col} style={styles.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.emptyCell}>No team members found.</td>
              </tr>
            ) : (
              currentItems.map((u, i) => (
                <tr
                  key={u._id}
                  style={{
                    ...styles.tr,
                    backgroundColor: i % 2 === 0 ? "#fafafa" : "#fff",
                  }}
                >
                  <td style={styles.td}>{indexOfFirst + i + 1}</td>
                  
                  {/* Level Column */}
                  <td style={styles.td}>
                    <span style={{background: "#e3f2fd", color: "#1565c0", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "10px"}}>
                      L-{u.level}
                    </span>
                  </td>
                  
                  <td style={styles.td}>{u.userId}</td>
                  <td style={{ ...styles.td, fontWeight: "bold", color: u.topUpAmount > 0 ? "green" : "red" }}>
                    ${u.topUpAmount || 0}
                  </td>
                  <td style={styles.td}>{u.name || "-"}</td>
                  <td style={styles.td}>{u.country || "-"}</td>
                  <td style={styles.td}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (Buttons Niche) */}
      <div style={styles.pagination}>
        <button  onClick={handlePrev} disabled={currentPage === 1} style={styles.pageBtn(currentPage === 1)}>
          ⬅ Prev
        </button>
        <span className="text-white " style={styles.pageText}>
          Page <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
        </span>
        <button onClick={handleNext} disabled={currentPage === totalPages} style={styles.pageBtn(currentPage === totalPages)}>
          Next ➡
        </button>
      </div>
    </div>
  );
};

/* Styles */
const styles = {
  container: {
    padding: "10px",
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
  },
  statCard: {
    backgroundColor: "white",
    padding: "10px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    border: "1px solid #ddd"
  },
  statTitle: {
    fontSize: "11px",
    textTransform: "uppercase",
    fontWeight: "bold",
    color: "#666",
    letterSpacing: "0.5px"
  },
  statValue: {
    fontSize: "20px",
    fontWeight: "bold",
    marginTop: "4px"
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: "1 1 140px",
    padding: "8px",
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 12,
  },
  select: {
    padding: "6px",
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "500px",
    fontSize: 11,
  },
  headerRow: {
    backgroundColor: "#4A90E2",
    color: "white",
    textAlign: "left",
  },
  th: {
    padding: "8px",
    fontWeight: 600,
    borderBottom: "2px solid #ddd",
  },
  td: {
    padding: "6px 8px",
    borderBottom: "1px solid #eee",
    color: "#333",
  },
  tr: {
    transition: "background 0.2s ease",
  },
  emptyCell: {
    textAlign: "center",
    padding: "12px",
    color: "#777",
    fontSize: 11,
  },
  pagination: {
    marginTop: 15,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  pageBtn: (disabled) => ({
    padding: "6px 12px",
    borderRadius: 4,
    backgroundColor: disabled ? "#ccc" : "#4A90E2",
    color: "white",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 11,
  }),
};

export default AllTeamPage;