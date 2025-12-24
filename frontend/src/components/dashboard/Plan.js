// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useAuth } from "../../context/AuthContext"; // ✅ ADD THIS

// const plans = [
//   { amount: 30, baseIncome: 1 },
//   { amount: 60, baseIncome: 2 },
//   { amount: 120, baseIncome: 4 },
//   { amount: 240, baseIncome: 8 },
// ];

// const getStatusColor = (status) =>
//   status === "achieved" ? "#2a9d8f" : status === "active" ? "#f4a261" : "#d62828";

// export default function Plan() {
//   const { user, updateUser, token } = useAuth(); // ✅ use context user
//   const [levels, setLevels] = useState({});
//   const [timers, setTimers] = useState({});
//   const [selectedTopUp, setSelectedTopUp] = useState(30);
//   const [showTopupPopup, setShowTopupPopup] = useState(false);

//   useEffect(() => {
//     if (user) {
//       setShowTopupPopup(!user.isToppedUp);
//     }
//   }, [user]);

//   useEffect(() => {
//     if (!user?.isToppedUp || !user?.levelStatus) return;

//     const now = Date.now();
//     const applicablePlans = plans.filter((p) => user.topUpAmount >= p.amount);

//     const updatedLevels = {};
//     const newTimers = {};

//     for (const plan of applicablePlans) {
//       const raw = user.levelStatus[String(plan.amount)] || [];

//       const processed = raw.map((lvl) => {
//         const unlockTime = new Date(lvl.unlockTime).getTime();
//         if (lvl.status === "achieved" || unlockTime <= now) {
//           return { ...lvl, status: "achieved" };
//         }
//         return { ...lvl, status: "unachieved" };
//       });

//       const next = processed.find((lvl) => lvl.status === "unachieved");
//       if (next) {
//         next.status = "active";
//         const seconds = Math.floor((new Date(next.unlockTime).getTime() - now) / 1000);
//         newTimers[plan.amount] = seconds > 0 ? seconds : 0;
//       }

//       updatedLevels[plan.amount] = processed;
//     }

//     setLevels(updatedLevels);
//     setTimers(newTimers);
//   }, [user]);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setTimers((prev) => {
//         const updated = { ...prev };
//         for (const key in prev) {
//           if (prev[key] > 0) updated[key]--;
//         }
//         return updated;
//       });
//     }, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   const formatTime = (seconds) => {
//     if (seconds <= 0) return "achieved";
//     const d = Math.floor(seconds / (24 * 3600));
//     seconds %= 24 * 3600;
//     const h = Math.floor(seconds / 3600);
//     seconds %= 3600;
//     const m = Math.floor(seconds / 60);
//     const s = seconds % 60;
//     return `${d ? d + "d " : ""}${h}h ${m}m ${s}s`;
//   };

//   const handleTopupConfirm = async (amount) => {
//     try {
//       const res = await axios.put(
//         `http://178.128.20.53:5000/api/user/topup/${user.userId}`,
//         { amount },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const updatedUser = res.data.user;

//       updateUser(updatedUser); // ✅ This updates context + localStorage
//       setShowTopupPopup(false);
//     } catch (err) {
//       alert("Top-up failed.");
//     }
//   };

//   return (
//     <div style={{ padding: 20, maxWidth: 900, margin: "auto", background: "#111", color: "#fff", borderRadius: 12 }}>
//       {showTopupPopup && (
//         <div style={{
//           position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
//           display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
//         }}>
//           <div style={{ background: "#fff", color: "#000", padding: 30, borderRadius: 10, maxWidth: 400 }}>
//             <h2>Select Top-up Amount</h2>
//             <select
//               style={{ padding: 10, marginTop: 10, width: "100%" }}
//               value={selectedTopUp}
//               onChange={(e) => setSelectedTopUp(Number(e.target.value))}
//             >
//               <option value={30}>$30</option>
//               <option value={60}>$60</option>
//               <option value={120}>$120</option>
//               <option value={240}>$240</option>
//             </select>
//             <button
//               style={{ marginTop: 20, padding: "10px 20px", backgroundColor: "#2a9d8f", color: "#fff", border: "none", borderRadius: 6 }}
//               onClick={() => handleTopupConfirm(selectedTopUp)}
//             >
//               Confirm Top-up of ${selectedTopUp}
//             </button>
//           </div>
//         </div>
//       )}

//       {plans.map((plan) => {
//         if (!levels[plan.amount]) return null;

//         const currentLevels = levels[plan.amount];
//         const totalAchieved = currentLevels.reduce((acc, lvl) =>
//           lvl.status === "achieved" ? acc + plan.baseIncome * Math.pow(2, lvl.level - 1) : acc, 0);
//         const totalPossible = currentLevels.reduce((acc, lvl) =>
//           acc + plan.baseIncome * Math.pow(2, lvl.level - 1), 0);

//         return (
//           <div key={plan.amount} style={{ marginBottom: 30 }}>
//             <h2 style={{ textAlign: "center", margin: "20px 0" }}>${plan.amount} Plan</h2>
//             <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#1a1a1a" }}>
//               <thead>
//                 <tr style={{ backgroundColor: "#2a9d8f", color: "#fff" }}>
//                   <th style={th}>Sr</th>
//                   <th style={th}>Level</th>
//                   <th style={th}>Team</th>
//                   <th style={th}>Income</th>
//                   <th style={th}>Achieved</th>
//                   <th style={th}>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {currentLevels.map((lvl, i) => {
//                   const income = plan.baseIncome * Math.pow(2, lvl.level - 1);
//                   const achieved = lvl.status === "achieved" ? income : 0;
//                   const isActive = lvl.status === "active";

//                   return (
//                     <tr key={lvl.level} style={{ textAlign: "center", color: "#eee" }}>
//                       <td style={td}>{i + 1}</td>
//                       <td style={td}>Level {lvl.level}</td>
//                       <td style={td}>{lvl.level * 2}</td>
//                       <td style={td}>${income}</td>
//                       <td style={td}>${achieved}</td>
//                       <td style={{ ...td, color: getStatusColor(lvl.status) }}>
//                         {isActive ? formatTime(timers[plan.amount]) : lvl.status}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//               <tfoot>
//                 <tr style={{ fontWeight: "bold", backgroundColor: "#222" }}>
//                   <td colSpan={3} style={td}>Total</td>
//                   <td style={td}>${totalPossible}</td>
//                   <td style={td}>${totalAchieved}</td>
//                   <td></td>
//                 </tr>
//               </tfoot>
//             </table>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// const th = { padding: "10px", fontWeight: "bold" };
// const td = { padding: "10px" };
