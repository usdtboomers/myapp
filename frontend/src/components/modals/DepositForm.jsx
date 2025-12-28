import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import api from "../../api/axios"; 
import WalletConnect from "../WalletConnect"; 
import { FaCheckCircle, FaExclamationCircle, FaTimesCircle } from "react-icons/fa"; // Agar react-icons nahi hai to bata dena, main hata dunga

const DepositForm = ({ userId, walletAddress, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [signer, setSigner] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  
  // 👇 New: Notification State for Custom Alerts
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; 
  const USDT_ABI = ["function transfer(address to, uint amount) public returns (bool)"];

  // 👇 Helper function to show modern alerts
  const showAlert = (message, type = "error") => {
    setNotification({ show: true, message, type });
    // Auto hide after 4 seconds
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 4000);
  };

  const handleWalletConnected = ({ signer, address }) => {
    setSigner(signer);
    setConnectedAddress(address);
    showAlert("Wallet Connected Successfully!", "success");
  };

  const handleDeposit = async () => {
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount) || numericAmount <= 0) return showAlert("Please enter a valid amount", "error");
    if (!signer) return showAlert("⚠️ Please Connect Wallet First", "error");
    if (!walletAddress) return showAlert("⚠️ Admin Wallet address missing!", "error");

    try {
      setLoading(true);

      // 1. Blockchain Transfer
      const tokenContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      const amountInWei = ethers.utils.parseUnits(numericAmount.toString(), 18);

      console.log(`Sending ${numericAmount} USDT...`);
      showAlert("Confirm Transaction in Wallet...", "info");

      const tx = await tokenContract.transfer(walletAddress, amountInWei);
      
      showAlert("Transaction Sent! Waiting for confirmation...", "info");
      await tx.wait(); 

      // 2. Backend Verification
      const res = await api.post("/wallet/web3-deposit", {
        userId,
        amount: numericAmount,
        txnHash: tx.hash,
        name: "User Deposit"
      });

      if(res.data.success){
          onSuccess(numericAmount);
          setAmount(""); 
          showAlert("✅ Deposit Successful! Logic Updated.", "success");
      } else {
          showAlert("⚠️ Verification Pending: " + res.data.message, "warning");
      }

    } catch (err) {
      console.error("Deposit Error:", err);
      // Clean error message
      const errorMsg = err.reason || err.message || "Transaction Failed";
      showAlert("❌ Failed: " + errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      
      {/* 👇 MODERN NOTIFICATION POPUP */}
      {notification.show && (
        <div style={{...styles.notification, ...styles[notification.type]}}>
            <span>{notification.message}</span>
        </div>
      )}

      {/* Wallet Connection Status */}
      {!connectedAddress ? (
        <div style={styles.walletWrapper}>
            <WalletConnect onConnected={handleWalletConnected} />
        </div>
      ) : (
        <div style={styles.connectedBadge}>
          <span style={{marginRight: "8px"}}>🟢</span> 
          Connected: {connectedAddress.slice(0,6)}...{connectedAddress.slice(-4)}
        </div>
      )}

      {/* Amount Input */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>Enter Amount (USDT)</label>
        <input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={styles.input}
        />
      </div>

      {/* Pay Button */}
      <button
        onClick={handleDeposit}
        disabled={!signer || loading}
        style={{
            ...styles.button,
            opacity: (!signer || loading) ? 0.6 : 1,
            cursor: (!signer || loading) ? "not-allowed" : "pointer",
            background: loading ? "#444" : "linear-gradient(135deg, #264653 0%, #2a9d8f 100%)"
        }}
      >
        {loading ? (
            <span>⏳ Processing...</span>
        ) : (
            <span>Pay Now (USDT)</span>
        )}
      </button>
    </div>
  );
};

// 👇 STYLES OBJECT (CSS IN JS)
const styles = {
  container: {
    padding: "20px",
    background: "#fff", // Change to #1a1a1a for dark mode
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    maxWidth: "100%",
    position: "relative",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  walletWrapper: {
    marginBottom: "15px",
    display: "flex",
    justifyContent: "center"
  },
  connectedBadge: {
    background: "#e8f5e9",
    color: "#2e7d32",
    padding: "10px 15px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    marginBottom: "5px",
    marginTop: "35px",
    textAlign: "center",
    border: "1px solid #c8e6c9"
  },
  inputGroup: {
    marginBottom: "18px"
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#555"
  },
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "16px",
    outline: "none",
    transition: "border 0.3s ease",
    background: "#f9f9f9"
  },
  button: {
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    color: "#fff",
    border: "none",
    fontWeight: "bold",
    fontSize: "16px",
    boxShadow: "0 4px 12px rgba(38, 70, 83, 0.3)",
    transition: "transform 0.2s ease",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  
  // Notification Styles
  notification: {
    position: "absolute", // Change to 'fixed' and top: 20px for global alert
    top: "0px", // Animates down
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 20px",
    borderRadius: "30px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff",
    boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
    zIndex: 100,
    width: "90%",
    textAlign: "center",
    animation: "fadeIn 2.5s forwards"
  },
  success: {
    background: "#2ecc71",
  },
  error: {
    background: "#e74c3c",
  },
  warning: {
    background: "#f39c12",
  },
  info: {
    background: "#3498db",
  }
};

export default DepositForm;