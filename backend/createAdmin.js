const mongoose = require("mongoose");
const Admin = require("./models/Admin"); 
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

async function createAdmin(adminId, password) {
  try {
    if (!adminId || !password) throw new Error("Admin ID and password are required");

    const exists = await Admin.findOne({ adminId });
    if (exists) {
      console.log(`⚠️ Admin with adminId "${adminId}" already exists.`);
      return process.exit(0);
    }

    // 🔐 Let the schema handle hashing automatically
    const admin = new Admin({ adminId, password });
    await admin.save();

    console.log(`✅ New admin created! adminId: ${adminId}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    process.exit(1);
  }
}

// Replace with your desired admin credentials
createAdmin("admin", "admin321"); 
