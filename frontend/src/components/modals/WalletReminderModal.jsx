import React from "react";
import { useNavigate } from "react-router-dom";

const WalletReminderModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm text-center">
        <h2 className="text-red-600 text-lg font-bold mb-2">
          ⚠️ Wallet Address Missing!
        </h2>
        <p className="text-sm mb-4">
          Please enter your USDT BEP20 wallet address to start using deposits and withdrawals.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
        >
          Add Wallet Now
        </button>
        <button
          onClick={onClose}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default WalletReminderModal;
