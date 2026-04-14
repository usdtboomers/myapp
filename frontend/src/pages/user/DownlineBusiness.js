import React, { useEffect, useState } from "react";
import api from "api/axios";
import { useAuth } from "../../context/AuthContext";

const DownlineBusiness = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("all");

  useEffect(() => {
    const fetchDownline = async () => {
      try {
        const res = await api.get(`/user/downline-business/${user.userId}`);
        const team = res.data.team || [];

        const allTx = team.flatMap(d =>
          (d.transactions || []).map(t => ({
            ...t,
            userId: d.userId,
            name: d.name,
            level: d.level,
          }))
        );

        allTx.sort((a, b) => new Date(b.date) - new Date(a.date));

        setTransactions(allTx);
        setFiltered(allTx);

        setSummary({
          totalBusiness: res.data.totalBusiness ?? 0,
          totalTeamCount: res.data.totalTeamCount ?? 0,
          directCount: res.data.directCount ?? 0,
          indirectCount: res.data.indirectCount ?? 0,
        });
      } catch (err) {
        console.error("Error fetching downline business:", err);
      }
    };

    fetchDownline();
  }, [user.userId]);

  // Filters
  useEffect(() => {
    let data = [...transactions];

    if (search) {
      data = data.filter(
        t =>
          String(t.userId).includes(search) ||
          (t.name && t.name.toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      data = data.filter(t => new Date(t.date) >= from);
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      data = data.filter(t => new Date(t.date) <= to);
    }

    if (transactionFilter !== "all") {
      data = data.filter(t => t.type === transactionFilter);
    }

    setFiltered(data);
    setCurrentPage(1);
  }, [search, fromDate, toDate, transactionFilter, transactions]);

  // Pagination
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const pageCount = Math.ceil(filtered.length / itemsPerPage);

 const pageTotal = paginated.reduce(
  (sum, t) => sum + Number(t.amount || 0),
  0
);

const filteredTotal = filtered.reduce(
  (sum, t) => sum + Number(t.amount || 0),
  0
);

  return (
    <div style={{ padding: 20, fontFamily: "Segoe UI, sans-serif", fontSize: 13 }}>
      <h3 className="text-white font-bold" style={{ marginBottom: 12 }}>📊 Downline Business</h3>

      {/* Summary */}
      <div className="text-white" style={{ marginBottom: 12, fontSize: 13 }}>
        <p><strong>Total Team:</strong> {summary.totalTeamCount}</p>
        <p><strong>Direct Count:</strong> {summary.directCount}</p>
        <p><strong>Downline Count:</strong> {summary.indirectCount}</p>
        <p className="text-yellow-500"><strong className="text-white"> Total Business:</strong> ${Number(summary.totalBusiness).toFixed(2)}</p>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 12, display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search ID or Name"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
        <select value={transactionFilter} onChange={e => setTransactionFilter(e.target.value)} style={inputStyle}>
          <option value="all">All</option>
          <option value="topup">Topup</option>
          <option value="withdrawal">Withdrawal</option>
        </select>
        <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} style={inputStyle}>
          {[10, 20, 50].map(num => (
            <option key={num} value={num}>{num} / page</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={theadTrStyle}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>User ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Level</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              <>
                {paginated.map((t, idx) => (
                  <tr key={idx} style={{ background: idx % 2 ? "#fafafa" : "#fff" }}>
                    <td style={tdStyle}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td style={tdStyle}>{t.userId}</td>
                    <td style={tdStyle}>{t.name}</td>
                    <td style={tdStyle}>{t.level}</td>
                    <td style={tdStyle}>{t.type}</td>
                    <td style={tdStyle}>${Number(t.amount ?? 0).toFixed(2)}</td>
                    <td style={tdStyle}>{new Date(t.date).toLocaleDateString()}</td>
                  </tr>
                ))}

                {/* Totals */}
                <tr style={{ background: "#f4f4f4", fontWeight: "bold" }}>
                  <td colSpan={5} style={{ textAlign: "right", padding: "6px 8px" }}>Page Total:</td>
<td style={tdStyle}>${Number(pageTotal).toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr style={{ background: "#eaeaea", fontWeight: "bold" }}>
                  <td colSpan={5} style={{ textAlign: "right", padding: "6px 8px" }}>Filtered Total:</td>
<td style={tdStyle}>${Number(filteredTotal).toFixed(2)}</td>
                  <td></td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="text-white" colSpan="7" style={{ textAlign: "center", padding: 12 }}>No transactions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 13 }}>
          <button className="text-white" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={btnStyle}>⏮ Prev</button>
          <span className="text-white" style={{ margin: "0 8px" }}>Page {currentPage} / {pageCount}</span>
          <button className="text-white" disabled={currentPage === pageCount} onClick={() => setCurrentPage(p => p + 1)} style={btnStyle}>Next ⏭</button>
        </div>
      )}
    </div>
  );
};

const inputStyle = { padding: 5, borderRadius: 4, border: "1px solid #ccc", fontSize: 12, maxWidth: 200 };
const tableStyle = { width: "100%", borderCollapse: "collapse", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" };
const thStyle = { textAlign: "left", padding: "6px 8px", fontWeight: "600", borderBottom: "1px solid #ddd", fontSize: 12 };
const tdStyle = { padding: "6px 8px", borderBottom: "1px solid #eee", fontSize: 12 };
const theadTrStyle = { background: "#1565c0", color: "#fff" };
const btnStyle = { padding: "4px 10px", margin: "0 3px", border: "1px solid #ccc", borderRadius: 3, cursor: "pointer", fontSize: 12 };

export default DownlineBusiness;
