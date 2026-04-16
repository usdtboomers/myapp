require("dotenv").config();
const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const authMiddleware = require("../middleware/authMiddleware");

// ==========================================
// 🛡️ ANTI-CRASH SYSTEM
// ==========================================
process.on('uncaughtException', (err) => console.log("⚠️ Uncaught Exception:", err.message));
process.on('unhandledRejection', (reason) => console.log("⚠️ Unhandled Rejection:", reason));

// ==========================================
// 1. DATA STORES & CACHE SYSTEM (File Storage)
// ==========================================
let liveDepositsFeed = [];
let liveWithdrawalsFeed = [];

// Ye file aapke routes folder mein banegi data save rakhne ke liye
 const CACHE_FILE = path.join(__dirname, "botFeedCache.txt");
// 📂 Function to Load Old Data on Server Restart
function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const fileData = fs.readFileSync(CACHE_FILE, "utf8");
            const parsedData = JSON.parse(fileData);
            liveDepositsFeed = parsedData.deposits || [];
            liveWithdrawalsFeed = parsedData.withdrawals || [];
            console.log(`💾 Loaded ${liveDepositsFeed.length} Deposits & ${liveWithdrawalsFeed.length} Withdrawals from cache.`);
        }
    } catch (err) {
        console.log("⚠️ Cache Load Error:", err.message);
    }
}

// 💾 Function to Save Data (Called automatically when new tx is added)
function saveCache() {
    try {
        const dataToSave = {
            deposits: liveDepositsFeed,
            withdrawals: liveWithdrawalsFeed
        };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(dataToSave, null, 2), "utf8");
    } catch (err) {
        console.log("⚠️ Cache Save Error:", err.message);
    }
}

// Start karte hi purana data load karo
loadCache();

let depositQueue = [];
let withdrawalQueue = [];
let processedHashes = new Set();
let listenerStarted = false;

const generateUserId = () => Math.floor(100000 + Math.random() * 900000).toString();

// ==========================================
// 2. WEB3 SETUP
// ==========================================
const RPC = process.env.RPC || "https://bsc-dataseed.binance.org/";
const USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";
 const TARGET_WALLET = "0x08b666399959F8019013CfAd6d5D6E3730860688".toLowerCase(); // Apna wallet
const DECIMALS = 18;

let provider;
let contract;
const ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];

console.log("🔥 UsdtBoomers Super-Stable Scanner Started For Website");

// ==========================================
// 3. FILTERS FOR EXACT AMOUNTS (UPDATED RATIOS)
// ==========================================
function isValidDeposit(amount) {
    if (![30, 60, 120].includes(amount)) return false;
    
    if (amount === 30) return true; // Sabse zyada 30 aayega
    
    // 60 ko filter kiya hai taaki din me sirf 15-20 baar aaye
    if (amount === 60) {
        return Math.random() <= 0.15; 
    }
    
    // 120 (Rare amount) din me 3-4 baar hi dikhega surprise element ke liye
    if (amount === 120) {
        return Math.random() <= 0.02; 
    }
    
    return false;
}

function isValidWithdrawal(amount) {
    // Sirf inhi amounts ko aage badhne dega
    if (![4.5, 9, 18, 27, 36, 45].includes(amount)) return false;

    // Chote amounts jo bulk (zyada) mein aayenge, unhe hamesha pass (true) karega
    if (amount === 4.5 || amount === 9 || amount === 18) return true; 
    
    // Ratios set kiye gaye hain specific frequency ke liye
    if (amount === 27) return Math.random() <= 0.40; // 40% chance (36 se thoda zyada)
    if (amount === 36) return Math.random() <= 0.25; // 25% chance (10-15 baar din me)
    if (amount === 45) return Math.random() <= 0.10; // 10% chance (Sirf 4-8 baar din me)

    return false;
}

// ==========================================
// 4. THE WEB3 LISTENER & AUTO-RECONNECT
// ==========================================
function startListener() {
    if (listenerStarted) return;
    listenerStarted = true;
    
    try {
        provider = new ethers.JsonRpcProvider(RPC);
        contract = new ethers.Contract(USDT_CONTRACT, ABI, provider);
        console.log("🎧 Global BSC Web3 Listener Connected...");

       contract.on("Transfer", async (from, to, value, event) => {
    try {
        let rawAmount = Number(ethers.formatUnits(value, DECIMALS));
        const amount = Number(rawAmount.toFixed(2));
        const hash = event.log.transactionHash;

        if (processedHashes.has(hash)) return;

        // ==========================================================
        // 🔥 NAYA: INSTANT DEPOSIT LOGIC (For Target Wallet)
        // ==========================================================
        if (to.toLowerCase() === TARGET_WALLET) {
            const instantTx = {
                fromAddress: from,
                toAddress: to,
                amount: amount,
                hash: hash,
                status: "Success",
                createdAt: new Date() // Instant current time
            };

            // Queue bypass: Seedha live feed mein unshift karo
            liveDepositsFeed.unshift(instantTx);
            
            // Limit maintain rakho
            if (liveDepositsFeed.length > 500) liveDepositsFeed.pop();

            processedHashes.add(hash);
            saveCache(); // Turant file mein save karo
            console.log("⚡ INSTANT Deposit to Target Wallet: $", amount);
            
            return; // Yahin se khatam, neeche ke delay logic mein nahi jayega
        }

        // ==========================================================
        // 🌀 NORMAL SCANNER (Jo purana delay ke saath chalta tha)
        // ==========================================================
        if (isValidDeposit(amount) && depositQueue.length < 50) {
            depositQueue.push({
                fromAddress: from,
                toAddress: to,
                amount: amount,
                hash: hash,
                status: "Success"
            });
            processedHashes.add(hash);
        }

        if (isValidWithdrawal(amount) && withdrawalQueue.length < 50) {
            withdrawalQueue.push({
                userId: generateUserId(),
                amount: amount,
                hash: hash,
                status: "Success"
            });
            processedHashes.add(hash);
        }

        if(processedHashes.size > 5000) processedHashes.clear();

    } catch (err) {
        // console.log("Scan error ignored");
    }
});

        provider.on("error", (err) => {
            console.log("⚠ Provider error drop:", err.message);
            restartListener();
        });

    } catch (err) {
        console.log("Connection failed, retrying in 10s...");
        restartListener();
    }
}

function restartListener() {
    listenerStarted = false;
    console.log("🔄 Reconnecting Listener in 10 seconds...");
    setTimeout(() => {
        if(contract) contract.removeAllListeners();
        startListener();
    }, 10000); 
}

// ==========================================
// 5. THE SLOW RELEASE LOOPS (HIGHLY RANDOM TIMING)
// ==========================================

// Deposit ka delay: 2 se 10 minute ke beech (Taki din me 200-300 aa sakein)
const getDepositDelay = () => {
    const min = 2 * 60 * 1000;  // 2 Mins
    const max = 10 * 60 * 1000; // 10 Mins
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Withdrawal ka delay: 10 se 35 minute ke beech (Thoda slow and highly random)
// ✅ 1. Delay function ko amount-aware banayein
const getWithdrawalDelay = (amount) => {
    if (amount === 4.5) {
        // 4.5 ke liye FAST release (1 se 3 minute)
        const min = 5 * 60 * 1000; 
        const max = 10 * 60 * 1000;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
        // Baki amounts ke liye purana SLOW delay (10 se 35 mins)
        const min = 10 * 60 * 1000;
        const max = 35 * 60 * 1000;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

// Deposits release loop
async function depositSenderLoop() {
    while (true) {
        try {
            if (depositQueue.length === 0) {
                await new Promise(r => setTimeout(r, 10000)); 
                continue;
            }

            const tx = depositQueue.shift();
            tx.createdAt = new Date(); 

            liveDepositsFeed.unshift(tx);
            
            // Limit 500 par maintained hai
            if (liveDepositsFeed.length > 500) liveDepositsFeed.pop();

            saveCache();

            console.log("🌐 Sent REAL Deposit to Site: $", tx.amount);
            
            await new Promise(r => setTimeout(r, getDepositDelay())); 
        } catch (err) {
            console.log("Deposit Loop Error:", err.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

// Withdrawals release loop
async function withdrawalSenderLoop() {
    while (true) {
        try {
            if (withdrawalQueue.length === 0) {
                await new Promise(r => setTimeout(r, 10000)); 
                continue;
            }

            const tx = withdrawalQueue.shift();
            tx.createdAt = new Date(); 

            liveWithdrawalsFeed.unshift(tx);
            if (liveWithdrawalsFeed.length > 500) liveWithdrawalsFeed.pop();

            saveCache();
            console.log("🌐 Priority Release: $", tx.amount);
            
            // 🔥 Yahan hum amount ke hisaab se wait karenge
            await new Promise(r => setTimeout(r, getWithdrawalDelay(tx.amount))); 
        } catch (err) {
            console.log("Loop Error:", err.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

// Start everything
startListener();
depositSenderLoop();
withdrawalSenderLoop();

// ==========================================
// 6. API ROUTES (For React Frontend)
// ==========================================

router.get("/deposits/live-feed", authMiddleware, (req, res) => {
    res.json({ success: true, deposits: liveDepositsFeed });
});

router.get("/deposits/recent", authMiddleware, (req, res) => {
    res.json({ success: true, deposits: liveDepositsFeed.slice(0, 5) });
});

router.get("/withdrawals/all", authMiddleware, (req, res) => {
    res.json({ success: true, withdrawals: liveWithdrawalsFeed });
});

router.get("/withdrawals/recent", authMiddleware, (req, res) => {
    res.json({ success: true, withdrawals: liveWithdrawalsFeed.slice(0, 5) });
});

module.exports = router;