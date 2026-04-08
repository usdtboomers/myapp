import React, { useState, useEffect, useCallback } from "react";
import api from "api/axios";
import { useAuth } from "../../context/AuthContext";
import SuccessModal from "../../components/modals/SuccessModal";

const Support = () => {
  const { user, token } = useAuth();
  const [message, setMessage] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [optional, setOptional] = useState("");
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [userMessages, setUserMessages] = useState([]);
  const [fetching, setFetching] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(null);

  // Fetch logic using the NEW /me route
  const fetchMessages = useCallback(async () => {
    if (!token) return;
    try {
      setFetching(true);
      const res = await api.get("/support/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ab seedha data set kar sakte hain, filter backend se ho kar aaya hai
      setUserMessages(res.data.supports || []);
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setFetching(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !walletAddress.trim()) {
      setStatusMsg({ type: "error", text: "Message and wallet address required." });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: "", text: "" });

    try {
      const res = await api.post(
        "/support/create",
        { message, email: user.email, walletAddress, optional },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSubmittedMessage({ message, walletAddress, optional });
        setShowModal(true);
        setMessage("");
        setWalletAddress("");
        setOptional("");
        fetchMessages(); // Refresh list
      }
    } catch (err) {
      const errorText = err.response?.data?.error || "Failed to send message.";
      setStatusMsg({ type: "error", text: errorText });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl text-white font-bold mb-4">Support Center</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8 bg-gray-800 p-6 rounded-lg shadow-lg">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help you?"
          className="w-full p-3 border rounded bg-white text-black disabled:bg-gray-200"
          rows="4"
          required
          disabled={loading}
        />
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="USDT Wallet Address (for reference)"
          className="w-full p-3 border rounded bg-white text-black disabled:bg-gray-200"
          required
          disabled={loading}
        />
        <input
          type="text"
          value={optional}
          onChange={(e) => setOptional(e.target.value)}
          placeholder="Optional Info (Transaction ID, etc.)"
          className="w-full p-3 border rounded bg-white text-black disabled:bg-gray-200"
          disabled={loading}
        />
        <button
          type="submit"
          className={`w-full px-4 py-3 rounded font-bold text-white transition-all ${
            loading ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={loading}
        >
          {loading ? "Processing..." : "Send Message"}
        </button>
      </form>

      {statusMsg.text && statusMsg.type === "error" && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {statusMsg.text}
        </div>
      )}

      <h2 className="text-xl text-white font-bold mb-4">Message History</h2>
      {fetching ? (
        <p className="text-gray-400">Loading your history...</p>
      ) : userMessages.length === 0 ? (
        <p className="text-gray-400 italic">No previous messages found.</p>
      ) : (
        <div className="space-y-4">
          {userMessages.map((m) => {
            let statusClass = "bg-gray-200 text-gray-800";
            if (m.status === "Pending") statusClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
            else if (m.status === "Resolved") statusClass = "bg-green-100 text-green-800 border-green-200";
            else if (m.status === "Rejected") statusClass = "bg-red-100 text-red-800 border-red-200";

            return (
              <div key={m._id} className="p-4 border border-gray-700 rounded-lg bg-gray-900 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 text-xs font-bold rounded border ${statusClass}`}>
                    {m.status?.toUpperCase() || "PENDING"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-white mb-2"><span className="text-gray-400">Msg:</span> {m.message}</p>
                <p className="text-sm text-gray-300"><span className="text-gray-500">Wallet:</span> {m.walletAddress}</p>
                {m.optional && <p className="text-sm text-gray-300"><span className="text-gray-500">Info:</span> {m.optional}</p>}
              </div>
            );
          })}
        </div>
      )}

      {submittedMessage && (
        <SuccessModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          customTitle="Support Ticket Created"
          customMessage={`We've received your message. Our team will review your wallet (${submittedMessage.walletAddress}) and get back to you.`}
        />
      )}
    </div>
  );
};

export default Support;