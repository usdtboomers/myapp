import React from "react";
import DepositForm from "./DepositForm";

const DepositModal = ({ userId, walletAddress, isOpen, onClose, onDepositSuccess }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: 32,
          borderRadius: 12,
          width: 360,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Deposit USDT (BEP-20)</h2>

        <p>Send USDT to this wallet:</p>
        <input
          type="text"
          value={walletAddress}
          readOnly
          style={{
            width: "100%",
            padding: 10,
            margin: "8px 0 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />

        <DepositForm
          userId={userId}
          walletAddress={walletAddress}
          onSuccess={onDepositSuccess} // parent handles showing success
        />

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: 10,
            borderRadius: 6,
            backgroundColor: "#ccc",
            color: "#333",
            border: "none",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default DepositModal;
