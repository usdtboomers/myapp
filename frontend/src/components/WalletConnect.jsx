import React, { useState } from "react";
import { ethers } from "ethers";

const WalletConnect = ({ onConnected }) => {
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // 1. Request Account Access
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // 2. Setup Ethers Provider & Signer
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();

        // 3. Update State
        setWalletAddress(address);
        
        // 4. 🔥 IMPORTANT: Send Signer to Parent (DepositForm)
        if (onConnected) {
          onConnected({ signer, address });
        }

      } catch (err) {
        console.error("Connection error:", err);
        setError("Connection failed");
      }
    } else {
      alert("MetaMask not detected. Please install it.");
    }
  };

  return (
    <div className="mb-4">
      {!walletAddress ? (
        <button
          onClick={connectWallet}
          style={{
            backgroundColor: "#264653",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            width: "100%"
          }}
        >
          Connect Wallet
        </button>
      ) : (
        <div style={{ 
            padding: "10px", 
            backgroundColor: "#e6fffa", 
            color: "#00695c", 
            borderRadius: "8px",
            textAlign: "center",
            border: "1px solid #b2f5ea"
        }}>
          Connected: <b>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</b>
        </div>
      )}
      {error && <p style={{color: "red", fontSize: "12px"}}>{error}</p>}
    </div>
  );
};

export default WalletConnect;