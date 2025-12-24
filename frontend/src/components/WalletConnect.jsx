import React, { useState } from "react";

const WalletConnect = () => {
  const [walletAddress, setWalletAddress] = useState("");

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
        console.log("Connected wallet:", accounts[0]);
      } catch (error) {
        console.error("Connection error:", error);
      }
    } else {
      alert("MetaMask not detected. Please install it.");
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={connectWallet}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        Connect Wallet
      </button>

      {walletAddress && (
        <p className="mt-2 text-green-600">
          Connected Wallet: {walletAddress}
        </p>
      )}
    </div>
  );
};

export default WalletConnect;
