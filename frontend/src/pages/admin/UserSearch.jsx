import React, { useState } from "react";
import api from "api/axios";
import { Search, Ban, CheckCircle, Save, LogIn } from "lucide-react";

const API_BASE = "https://eliteinfinity.live"; // ✅ Fixed: IP ki jagah domain aur https
function UserSearch() {
  const [searchId, setSearchId] = useState("");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");

  // ✅ CORRECT token key (MATCHES AdminLogin.jsx)
  const getAdminToken = () => localStorage.getItem("adminToken");

  // ================= SEARCH USER =================
  const handleSearch = async () => {
    const token = getAdminToken();
    if (!token) return setMessage("Admin not authenticated");

    try {
      const res = await api.get(
        `${API_BASE}/api/user/${searchId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUser(res.data.user);
      setFormData(res.data.user);
      setMessage("");
    } catch (err) {
      console.error(err);
      setUser(null);
      setMessage("User not found");
    }
  };

  // ================= BLOCK / UNBLOCK =================
  const handleBlockToggle = async () => {
    if (!user) return;

    const token = getAdminToken();
    if (!token) return setMessage("Admin not authenticated");

    try {
      const url = user.isBlocked
        ? `${API_BASE}/api/admin/unblock-user/${user.userId}`
        : `${API_BASE}/api/admin/block-user/${user.userId}`;

      await api.put(
        url,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser((prev) => ({ ...prev, isBlocked: !prev.isBlocked }));
      setMessage(
        `User ${user.isBlocked ? "unblocked" : "blocked"} successfully`
      );
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

      // ❌ same passwords mat bhejo
      if (payload.password === user.password) delete payload.password;
      if (payload.txnPassword === user.txnPassword) delete payload.txnPassword;

      const res = await api.put(
        `${API_BASE}/api/admin/${user.userId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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
    const res = await api.get(
      `${API_BASE}/api/admin/impersonate/${user.userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { token: userToken, user: impersonatedUser } = res.data;

    // 🔐 Store separately
   localStorage.setItem("token", userToken);
localStorage.setItem("user", JSON.stringify(impersonatedUser));
localStorage.setItem("isImpersonating", "true");


    // 🚀 Open user dashboard in new tab
    window.open("/dashboard", "_blank", "noopener,noreferrer");
  } catch (err) {
    console.error(err);
    setMessage("Failed to impersonate user");
  }
};


  return (
    <div className="bg-white rounded-2xl p-5 shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-indigo-600">
        🔍 Search User
      </h2>

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
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          <Search size={18} />
        </button>
      </div>

      {user && (
        <div className="bg-gray-50 p-4 rounded border space-y-3">
          {["name", "email", "mobile", "country", "password", "txnPassword"].map(
            (field) => (
              <div key={field}>
                <label className="font-semibold capitalize">{field}</label>
                <input
                  type="text"
                  value={formData[field] || ""}
                  onChange={(e) =>
                    handleInputChange(field, e.target.value)
                  }
                  className="block border rounded px-3 py-1 mt-1 w-full"
                />
              </div>
            )
          )}

          <div>
            <label className="font-semibold">Wallet Balance</label>
            <input
              type="number"
              value={formData.walletBalance || 0}
              onChange={(e) =>
                handleInputChange("walletBalance", e.target.value)
              }
              className="block border rounded px-3 py-1 mt-1 w-full"
            />
          </div>

          <div>
            <label className="font-semibold">USDT Address</label>
            <input
              type="text"
              value={formData.walletAddress || ""}
              onChange={(e) =>
                handleInputChange("walletAddress", e.target.value)
              }
              className="block border rounded px-3 py-1 mt-1 w-full"
            />
          </div>

          <p>
            <strong>Status:</strong>{" "}
            {user.isBlocked ? "❌ Blocked" : "✅ Active"}
          </p>

          <div className="flex gap-2 flex-wrap mt-3">
            <button
              onClick={handleBlockToggle}
              className={`px-4 py-2 rounded text-white ${
                user.isBlocked ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {user.isBlocked ? <CheckCircle size={16} /> : <Ban size={16} />}
              <span className="ml-1">
                {user.isBlocked ? "Unblock" : "Block"}
              </span>
            </button>

            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              <Save size={16} className="inline mr-1" />
              Save Changes
            </button>

            <button
              onClick={handleImpersonate}
              className="bg-purple-600 text-white px-4 py-2 rounded"
            >
              <LogIn size={16} className="inline mr-1" />
              Login as User
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="text-sm text-gray-600 mt-3 italic">{message}</p>
      )}
    </div>
  );
}

export default UserSearch;
