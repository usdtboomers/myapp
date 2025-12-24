import React from "react";
import { useAuth } from "../../context/AuthContext";

const WalletBalance = () => {
  const { user } = useAuth();

  const format = (val) => `$${Number(val || 0).toFixed(2)}`;

  return (
    <p className="text-white  text-xl font-bold">
      Wallet Balance: {format(user?.walletBalance)}
    </p>
  );
};

export default WalletBalance;
