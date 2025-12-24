// utils/sanitizeUser.js
module.exports = function sanitizeUser(user) {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    walletBalance: user.walletBalance,
    isToppedUp: user.isToppedUp,
    topUpAmount: user.topUpAmount,
    sponsorId: user.sponsorId,
    role: user.role,
    profileImage: user.profileImage,
    topUpDate: user.topUpDate,
    hasTopup: user.hasTopup,
    levelStatus: user.levelStatus,
  };
};
