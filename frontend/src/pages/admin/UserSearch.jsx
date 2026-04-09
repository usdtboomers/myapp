import React, { useState } from "react";
import api from "../../api/axios"; // Path apne hisaab se theek kar lena
import { Search, Ban, CheckCircle, Save, LogIn, Eye, EyeOff, Copy } from "lucide-react"; // ✅ Added Copy icon

// Tweak this if your API base is different in axios config
 
 

function UserSearch() {
  const [searchId, setSearchId] = useState("");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  
  // States to toggle password visibility in the UI
  const [showPassword, setShowPassword] = useState(false);
  const [showTxnPassword, setShowTxnPassword] = useState(false);

  const getAdminToken = () => localStorage.getItem("adminToken");

  // ================= SEARCH USER =================
  const handleSearch = async () => {
    const token = getAdminToken();
    if (!token) return setMessage("Admin not authenticated");

    try {
      setMessage("Searching...");
      // ✅ FIX: API URL CHANGED TO AVOID ANY CONFLICT WITH NORMAL USER ROUTES
     const res = await api.get(`/admin/search-user/${searchId}`);

      console.log("Data received from backend:", res.data.user); // Check console to verify password is coming

      setUser(res.data.user);
      setFormData(res.data.user);
      setMessage("");
    } catch (err) {
      console.error("Search Error:", err);
      setUser(null);
      setMessage(err.response?.data?.message || "User not found");
    }
  };

  // ================= BLOCK / UNBLOCK =================
  const handleBlockToggle = async () => {
    if (!user) return;
    const token = getAdminToken();
    if (!token) return setMessage("Admin not authenticated");

    try {
  const url = user.isBlocked
  ? `/admin/unblock-user/${user.userId}`
  : `/admin/block-user/${user.userId}`;

await api.put(url);

      setUser((prev) => ({ ...prev, isBlocked: !prev.isBlocked }));
      setMessage(`User ${user.isBlocked ? "unblocked" : "blocked"} successfully`);
    } catch (err) {
      console.error(err);
      setMessage("Action failed");
    }
  };

  // ================= INPUT CHANGE =================
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ================= SAVE USER =================
  const handleSave = async () => {
    const token = getAdminToken();
    if (!token) return setMessage("Admin not authenticated");

    try {
      const payload = { ...formData };

      // ❌ Avoid sending unchanged passwords
      if (payload.password === user.password) delete payload.password;
      if (payload.transactionPassword === user.transactionPassword) delete payload.transactionPassword;

     const res = await api.put(`/admin/${user.userId}`, payload);

      setUser(res.data.user);
      setFormData(res.data.user);
      setMessage("✅ User updated successfully");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Update failed");
    }
  };

  // ================= IMPERSONATE USER =================
  const handleImpersonate = async () => {
    const token = getAdminToken();
    if (!token) return setMessage("Admin not authenticated");

    try {
    const res = await api.post(`/admin/impersonate`, {
  userId: user.userId,
});

      const { token: userToken, user: impersonatedUser } = res.data;

      localStorage.setItem("token", userToken);
      localStorage.setItem("user", JSON.stringify(impersonatedUser));
      localStorage.setItem("isImpersonating", "true");

      window.open("/dashboard", "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Failed to impersonate user");
    }
  };

  // ✅ ================= COPY FUNCTION =================
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert("Deposit Address Copied!");
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-indigo-600">🔍 Search User</h2>

      <div className="flex gap-3 mb-4">
        <input
          type="number"
          placeholder="Enter User ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="border rounded px-4 py-2 w-full"
        />
        <button
          onClick={handleSearch}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
        >
          <Search size={18} />
        </button>
      </div>

      {user && (
        <div className="bg-gray-50 p-4 rounded border space-y-3">
          
          {/* Normal Text Fields */}
          {["name", "email", "mobile", "country"].map((field) => (
            <div key={field}>
              <label className="font-semibold capitalize">{field}</label>
              <input
                type="text"
                value={formData[field] || ""}
                onChange={(e) => handleInputChange(field, e.target.value)}
                className="block border rounded px-3 py-1 mt-1 w-full"
              />
            </div>
          ))}

          {/* Password Fields with Toggle Visibility */}
          <div>
            <label className="font-semibold">Password</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password || ""}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="block border rounded px-3 py-1 mt-1 w-full pr-10"
              />
              <button 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-2 top-2 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold">Transaction Password</label>
            <div className="relative flex items-center">
              <input
                type={showTxnPassword ? "text" : "password"}
                value={formData.transactionPassword || ""}
                onChange={(e) => handleInputChange("transactionPassword", e.target.value)}
                className="block border rounded px-3 py-1 mt-1 w-full pr-10"
              />
              <button 
                onClick={() => setShowTxnPassword(!showTxnPassword)} 
                className="absolute right-2 top-2 text-gray-500"
              >
                {showTxnPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Balances & Address */}
          <div>
            <label className="font-semibold">Wallet Balance</label>
            <input
              type="number"
              value={formData.walletBalance || 0}
              onChange={(e) => handleInputChange("walletBalance", e.target.value)}
              className="block border rounded px-3 py-1 mt-1 w-full"
            />
          </div>

          <div>
            <label className="font-semibold">USDT Address (BEP20) - Withdrawal</label>
            <input
              type="text"
              value={formData.walletAddress || ""}
              onChange={(e) => handleInputChange("walletAddress", e.target.value)}
              className="block border rounded px-3 py-1 mt-1 w-full"
            />
          </div>

          {/* ✅ UPDATED: Deposit Address Field (Read-Only with Copy Button) */}
          <div>
            <label className="font-semibold">Deposit Address</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                readOnly // Make it read-only so admin cannot edit
                value={formData.depositAddress || "Not Generated Yet"}
                className="block border rounded px-3 py-1 w-full bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              {formData.depositAddress && (
                <button
                  onClick={() => handleCopy(formData.depositAddress)}
                  className="p-2 bg-gray-200 hover:bg-gray-300 rounded border transition-colors"
                  title="Copy Deposit Address"
                >
                  <Copy size={18} className="text-gray-700" />
                </button>
              )}
            </div>
          </div>

          <p className="pt-2">
            <strong>Status:</strong>{" "}
            {user.isBlocked ? <span className="text-red-600 font-bold">❌ Blocked</span> : <span className="text-green-600 font-bold">✅ Active</span>}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t">
            <button
              onClick={handleBlockToggle}
              className={`px-4 py-2 rounded text-white flex items-center font-medium shadow-sm transition-colors ${
                user.isBlocked ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {user.isBlocked ? <CheckCircle size={16} /> : <Ban size={16} />}
              <span className="ml-1">{user.isBlocked ? "Unblock User" : "Block User"}</span>
            </button>

            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center font-medium shadow-sm transition-colors"
            >
              <Save size={16} className="inline mr-1" />
              Save Changes
            </button>

            <button
              onClick={handleImpersonate}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center font-medium shadow-sm transition-colors"
            >
              <LogIn size={16} className="inline mr-1" />
              Login as User
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-sm mt-3 p-2 rounded ${message.includes("✅") || message.includes("successfully") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default UserSearch;