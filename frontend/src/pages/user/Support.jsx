import React, { useState, useEffect } from "react";
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

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(null); // store submitted message

  // Fetch user support messages
  const fetchMessages = async () => {
    try {
      setFetching(true);
      const res = await api.get("/support/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const myMessages = res.data.supports.filter(
        (m) => String(m.userId) === String(user.userId)
      );
      setUserMessages(myMessages);
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

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
        // Save submitted message for modal before clearing
        setSubmittedMessage({ message, walletAddress, optional });
        setShowModal(true);

        // Clear form fields
        setMessage("");
        setWalletAddress("");
        setOptional("");

        fetchMessages();
      } else {
        setStatusMsg({ type: "error", text: "Failed to send message." });
      }
    } catch (err) {
      const errorText = err.response?.data?.error || "Failed to send message.";
      setStatusMsg({ type: "error", text: errorText });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl text-white font-bold mb-4">Support</h1>

      {/* Support Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your support message"
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="USDT Wallet Address (new/unique)"
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="text"
          value={optional}
          onChange={(e) => setOptional(e.target.value)}
          placeholder="Optional info"
          className="w-full p-3 border rounded"
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-blue-600"}`}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>

      {/* Status message (error only) */}
      {statusMsg.text && statusMsg.type === "error" && (
        <p className="mb-4 text-red-600">{statusMsg.text}</p>
      )}

      {/* User Messages */}
      <h2 className="text-xl  text-white font-bold mb-2">Your Support Messages</h2>
      {fetching ? (
        <p>Loading your messages...</p>
      ) : userMessages.length === 0 ? (
        <p className="text-white">No messages sent yet.</p>
      ) : (
        <div className="space-y-4">
          {userMessages.map((m) => {
            let statusColor = "text-gray-700";
            if (m.status === "Pending") statusColor = "text-red-600";
            else if (m.status === "Resolved") statusColor = "text-green-600";
            else if (m.status === "Rejected") statusColor = "text-red-600";

            return (
              <div key={m._id} className="p-4 border rounded shadow bg-gray-50">
                <p>
                  <strong>Message:</strong> {m.message}
                </p>
                {m.walletAddress && <p><strong>USDT Wallet:</strong> {m.walletAddress}</p>}
                {m.optional && <p><strong>Optional Info:</strong> {m.optional}</p>}
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={statusColor}>{m.status || "Pending"}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Submitted: {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* 🎉 Success Modal */}
      {submittedMessage && (
        <SuccessModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          customTitle="✅ Support Message Sent!"
          customMessage={`Your message: "${submittedMessage.message}"\nWallet: ${submittedMessage.walletAddress}${submittedMessage.optional ? `\nInfo: ${submittedMessage.optional}` : ""}`}
        />
      )}
    </div>
  );
};

export default Support;
