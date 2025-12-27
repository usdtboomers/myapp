import React, { useState } from "react";
import DepositForm from "./DepositForm";

const DepositModal = ({ userId, walletAddress, isOpen, onClose, onDepositSuccess }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "32px",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          position: "relative"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#333" }}>
            Deposit USDT <span style={{fontSize: "12px", backgroundColor: "#e0f2f1", color: "#00695c", padding: "2px 6px", borderRadius: "4px"}}>BEP-20</span>
          </h2>
          <button 
            onClick={onClose}
            style={{ border: "none", background: "transparent", fontSize: "24px", cursor: "pointer", color: "#888" }}
          >
            &times;
          </button>
        </div>

        {/* Address & Copy */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Platform Wallet Address:</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={walletAddress || "Loading..."}
              readOnly
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                backgroundColor: "#f9f9f9",
                fontSize: "13px",
                color: "#555"
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                padding: "0 15px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                backgroundColor: copied ? "#d4edda" : "#fff",
                color: copied ? "#155724" : "#333",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "13px"
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "0 0 20px 0" }} />

        {/* Form Component */}
        <DepositForm
          userId={userId}
          walletAddress={walletAddress}
          onSuccess={onDepositSuccess}
        />

        {/* Cancel Button */}
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "#f1f3f5",
            color: "#495057",
            border: "none",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DepositModal;