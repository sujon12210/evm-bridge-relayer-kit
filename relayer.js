const { ethers } = require("ethers");
require("dotenv").config();

// Minimal ABI for Bridge interaction
const BRIDGE_ABI = [
    "event Deposit(address indexed user, uint256 amount, uint256 nonce)",
    "function mint(address user, uint256 amount, uint256 nonce) external"
];

async function startRelayer() {
    const sourceProvider = new ethers.JsonRpcProvider(process.env.SOURCE_RPC_URL);
    const destProvider = new ethers.JsonRpcProvider(process.env.DEST_RPC_URL);
    
    const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, destProvider);
    
    const sourceContract = new ethers.Contract(process.env.SOURCE_BRIDGE_ADDR, BRIDGE_ABI, sourceProvider);
    const destContract = new ethers.Contract(process.env.DEST_BRIDGE_ADDR, BRIDGE_ABI, wallet);

    console.log("--- Relayer Service Started ---");
    console.log(`Monitoring Source: ${process.env.SOURCE_BRIDGE_ADDR}`);

    sourceContract.on("Deposit", async (user, amount, nonce, event) => {
        console.log(`\n[Event Detected] User: ${user} | Amount: ${ethers.formatEther(amount)} | Nonce: ${nonce}`);
        
        try {
            console.log("Relaying to destination chain...");
            
            // Gas estimation and transaction execution
            const tx = await destContract.mint(user, amount, nonce);
            console.log(`Transaction Sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`Transaction Confirmed in block ${receipt.blockNumber}`);
        } catch (error) {
            console.error("Relay Failed:", error.reason || error.message);
        }
    });
}

startRelayer().catch((err) => {
    console.error("Relayer Fatal Error:", err);
    process.exit(1);
});
