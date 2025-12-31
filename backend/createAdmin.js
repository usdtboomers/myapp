const mongoose = require("mongoose");
const Admin = require("./models/Admin"); // Ensure ye path sahi ho
const crypto = require("crypto"); 
require("dotenv").config();

// Database se connect
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

async function resetAndCreateSecureAdmin(plainAdminId, plainPassword) {
  try {
    // 1. Purana data saaf (Delete Old Admin)
    await Admin.deleteMany({});
    console.log("🗑️  Purana Admin data delete ho gaya.");

    // 2. Admin ID ko HASH me convert karna (SHA-256)
    // "Malik" -> "ab54d..."
    const hashedAdminId = crypto.createHash("sha256").update(plainAdminId).digest("hex");

    // 3. Naya Admin save karna
    // Note: ID humne upar hash kar di, Password model khud hash karega
    const admin = new Admin({ 
        adminId: hashedAdminId,  
        password: plainPassword, 
        role: "admin"
    });

    await admin.save();

    console.log(`✅ Naya Admin Set Ho Gaya!`);
    console.log(`-------------------------------------------`);
    console.log(`👤 Login ID:   ${plainAdminId}`);
    console.log(`🔑 Password:   ${plainPassword}`);
    console.log(`-------------------------------------------`);
    console.log(`⚠️  Ab jaake apna Backend Login Code update karna mat bhulna!`);
    
    process.exit(0);

  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

// 👇 Is line se naya admin banega
resetAndCreateSecureAdmin("Magic@Cricket", "ChromeDino@00");