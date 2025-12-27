import React, { useState } from "react";
import { ethers } from "ethers";
import api from "../../api/axios"; // ✅ Sahi path (agar api folder src me hai)
import WalletConnect from "../WalletConnect"; // ✅ Sahi path & Naam

const DepositForm = ({ userId, walletAddress, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [signer, setSigner] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);

  // ✅ USDT Address (BSC Mainnet)
  const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; 
  const USDT_ABI = ["function transfer(address to, uint amount) public returns (bool)"];

  const handleWalletConnected = ({ signer, address }) => {
    setSigner(signer);
    setConnectedAddress(address);
  };

  const handleDeposit = async () => {
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount) || numericAmount <= 0) return alert("Enter valid amount");
    if (!signer) return alert("⚠️ Connect wallet first");
    if (!walletAddress) return alert("⚠️ Admin Wallet address missing!");

    try {
      setLoading(true);

      // 1. Blockchain Transfer
      const tokenContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      const amountInWei = ethers.utils.parseUnits(numericAmount.toString(), 18);

      console.log(`Sending ${numericAmount} USDT...`);
      const tx = await tokenContract.transfer(walletAddress, amountInWei);
      
      alert("Transaction Sent! Waiting for confirmation...");
      await tx.wait(); // Wait for block

      // 2. Backend Verification
      const res = await api.post("/api/wallet/web3-deposit", {
        userId,
        amount: numericAmount,
        txnHash: tx.hash,
        name: "User Deposit"
      });

      if(res.data.success){
          onSuccess(numericAmount);
          setAmount(""); 
          alert("✅ Deposit Successful!");
      } else {
          alert("⚠️ Verification Pending: " + res.data.message);
      }

    } catch (err) {
      console.error("Deposit Error:", err);
      alert("❌ Failed: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: 12 }}>
      {/* 👇 Yaha par ab sahi component use kiya hai */}
      {!connectedAddress ? (
        <WalletConnect onConnected={handleWalletConnected} />
      ) : (
        <div style={{ color: "green", marginBottom: 12, fontWeight: "bold", fontSize: "14px" }}>
          ✅ Connected: {connectedAddress.slice(0,6)}...{connectedAddress.slice(-4)}
        </div>
      )}

      <input
        type="number"
        placeholder="Enter USDT Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: 12, border: "1px solid #ddd", borderRadius: "5px" }}
      />

      <button
        onClick={handleDeposit}
        disabled={!signer || loading}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 6,
          backgroundColor: signer ? (loading ? "#555" : "#264653") : "#aaa",
          color: "#fff",
          border: "none",
          fontWeight: "bold",
          cursor: signer && !loading ? "pointer" : "not-allowed",
        }}
      >
        {loading ? "Processing..." : "Pay Now (USDT)"}
      </button>
    </div>
  );
};

export default DepositForm;