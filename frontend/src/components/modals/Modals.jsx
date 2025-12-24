import React, { useState } from "react";
import DepositModal from "./DepositModal";
import WalletTransferModal from "./WalletTransferModal";
import WithdrawalModal from "./WithdrawalModal";
import TopUpModalWithInput from "./TopUpModalWithInput";
import CreditToWalletModal from "./CreditToWalletModal";
import InstantWithdrawModal from "./InstantWithdrawModal"; 
import SuccessModal from "./SuccessModal";
import SpinButton from "./SpinButton";

const Modals = ({ user, modalState, setModalState, setUser }) => {
  const [successData, setSuccessData] = useState(null);

  const closeModal = (modalName) =>
    setModalState((prev) => ({ ...prev, [modalName]: false }));

  const updateUserAndSuccess = (updatedUser, amount, type) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    setSuccessData({ userId: updatedUser.userId, amount, type });
  };

  return (
    <>
      {/* Action buttons area */}
      <div className="flex gap-2 items-center mb-4">
        <SpinButton className="text-sm" />
      </div>

      {/* Deposit Modal */}
      {modalState.showDeposit && (
        <DepositModal
          isOpen={modalState.showDeposit}
          onClose={() => closeModal("showDeposit")}
          userId={user.userId}
          walletAddress="0x1111111111111111111111111111111111111111"
          onDepositSuccess={(amount) => {
            closeModal("showDeposit");
            setSuccessData({ userId: user.userId, amount, type: "deposit" });
          }}
        />
      )}

      {/* Wallet Transfer Modal */}
      {modalState.showWalletTransfer && (
        <WalletTransferModal
          onClose={() => closeModal("showWalletTransfer")}
          onSuccess={(userId, amount) =>
            setSuccessData({ userId, amount, type: "transfer" })
          }
        />
      )}

      {/* Standard Withdrawal Modal */}
      {modalState.showWithdrawalModal && (
        <WithdrawalModal
          userId={user.userId}
          onClose={() => closeModal("showWithdrawalModal")}
          onSuccess={(updatedUser, amount) =>
            updateUserAndSuccess(updatedUser, amount, "withdrawal")
          }
        />
      )}

      {/* Instant Withdraw Modal */}
      {modalState.showInstantWithdraw && (
        <InstantWithdrawModal
          userId={user.userId}
          onClose={() => closeModal("showInstantWithdraw")}
          onSuccess={(updatedUser, amount) =>
            updateUserAndSuccess(updatedUser, amount, "instant-withdraw")
          }
        />
      )}

      {/* Top-Up Modal */}
      {modalState.showTopUpForm && (
        <TopUpModalWithInput
          onClose={() => closeModal("showTopUpForm")}
          onTopUpSuccess={(updatedUser, amount) =>
            updateUserAndSuccess(updatedUser, amount, "topup")
          }
        />
      )}

      {/* Credit To Wallet Modal */}
      {modalState.showCreditToWallet && (
        <CreditToWalletModal
          userId={user.userId}
          onClose={() => closeModal("showCreditToWallet")}
          onSuccess={(updatedUser, amount) =>
            updateUserAndSuccess(updatedUser, amount, "credit")
          }
        />
      )}

      {/* Success Modal */}
      {successData && (
        <SuccessModal
          isOpen={!!successData}
          onClose={() => setSuccessData(null)}
          type={successData.type}
          userId={successData.userId}
          amount={successData.amount}
        />
      )}
    </>
  );
};

export default Modals;
