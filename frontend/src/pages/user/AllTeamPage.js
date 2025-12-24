import React, { useEffect, useState } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";

const AllTeamPage = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user?.userId) return;
    const fetchAllTeam = async () => {
      try {
        const res = await axios.get(`http://178.128.20.53:5000/api/user/all-team/${user.userId}`);
        setTeam(res.data.team || []);
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
      <h2 style={styles.title}>🌍 All Team (Downline)</h2>

      {/* Search + Entries */}
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
                  <td style={styles.td}>{u.level}</td>
                  <td style={styles.td}>{u.userId}</td>
                  <td style={styles.td}>${u.topUpAmount || 0}</td>
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

      {/* Pagination */}
      <div style={styles.pagination}>
        <button onClick={handlePrev} disabled={currentPage === 1} style={styles.pageBtn(currentPage === 1)}>
          ⬅ Prev
        </button>
        <span style={styles.pageText}>
          Page <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
        </span>
        <button onClick={handleNext} disabled={currentPage === totalPages} style={styles.pageBtn(currentPage === totalPages)}>
          Next ➡
        </button>
      </div>
    </div>
  );
};

/* Styles (smaller for mobile) */
const styles = {
  container: {
    padding: "8px",
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
  },
  title: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: 8,
    color: "#222",
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: "1 1 140px",
    padding: "6px",
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
    padding: "6px",
    fontWeight: 600,
    borderBottom: "2px solid #ddd",
  },
  td: {
    padding: "4px 6px",
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
    marginTop: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  pageBtn: (disabled) => ({
    padding: "4px 8px",
    borderRadius: 4,
    backgroundColor: disabled ? "#ccc" : "#4A90E2",
    color: "white",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 11,
  }),
  pageText: { fontSize: 11, color: "#333" },
};

export default AllTeamPage;
