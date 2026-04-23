import React, { useEffect, useState, useMemo } from "react";
import api from "../../api/axios"; 
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
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  
  // ✅ NAYA UPDATE: Loading State add kiya hai
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId) return;

    const fetchAllTeam = async () => {
      setIsLoading(true); // Data fetch hone se pehle loading true
      try {
        const res = await api.get(`/user/all-team/${user.userId}`);
        
        let teamData = (res.data.team || []).filter(u => u.level > 0);
        setTeam(teamData);
        
        setStats({
          totalTeam: teamData.length,
          activeTeam: teamData.filter(u => u.topUpAmount > 0).length
        });
      } catch (err) {
        console.error("Error fetching all team:", err);
      } finally {
        setIsLoading(false); // Data aane ke baad loading false
      }
    };
    fetchAllTeam();
  }, [user?.userId]);

  // ✅ NAYA UPDATE: useMemo lagaya taaki browser hang na ho
  const sortedAndFilteredTeam = useMemo(() => {
    let filtered = team.filter(
      (u) =>
        u.userId?.toString().includes(search) ||
        u.name?.toLowerCase().includes(search.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (!sortConfig.key) return 0;
      let aValue = a[sortConfig.key] || "";
      let bValue = b[sortConfig.key] || "";
      
      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();
      
      if (sortConfig.key === "createdAt") {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }
      
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [team, search, sortConfig]);

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentItems = sortedAndFilteredTeam.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedAndFilteredTeam.length / entriesPerPage) || 1;

  const handleNext = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const handlePrev = () => currentPage > 1 && setCurrentPage(prev => prev - 1);
  const handleEntriesChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    if (!key) return; 
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const tableColumns = [
    { label: "Sr", key: null },
    { label: "Lvl", key: "level" },
    { label: "User ID", key: "userId" },
    { label: "Top-Up ($)", key: "topUpAmount" },
    { label: "Name", key: "name" },
    { label: "Country", key: "country" },
    { label: "Joined", key: "createdAt" }
  ];

  return (
    <div style={styles.container}>
      <h2 className="text-white font-bold p-1 text-xl" style={{ marginBottom: 10 }}>🌍 Downline Team </h2>
      
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
      
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by name or ID"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          style={styles.searchInput}
        />
        <select value={entriesPerPage} onChange={handleEntriesChange} style={styles.select}>
          <option value={10}>Show 10</option>
          <option value={25}>Show 25</option>
          <option value={50}>Show 50</option>
          <option value={100}>Show 100</option>
        </select>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              {tableColumns.map((col) => (
                <th
                  key={col.label}
                  style={{ ...styles.th, cursor: col.key ? "pointer" : "default" }}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortConfig.key === col.key && (
                    <span style={{ marginLeft: "5px", fontSize: "10px" }}>
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ✅ NAYA UPDATE: Data load hone tak loading message dikhega */}
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "#4A90E2", fontWeight: "bold" }}>
                  ⏳ Loading Team Data... Please wait.
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
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
                  <td style={styles.td}>
                    <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "10px" }}>
                      L-{u.level}
                    </span>
                  </td>
                  <td style={styles.td}>{u.userId}</td>
                  <td style={{ ...styles.td, fontWeight: "bold", color: u.topUpAmount > 0 ? "green" : "red" }}>
                    ${u.topUpAmount || 0}
                  </td>
                  <td
                    style={{ ...styles.td, ...styles.nameCell }}
                    title={u.name || "-"}
                  >
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
      
      <div style={styles.pagination}>
        <button onClick={handlePrev} disabled={currentPage === 1} style={styles.pageBtn(currentPage === 1)}>
          ⬅ Prev
        </button>
        <span className="text-white" style={styles.pageText}>
          Page <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
        </span>
        <button onClick={handleNext} disabled={currentPage === totalPages} style={styles.pageBtn(currentPage === totalPages)}>
          Next ➡
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: "10px", fontFamily: "Inter, sans-serif", fontSize: 12 },
  statCard: { backgroundColor: "white", padding: "10px", borderRadius: "8px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", border: "1px solid #ddd" },
  statTitle: { fontSize: "11px", textTransform: "uppercase", fontWeight: "bold", color: "#666", letterSpacing: "0.5px" },
  statValue: { fontSize: "20px", fontWeight: "bold", marginTop: "4px" },
  controls: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  searchInput: { flex: "1 1 140px", padding: "8px", borderRadius: 4, border: "1px solid #ccc", fontSize: 12 },
  select: { padding: "6px", borderRadius: 4, border: "1px solid #ccc", fontSize: 12 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "500px", fontSize: 11 },
  headerRow: { backgroundColor: "#4A90E2", color: "white", textAlign: "left", userSelect: "none" },
  th: { padding: "8px", fontWeight: 600, borderBottom: "2px solid #ddd", transition: "background 0.2s ease" },
  td: { padding: "6px 8px", borderBottom: "1px solid #eee", color: "#333" },
  nameCell: { maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  tr: { transition: "background 0.2s ease" },
  emptyCell: { textAlign: "center", padding: "12px", color: "#777", fontSize: 11 },
  pagination: { marginTop: 15, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 },
  pageBtn: (disabled) => ({ padding: "6px 12px", borderRadius: 4, backgroundColor: disabled ? "#ccc" : "#4A90E2", color: "white", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 11 }),
  pageText: { fontSize: "12px" }
};

export default AllTeamPage;