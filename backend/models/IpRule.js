const mongoose = require('mongoose');

const ipRuleSchema = new mongoose.Schema({
    ipAddress: { type: String, required: true, unique: true },
    // 🟢 Limit hata di, ab sirf blocking control rahega
    isBlocked: { type: Boolean, default: false } 
}, { timestamps: true });

module.exports = mongoose.model('IpRule', ipRuleSchema);