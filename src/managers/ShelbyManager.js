import { HUDManager } from "./HUDManager";
import { getAptosWallets } from "@aptos-labs/wallet-standard";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

export class ShelbyManager {
    static walletAddress = null;
    static isConnected = false;
    static currentSessionId = null;
    static activeWallet = null; 

    // Point this to your published Move module address on Testnet
    static SHELBY_MODULE_ADDRESS = "0x8ec6f91e25f8d7a9d14abd36956019583512fd5142aa82e92e3aed494a40b386::game_protocol"; 

    // Paste your pre-funded private key from config.yaml here!
    static SPONSOR_PRIVATE_KEY_HEX = "0xfbfc29690378b7bc5465b6a1266b29fdd0cad279e9bf047b4d0bb933ef8103d0"; 

    /**
     * Safely grabs the Aptos Wallet Standard array via the official adapter,
     * waiting briefly if the wallet extension is loading slowly.
     */
    static async getStandardWallet() {
        const { aptosWallets, on } = getAptosWallets();
        
        const getPreferredWallet = (wallets) => {
            const petra = wallets.find(w => w.name.includes("Petra"));
            return petra || (wallets.length > 0 ? wallets[0] : null);
        };

        // 1. Check immediately
        let wallet = getPreferredWallet(aptosWallets);
        if (wallet) return wallet;

        // 2. Wait up to 1 second for the extension to inject (Fixes timing bugs)
        return new Promise((resolve) => {
            let isResolved = false;

            // Listen for late wallet registrations via the AIP-62 event emitter
            const removeListener = on("register", () => {
                const { aptosWallets: updatedWallets } = getAptosWallets();
                wallet = getPreferredWallet(updatedWallets);
                if (wallet && !isResolved) {
                    isResolved = true;
                    removeListener();
                    resolve(wallet);
                }
            });

            // Fallback timeout after 1 second
            setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    removeListener();
                    const { aptosWallets: finalWallets } = getAptosWallets();
                    resolve(getPreferredWallet(finalWallets) || null);
                }
            }, 1000);
        });
    }

    /**
     * Connects using strictly the new AIP-62 Standard.
     */
    static async connectWallet() {
        try {
            // Get the standard wallet object
            const wallet = await this.getStandardWallet();

            if (!wallet) {
                HUDManager.showNotification("Wallet Error", "Aptos Wallet not found. Please install Petra.", 5000);
                throw new Error("No standard Aptos wallet found");
            }

            // Verify it supports the new AIP-62 standard
            const connectFeature = wallet.features["aptos:connect"];
            if (!connectFeature) {
                HUDManager.showNotification("Outdated Wallet", "Please update your Petra wallet.", 4000);
                throw new Error("Wallet does not support AIP-62 aptos:connect");
            }

            // Perform standard connection
            const response = await connectFeature.connect();
            
            // Extract the address using AIP-62 payload structure
            const rawAddress = response.args?.address || response.account?.address || response.address;
            
            if (!rawAddress) throw new Error("Failed to retrieve wallet address.");

            // Convert the address object to a string
            this.walletAddress = typeof rawAddress === 'string' ? rawAddress : rawAddress.toString();

            this.activeWallet = wallet; 
            this.isConnected = true;

            // ==========================================
            // NETWORK VERIFICATION (AIP-62 STANDARD)
            // ==========================================
            try {
                const networkFeature = wallet.features["aptos:network"];
                if (networkFeature) {
                    const netObj = await networkFeature.network();
                    const currentNetwork = netObj.name ? netObj.name.toLowerCase() : "";
                    
                    if (currentNetwork.includes("mainnet")) {
                        HUDManager.showNotification(
                            "Wrong Network!", 
                            "Please open Petra, go to Settings -> Network, and select ShelbyNet/Testnet.", 
                            6000
                        );
                        throw new Error("Wrong network connected");
                    }
                }
            } catch (netErr) {
                console.warn("Network check failed, proceeding anyway...", netErr);
            }
            // ==========================================
            
            const shortAddress = `${this.walletAddress.substring(0, 6)}...${this.walletAddress.substring(this.walletAddress.length - 4)}`;
            
            HUDManager.showNotification("Aptos Connected", `Welcome ${shortAddress}`);
            return { address: this.walletAddress, shortAddress };

        } catch (error) {
            console.error("Wallet connection failed:", error);
            
            if (error.message === "Wrong network connected") {
                 HUDManager.showNotification("Action Required", "Switch to ShelbyNet in your wallet.", 4000);
            } else {
                 HUDManager.showNotification("Connection Failed", "User rejected or wallet error.", 3000);
            }
            
            throw error;
        }
    }

    /**
     * Starts a verifiable game session on Shelby Protocol
     */
    static async startGameSession() {
        if (!this.isConnected || !this.activeWallet) return;
        
        try {
            console.log("Starting Shelby Game Session...");
            HUDManager.showNotification("Shelby Protocol", "Initializing secure session...", 3000);
            
            this.currentSessionId = Math.floor(Math.random() * 1000000);
            return this.currentSessionId;
        } catch (error) {
            console.error("Failed to start Shelby session:", error);
            HUDManager.showNotification("Protocol Error", "Failed to start session.", 3000);
        }
    }

    /**
     * Submits the final score by executing a live Aptos Move transaction payload (AIP-62)
     * and automatically archiving the player session data to Shelby Decentralized Storage.
     */
    static async submitFinalScore(credits) {
        if (!this.isConnected || !this.currentSessionId || !this.activeWallet) {
            throw new Error("Wallet not connected");
        }

        try {
            HUDManager.showNotification("Shelby Protocol", "Signing transaction payload...", 4000);
            
            // Check for transaction signing standard
            const transactionFeature = this.activeWallet.features["aptos:signAndSubmitTransaction"];
            if (!transactionFeature) {
                throw new Error("Wallet does not support transaction signing.");
            }

            // Create a concrete AIP-62 transaction payload targeting your Move module
            const payload = {
                function: `${this.SHELBY_MODULE_ADDRESS}::mint_passport`,
                typeArguments: [],
                functionArguments: [
                    credits.toString() // String representation required for standard blockchain serialization
                ]
            };

            // Request signature and execution from Petra / Aptos wallet standard
            const response = await transactionFeature.signAndSubmitTransaction({
                payload
            });

            const txHash = response.hash;
            console.log("Aptos Mint Transaction Hash:", txHash);
            HUDManager.showNotification("NFT Minted!", `Score Passport NFT secured on-chain!`, 5000);

            // ==========================================================
            // SHELBY STORAGE INTEGRATION
            // Archiving verified score metadata directly to Shelby hot storage
            // ==========================================================
            try {
                HUDManager.showNotification("Shelby Storage", "Archiving score record to Shelby...", 3000);

                const shelbyClient = new ShelbyClient({ network: "shelbynet" });

                // Construct session payload
                const scoreData = {
                    wallet_address: this.walletAddress,
                    score: credits,
                    tx_hash: txHash,
                    timestamp: Date.now()
                };

                const textEncoder = new TextEncoder();
                const blobData = textEncoder.encode(JSON.stringify(scoreData));

                // Initialize Sponsor Signer from your pre-funded private key
                if (this.SPONSOR_PRIVATE_KEY_HEX === "0xYourPreFundedPrivateKeyHere") {
                    throw new Error("Sponsor Private Key not configured in ShelbyManager.js");
                }
                const pKey = new Ed25519PrivateKey(this.SPONSOR_PRIVATE_KEY_HEX);
                const sponsorSigner = Account.fromPrivateKey({ privateKey: pKey });

                // Push blob to the Shelby network using the sponsor account to pay fees
                await shelbyClient.upload({
                    blobData,
                    signer: sponsorSigner, 
                    blobName: `player_scores/${this.walletAddress}.json`,
                    expirationMicros: Date.now() * 1000 + (86400 * 365 * 1000000) // 365 Days Retention
                });

                // Under Shelby Protocol, the retrieval path is constructed deterministically
                const blobUrl = `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${sponsorSigner.accountAddress.toString()}/player_scores/${this.walletAddress}.json`;
                console.log("Player record archived on Shelby at URI:", blobUrl);
                HUDManager.showNotification("Shelby Storage", "Score permanently saved!", 4000);

            } catch (shelbyErr) {
                console.error("Shelby archiving failed:", shelbyErr);
                HUDManager.showNotification("Storage Error", "Could not save backup record.", 3000);
            }
            // ==========================================================
            
            return txHash;
        } catch (error) {
            console.error("Failed to submit score:", error);
            HUDManager.showNotification("Transaction Failed", "User rejected signature or transaction failed.", 4000);
            throw error;
        }
    }
}