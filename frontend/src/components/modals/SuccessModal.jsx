import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";

const SuccessModal = ({
  isOpen,
  onClose,
  type = "credit", 
  userId = "",
  amount = 0,
  reward = 0,
  spinQuantity = 0,
  customTitle = "",
  customMessage = "",
  source = "", // "plan1", "plan2" OR "Direct", "Level", "Direct + Level"
  zIndex = 2000,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(isOpen);
  }, [isOpen]);

  if (!isOpen) return null;

  const formattedDate = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // ✅ Package Mapping (For Topup)
  const packageNames = {
    10: "Bronze",
    25: "Silver",
    50: "Gold",
    100: "Platinum",
    200: "Diamond",
    500: "Elite",
    1000: "Infinity",
  };

  // ✅ Plan Mapping (For Normal Withdrawal)
  const planNames = {
    plan1: "Bronze ",
    plan2: "Silver ",
    plan3: "Gold ",
    plan4: "Platinum ",
    plan5: "Diamond ",
    plan6: "Elite ",
    plan7: "Infinity ",
  };

  /* ================= LAYOUT ================= */
  const SuccessLayout = ({ title, children }) => (
    <>
      {/* Logo */}
      <div className="flex justify-center items-center my-0.5">
        <img
          src="/eliteinfinitylogo.png"
          alt="Elite Infinity Logo"
          className="w-44 h-20 sm:w-28 sm:h-24 md:w-44 md:h-28 object-contain drop-shadow-[0_2px_6px_rgba(255,215,0,0.45)]"
        />
      </div>

      <h2 className="text-white text-lg sm:text-xl font-bold flex justify-center items-center gap-2 leading-tight">
        <span>{title}</span>
        <span>✅</span>
      </h2>

      {children}

      <p className="text-white text-xs sm:text-sm italic text-center leading-tight mt-2">
        {formattedDate}
      </p>
    </>
  );

  /* ================= CONTENT LOGIC ================= */
  const renderContent = () => {
    if (customTitle || customMessage) {
      return (
        <>
          <h2 className="text-white font-bold">{customTitle}</h2>
          <p className="text-sm text-gray-300">{customMessage}</p>
          <p className="text-xs text-gray-400">{formattedDate}</p>
        </>
      );
    }

    switch (type) {
      case "withdrawal":
        // 🔥 LOGIC: Check if it's a Plan Withdrawal or Instant
        // Agar source 'plan' se shuru hota hai (e.g. plan1, plan2) to Normal hai
        const isPlan = source && source.toLowerCase().startsWith("plan");
        
        // Title Set Karo
        const titleText = isPlan ? "Withdrawal Successful" : "Instant Withdrawal";
        
        // Label aur Value Set Karo
        const labelText = isPlan ? "Plan" : "Source";
        const valueText = isPlan ? (planNames[source] || source) : source;

        return (
          <SuccessLayout title={titleText}>
            <p className="text-white text-md sm:text-lg font-bold text-center mt-0.5">
              Amount :-{" "}
              <span className="font-extrabold bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 text-transparent bg-clip-text drop-shadow-[0_1px_4px_rgba(255,215,0,0.6)]">
                ${amount}
              </span>
            </p>

            {/* 🔥 Dynamic Section: Plan Name ya Source Name */}
            {source && (
            <div>
  <p className="text-lg font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-yellow-300">
    {labelText}:  <span className="text-yellow-400">{valueText}</span> Income
  </p>
</div>

            )}
          </SuccessLayout>
        );

      case "deposit":
        return (
          <SuccessLayout title="Deposit Successful">
            <p className="text-white text-md sm:text-lg font-bold text-center mt-0.5">
              Amount :- <span className="text-yellow-400 font-extrabold">${amount}</span>
            </p>
          </SuccessLayout>
        );

      case "credit":
        return (
          <SuccessLayout title="Wallet Credited">
            <p className="text-white text-md sm:text-lg font-bold text-center mt-0.5">
              Amount :- <span className="text-yellow-400 font-extrabold">${amount}</span>
            </p>
            {source && (
              <p className="text-xs text-gray-400 mt-1 capitalize">From: {source}</p>
            )}
          </SuccessLayout>
        );

      case "transfer":
        return (
          <SuccessLayout title="Transfer Successful">
            <p className="text-white text-md font-semibold text-center mt-0.5">
              <span className="font-bold">Amount :- </span>
              <span className="text-yellow-400 font-extrabold">${amount}</span>
            </p>
            <p className="text-xs text-gray-300 text-center mt-0.5">
              To User ID: <strong>{userId}</strong>
            </p>
          </SuccessLayout>
        );

      case "topup":
        const topupPkgName = packageNames[amount] || "Unknown Package";
        return (
          <SuccessLayout title="Top-Up Successful">
            <p className="text-white text-lg font-bold text-center mt-2">
              <span className="text-gray-300">Package: </span>
              <span className="text-green-400 uppercase tracking-wider">
                {topupPkgName}
              </span>
            </p>
            <p className="text-white text-md font-semibold text-center mt-1">
              <span className="font-bold">Amount: </span>
              <span className="text-yellow-400 font-extrabold"> ${amount}</span>
            </p>
          </SuccessLayout>
        );

      case "buy":
        return (
          <SuccessLayout title="Spin Purchase Successful">
            <p className="text-white text-md font-semibold text-center mt-0.5">
              <span className="text-yellow-400 font-extrabold">
                {spinQuantity} Spins • ${amount}
              </span>
            </p>
          </SuccessLayout>
        );

      case "spin":
        return (
          <SuccessLayout title="🎯 Spin & Win">
            <p className="text-white text-md font-semibold text-center mt-0.5">
              Reward: <span className="text-yellow-400 font-extrabold">${reward}</span>
            </p>
          </SuccessLayout>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={400}
          gravity={0.18}
          recycle
        />
      )}

      <div className="bg-gray-900 rounded-2xl pt-2 pb-6 w-full max-w-sm text-center relative z-10 ring-4 ring-yellow-600 shadow-[0_0_30px_rgba(255,215,0,0.8)] animate-[pulse_1.5s_infinite]">
        {renderContent()}

        <button
          onClick={onClose}
          className="bg-green-600 text-white px-6 py-2 rounded-full shadow hover:bg-green-700 transition font-bold text-sm w-16 mt-4"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;