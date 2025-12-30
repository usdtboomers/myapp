import React, { useState, useRef, useEffect } from "react";
import api from "api/axios";
import moment from "moment";
import { ChevronDown, ArrowLeft } from "lucide-react"; // Icons for UI

// ✅ Real Project Imports
import BASE_URL from "../../config";
import SuccessModal from "../../components/modals/SuccessModal";
import MessageModal from "../../components/modals/MessageModal";
import { useAuth } from "../../context/AuthContext";

// 🎨 Slice colors for the wheel
const colors = [
  "#f43f5e", "#f97316", "#facc15", "#4ade80",
  "#2dd4bf", "#3b82f6", "#a855f7", "#ec4899"
];

const SPIN_DURATION = 4500;  // spin animation time
const EXTRA_SPINS = 5;       // extra full rotations before stopping
const SPIN_COST = 5;         // cost per spin

const SpinWin = () => {
  // --- STATE ---
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [availableSpins, setAvailableSpins] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  const [prizes, setPrizes] = useState([]); 
  const [modalOpen, setModalOpen] = useState(false);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [totalCost, setTotalCost] = useState(SPIN_COST);
  const [transactionPassword, setTransactionPassword] = useState("");
  const [buySuccessModal, setBuySuccessModal] = useState(false);
 

  const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

  const { user } = useAuth();
  const isPromoUser = user?.role === "promo";

  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    type: "info", // "success" | "error" | "info"
    text: "",
  });

  const canvasRef = useRef(null);
  const spinningRef = useRef(false);
  const audioRef = useRef(null);
  const size = 360;

  // --- LOGIC: Draw Wheel ---
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;
    const ctx = canvas.getContext("2d");
    const numSegments = prizes.length;
    const anglePerSlice = (2 * Math.PI) / numSegments;

    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < numSegments; i++) {
      const startAngle = i * anglePerSlice - Math.PI / 2;
      const endAngle = (i + 1) * anglePerSlice - Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(size / 2, size / 2);
      ctx.arc(size / 2, size / 2, size / 2, startAngle, endAngle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(startAngle + anglePerSlice / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`$${prizes[i]}`, size / 2 - 20, 6);
      ctx.restore();
    }
  };

  // --- LOGIC: Fetch Data ---
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/spin/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setHistory(res.data.history || []);
        setAvailableSpins(res.data.availableSpins || 0);
        setWalletBalance(res.data.walletBalance || 0);
        setPrizes(res.data.rewardPool || []);
      }
    } catch (err) {
      console.error("Failed to fetch spin data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (prizes.length > 0) drawWheel();
  }, [prizes]);

  useEffect(() => {
    setTotalCost(buyQuantity * SPIN_COST);
  }, [buyQuantity]);

  // --- LOGIC: Sound ---
  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  // --- LOGIC: Handle Spin ---
  const handleSpin = async () => {
    if (
      isSpinning ||
      spinningRef.current ||
      (!isPromoUser && availableSpins <= 0)
    )
      return;

    setIsSpinning(true);
    spinningRef.current = true;

    const numSegments = prizes.length;
    const anglePerSlice = 360 / numSegments;

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(`/spin/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

          playSound();


      const reward = res.data.reward;
      const spin = res.data.spin;
      setAvailableSpins(res.data.availableSpins || 0);

      let winningIndex = prizes.indexOf(reward);
      if (winningIndex === -1) winningIndex = 0;

      const baseRotation = rotation % 360;
      const targetAngle = 360 - (winningIndex * anglePerSlice + anglePerSlice / 2);
      const finalRotation = EXTRA_SPINS * 360 + targetAngle - baseRotation;

      setRotation(rotation + finalRotation);

      setTimeout(() => {
        const entry = { date: spin.createdAt, reward: spin.reward, status: spin.status };
        setResult(entry);
        setHistory((h) => [entry, ...h]);
        setIsSpinning(false);
        spinningRef.current = false;
      }, SPIN_DURATION);

    } catch (err) {
      if (err.response && err.response.status === 400) {
        setAvailableSpins(err.response.data.availableSpins || 0);
      }
      console.error("Spin failed:", err);
      setIsSpinning(false);
      spinningRef.current = false;
      setMessageModal({
        isOpen: true,
        type: "error",
        text: err.response?.data?.message || "Spin failed.",
      });
    }
  };

  // --- LOGIC: Buy Spins ---
  const handleConfirmBuy = async () => {
    if (!transactionPassword) {
      setMessageModal({ isOpen: true, type: "error", text: "Enter transaction password!" });
      return;
    }
    if (walletBalance < totalCost) {
      setMessageModal({ isOpen: true, type: "error", text: "Insufficient wallet balance!" });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        `spin/buy`,
        { quantity: buyQuantity, transactionPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setAvailableSpins(res.data.availableSpins);
        setWalletBalance(res.data.walletBalance);
        setModalOpen(false);
        setTransactionPassword("");
        setBuySuccessModal(true); 
      } else {
        setMessageModal({ isOpen: true, type: "error", text: res.data.message || "Failed to buy spins." });
      }
    } catch (err) {
      setMessageModal({ 
        isOpen: true, 
        type: "error", 
        text: err.response?.data?.message || "Failed to buy spins." 
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 flex flex-col items-center px-4 py-10 relative overflow-hidden">
      
      {/* Background Pattern */}
      <style>{`
        .bg-pattern-spin {
            background-image: radial-gradient(#334155 1px, transparent 1px);
            background-size: 30px 30px;
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            opacity: 0.3;
            pointer-events: none;
        }
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
      <div className="bg-pattern-spin"></div>

      <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] tracking-wider uppercase z-10 mb-8 transform transition-transform hover:scale-105 duration-300 cursor-pointer">
   Spin & Win
</h1>

      {/* Wallet + Spins Card */}
    <div className="w-full max-w-md text-white bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-2xl shadow-xl p-6 mb-8 flex items-center justify-between gap-6 z-10">
  
  {/* Wallet */}
  <div className="flex flex-col">
    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
      Wallet Balance
    </span>
    <p className="text-2xl font-bold text-emerald-400 font-mono leading-tight">
      ${walletBalance.toFixed(2)}
    </p>
  </div>

  {/* Divider */}
  <div className="h-10 w-px bg-slate-700" />

  {/* Spins */}
  <div className="flex items-center gap-3">
    <div className="flex flex-col items-end">
      <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
        Spins
      </span>
      <p className="text-2xl font-bold pr-3 text-yellow-400 leading-tight">
        {isPromoUser ? "1" : availableSpins}
      </p>
    </div>

    {!isPromoUser && (
      <button
        onClick={() => setModalOpen(true)}
        className="px-3 py-1 text-xs font-bold rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg transition-all"
      >
        + BUY
      </button>
    )}
  </div>

</div>


      {/* Wheel Section */}
      <div className="relative w-full max-w-[360px] h-auto aspect-square mb-12 z-10 group">
        {/* Pointer */}
        <div
          style={{
            position: "absolute", top: "-20px", left: "50%",
            transform: "translateX(-50%) rotate(180deg)",
            width: 0, height: 0,
            borderLeft: "20px solid transparent",
            borderRight: "20px solid transparent",
            borderBottom: "35px solid #fbbf24", // Gold pointer
            zIndex: 20,
            filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.5))"
          }}
        />
        
        {/* Wheel Canvas */}
        <div className="relative w-full h-full rounded-full border-8 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden bg-slate-900">
           <canvas
             ref={canvasRef}
             className="w-full h-full"
             style={{
               transform: `rotate(${rotation}deg)`,
               transition: `transform ${SPIN_DURATION}ms cubic-bezier(0.33, 1, 0.68, 1)`,
             }}
           />
        </div>

        {/* Center Spin Button */}
     <button
  onClick={handleSpin}
  disabled={isSpinning || (!isPromoUser && availableSpins <= 0)}
  className={`absolute  bg-black z-30 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
    w-20 h-20 rounded-full font-bold text-lg shadow-[0_0_30px_rgba(234,179,8,0.4)] border-4 border-slate-900
    ${
      availableSpins <= 0 && !isPromoUser
        ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
        : "bg-gradient-to-br from-yellow-500 to-amber-700 hover:scale-110 active:scale-95 transition-transform duration-200 text-white"
    }
    ${isSpinning ? "animate-pulse cursor-wait" : ""}
    text-white
  `}
>
{isSpinning ? (
  // Premium spinning indicator
  <div className="flex items-center justify-center gap-2 animate-pulse">
    <span className="text-yellow-400 text-sm font-bold">Spinning</span>
    <svg className="w-5 h-5 text-yellow-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
  </div>
) : (!isPromoUser && availableSpins <= 0 ? "No Spin" : "SPIN")}

</button>

      </div>

      {/* 🎵 Hidden Audio */}
      <audio ref={audioRef} src="/spin.mp3" preload="auto" />
      
      {/* Result Modal */}
      <SuccessModal
        isOpen={!!result}
        onClose={() => setResult(null)}
        type="spin" // Assuming SuccessModal handles 'spin' logic internally
        reward={result?.reward || 0}
      />

      {/* History Table */}
   {/* History Table */}
<div className="w-full max-w-4xl text-white z-10 px-2">
  <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2 flex justify-between">
    <span>Spin History</span>
    <span className="text-xs text-slate-500 font-normal">Page {currentPage}</span>
  </h3>

  <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm shadow-xl">
    {/* Table Wrapper for Horizontal Scroll on Mobile */}
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left min-w-[450px]">
        <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-700">
          <tr>
            <th className="py-4 px-6">#</th>
            <th className="py-4 px-14">Date</th>
            <th className="py-4 px-6 text-right">Amount</th>
            <th className="py-4 px-6 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {history.length > 0 ? (
            history
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) // 🔥 10 items logic
              .map((entry, index) => (
                <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-slate-500">
                    {((currentPage - 1) * itemsPerPage) + index + 1}
                  </td>
                  <td className="py-4 px-6 text-slate-300 whitespace-nowrap">
                    {moment(entry.date).format("MMM D, h:mm A")}
                  </td>
                  <td className="py-4 px-10 text-right text-yellow-400 font-mono font-bold">
                    ${entry.reward}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      entry.reward > 0 ? "bg-emerald-500/10 text-green-400" : "bg-red-500/10 text-green-400"
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-10 text-slate-500 italic">
                {isPromoUser ? "🎯 PROMO MODE: Spins are for display only" : "No spin history found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {/* --- NEXT / PREVIOUS BUTTONS --- */}
    {history.length > itemsPerPage && (
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-t border-slate-800">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border border-slate-700 ${
            currentPage === 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-800 text-white"
          }`}
        >
          ← Previous
        </button>
        
        <div className="text-xs text-slate-500 font-mono">
          {Math.min(currentPage * itemsPerPage, history.length)} / {history.length}
        </div>

        <button
          disabled={currentPage * itemsPerPage >= history.length}
          onClick={() => setCurrentPage(prev => prev + 1)}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border border-slate-700 ${
            currentPage * itemsPerPage >= history.length ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-800 text-white"
          }`}
        >
          Next →
        </button>
      </div>
    )}
  </div>
</div>

      {/* Buy Spins Modal (Styled) */}
      {modalOpen && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
  <div className="relative w-full bg-indigo-900  text-white max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

    {/* Header */}
    <div className="relative border-b border-slate-800 px-6 py-5 text-center">
      <h2 className="text-lg font-bold text-white">Buy More Spins</h2>
      <button
        onClick={() => setModalOpen(false)}
        className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
      >
        ×
      </button>
    </div>

    {/* Body */}
    <div className="space-y-5 px-6 py-6">

      {/* Quantity */}
      <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
        <span className="text-sm font-semibold text-slate-300">Quantity</span>
        <input
          type="number"
          min={1}
          value={buyQuantity}
          onChange={(e) => setBuyQuantity(Number(e.target.value))}
          className="w-20 bg-transparent text-right text-lg pr-4 font-bold text-white outline-none border-b border-slate-600 focus:border-yellow-500"
        />
      </div>

      {/* Transaction Password */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
        <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
          Transaction Password
        </label>
        <input
          type="password"
          value={transactionPassword}
          onChange={(e) => setTransactionPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full bg-transparent text-white outline-none placeholder-slate-500"
        />
      </div>

      {/* Cost Info */}
      <div className="flex items-center justify-between rounded-lg bg-slate-800/70 px-4 py-2 text-sm">
        <span className="text-slate-400">
          Cost / Spin: <span className="text-white">${SPIN_COST}</span>
        </span>
        <span className="text-lg font-bold text-yellow-400">
          ${totalCost}
        </span>
      </div>

      {/* Button */}
      <button
        onClick={handleConfirmBuy}
        className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 py-3 font-bold text-white shadow-lg transition hover:from-yellow-400 hover:to-amber-500 active:scale-95"
      >
        Confirm Purchase
      </button>

    </div>
  </div>
</div>

      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={messageModal.isOpen}
        onClose={() => setMessageModal({ ...messageModal, isOpen: false })}
        title={messageModal.type.toUpperCase()}
        message={messageModal.text}
        type={messageModal.type}
      />

      {/* Buy Success Modal */}
      <SuccessModal
        isOpen={buySuccessModal}
        onClose={() => setBuySuccessModal(false)}
        type="buy"
        spinQuantity={buyQuantity}
        amount={buyQuantity * SPIN_COST}
      />
      
    </div>
  );
};

export default SpinWin;