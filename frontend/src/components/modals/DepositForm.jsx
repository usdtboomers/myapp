import React, { useState } from "react";
import { ethers } from "ethers";
import api from "api/axios";
import ConnectWallet from "../wallet/ConnectWallet";

const DepositForm = ({ userId, walletAddress, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [signer, setSigner] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);

  const handleWalletConnected = ({ signer, address }) => {
    setSigner(signer);
    setConnectedAddress(address);
  };

  const handleDeposit = async () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return alert("Enter a valid amount");
    }
    if (!signer) return alert("⚠️ Connect your wallet first");

    try {
      setLoading(true);

      const USDT_ADDRESS = "0x1111111111111111111111111111111111111111"; 
      const USDT_ABI = ["function transfer(address to, uint amount) public returns (bool)"];
      const tokenContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

      const amountInWei = ethers.utils.parseUnits(numericAmount.toString(), 18);
      const tx = await tokenContract.transfer(walletAddress, amountInWei);
      await tx.wait();

      await api.post("/api/wallet/web3-deposit", {
        userId,
        amount: numericAmount,
        txnHash: tx.hash,
      });

      onSuccess(numericAmount);
      setAmount(""); // reset input
    } catch (err) {
      console.error(err);
      alert("❌ Deposit failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: 12 }}>
      {!connectedAddress ? (
        <ConnectWallet onConnected={handleWalletConnected} />
      ) : (
        <div style={{ color: "green", marginBottom: 12 }}>
          ✅ Connected: {connectedAddress}
        </div>
      )}

      <input
        type="number"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
        min="0"
        step="any"
      />

      <button
        onClick={handleDeposit}
        disabled={!signer || loading}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 6,
          backgroundColor: signer ? "#264653" : "#aaa",
          color: "#fff",
          border: "none",
          cursor: signer ? "pointer" : "not-allowed",
        }}
      >
        {loading ? "Processing..." : "Deposit via Wallet"}
      </button>
    </div>
  );
};

export default DepositForm;
