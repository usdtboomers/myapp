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
const DECIMALS = 18;

let provider;
let contract;
const ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];

console.log("🔥 Rebirth Super-Stable Scanner Started For Website");

// ==========================================
// 3. FILTERS FOR EXACT AMOUNTS
// ==========================================
function isValidDeposit(amount) {
    if (![30, 60, 120, 240, 480, 960].includes(amount)) return false;
    
    if (amount === 30 || amount === 60) return true;
    
    if (amount > 60) {
        return Math.random() <= 0.001; 
    }
    return false;
}

function isValidWithdrawal(amount) {
    return [9, 18, 27, 36, 45].includes(amount);
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
                const amount = Number(ethers.formatUnits(value, DECIMALS));
                const hash = event.log.transactionHash;

                if (processedHashes.has(hash)) return;

                if (isValidDeposit(amount) && depositQueue.length < 30) {
                    depositQueue.push({
                        fromAddress: from,
                        toAddress: to,
                        amount: amount,
                        hash: hash,
                        status: "Success"
                    });
                    processedHashes.add(hash);
                }

                if (isValidWithdrawal(amount) && withdrawalQueue.length < 30) {
                    withdrawalQueue.push({
                        userId: generateUserId(),
                        amount: amount,
                        hash: hash,
                        status: "Success"
                    });
                    processedHashes.add(hash);
                }

                if(processedHashes.size > 5000) processedHashes.clear();

            } catch (err) {}
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
// 5. THE SLOW RELEASE LOOPS (10 Min Delay)
// ==========================================
const getRandom10MinDelay = () => {
    const min = 8 * 60 * 1000;  // 8 Mins
    const max = 12 * 60 * 1000; // 12 Mins
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
            
            // Limit ko 100 kar diya gaya hai
            if (liveDepositsFeed.length > 100) liveDepositsFeed.pop();

            // Naya data aane par file me save karo
            saveCache();

            console.log("🌐 Sent REAL Deposit to Site: $", tx.amount);
            
            await new Promise(r => setTimeout(r, getRandom10MinDelay())); 
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
            
            // Limit ko 100 kar diya gaya hai
            if (liveWithdrawalsFeed.length > 100) liveWithdrawalsFeed.pop();

            // Naya data aane par file me save karo
            saveCache();

            console.log("🌐 Sent REAL Withdrawal to Site: $", tx.amount);
            
            await new Promise(r => setTimeout(r, getRandom10MinDelay())); 
        } catch (err) {
            console.log("Withdrawal Loop Error:", err.message);
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