import React, { useEffect, useState } from "react";
import api from "../../api/axios"; 
import useAuth from "../../hooks/useAuth"; 

const AllTeamPage = () => {
  const { user } = useAuth();
  
  // State Management
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState({
    totalTeam: 0,
    activeTeam: 0
  });
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false); // ✅ Added loading state for better UI

  useEffect(() => {
    if (!user?.userId) return;

    const fetchAllTeam = async () => {
      setIsLoading(true);
      try {
        // 🔥 Server-Side Fetching (Sirf required data aayega)
        const res = await api.get(`/user/all-team/${user.userId}`, {
          params: {
            page: currentPage,
            limit: entriesPerPage,
            search: search
          }
        });

        // ✅ Direct set karein, koi local filter ki zarurat nahi
        setTeam(res.data.team || []);

        // ✅ Stats update (Backend ke exact naam use kiye hain)
        setStats({
          totalTeam: res.data.totalCount || res.data.totalTeamCount || 0,
          activeTeam: res.data.activeCount || 0
        });

      } catch (err) {
        console.error("Error fetching all team:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // 🔥 DEBOUNCING: Search type karne ke 500ms baad ek hi API call jayegi
    const delayDebounceFn = setTimeout(() => {
      fetchAllTeam();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [user?.userId, currentPage, entriesPerPage, search]); 

  // ✅ Pagination Math (Total pages server se aaye count se banenge)
  const totalPages = Math.ceil(stats.totalTeam / entriesPerPage) || 1;
  const indexOfFirst = (currentPage - 1) * entriesPerPage;

  // Handlers
  const handleNext = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const handlePrev = () => currentPage > 1 && setCurrentPage(prev => prev - 1);
  const handleEntriesChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Rows change karne par page 1 par wapas aao
  };

  // ✅ Columns Definition (Local sorting hata di hai kyunki backend by default latest first de raha hai)
  const tableColumns = [
    { label: "Sr" },
    { label: "Lvl" },
    { label: "User ID" },
    { label: "Top-Up ($)" },
    { label: "Name" },
    { label: "Country" },
    { label: "Joined" }
  ];

  return (
    <div style={styles.container}>
      <h2 className="text-white font-bold p-1 text-xl" style={{ marginBottom: 10 }}>🌍 Downline Team </h2>
      
      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Total Downline Team</h3>
          <p style={styles.statValue} className="text-blue-600">{stats.totalTeam}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Active Users</h3>
          <p style={styles.statValue} className="text-green-600">{stats.activeTeam}</p>
        </div>
      </div>

      {/* Search + Entries */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by name or ID"
          value={search}
          onChange={(e) => { 
            setSearch(e.target.value); 
            setCurrentPage(1); // Naya search karne par page 1 par jao
          }}
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
      <div style={{ overflowX: "auto", position: "relative" }}>
        
        {/* Loading Indicator */}
        {isLoading && (
          <div style={styles.loaderOverlay}>
            <span style={{color: '#4A90E2', fontWeight: 'bold'}}>Loading Data...</span>
          </div>
        )}

        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              {tableColumns.map((col, idx) => (
                <th key={idx} style={styles.th}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="7" style={styles.emptyCell}>No team members found.</td>
              </tr>
            ) : (
              team.map((u, i) => (
                <tr
                  key={u._id || i}
                  style={{
                    ...styles.tr,
                    backgroundColor: i % 2 === 0 ? "#fafafa" : "#fff",
                    opacity: isLoading ? 0.5 : 1 // Loading ke time table thoda dim ho jayega
                  }}
                >
                  {/* Serial Number calculation */}
                  <td style={styles.td}>{indexOfFirst + i + 1}</td>
                  
                  {/* Level Column */}
                  <td style={styles.td}>
                    <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "10px" }}>
                      L-{u.level}
                    </span>
                  </td>
                  
                  <td style={styles.td}>{u.userId}</td>
                  <td style={{ ...styles.td, fontWeight: "bold", color: u.topUpAmount > 0 ? "green" : "red" }}>
                    ${u.topUpAmount || 0}
                  </td>
                  
                  {/* Name Column */}
                  <td style={{ ...styles.td, ...styles.nameCell }} title={u.name || "-"}>
                    {u.name || "-"}
                  </td>                  
                  
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
        <span className="text-white" style={styles.pageText}>
          Page <strong>{currentPage}</strong> / <strong>{totalPages === 0 ? 1 : totalPages}</strong>
        </span>
        <button onClick={handleNext} disabled={currentPage === totalPages || totalPages === 0} style={styles.pageBtn(currentPage === totalPages || totalPages === 0)}>
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
  loaderOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10
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
    userSelect: "none"
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
  nameCell: {
    maxWidth: "120px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
  pageText: {
    fontSize: "12px",
  }
};

export default AllTeamPage;