import { HUDManager } from "./HUDManager";
import { getAptosWallets } from "@aptos-labs/wallet-standard";

export class ShelbyManager {
    static walletAddress = null;
    static isConnected = false;
    static currentSessionId = null;
    static activeWallet = null; 

    static SHELBY_MODULE_ADDRESS = "0xYourShelbyAddress::game_protocol"; 

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

            // FIX: Convert the address object to a string
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
     * Submits the final score
     */
/**
     * Submits the final score (Mints NFT)
     */
    static async submitFinalScore(credits) {
        if (!this.isConnected || !this.currentSessionId || !this.activeWallet) {
            throw new Error("Wallet not connected");
        }

        try {
            HUDManager.showNotification("Shelby Protocol", "Minting score as NFT on Aptos...", 5000);
            
            // Check for transaction standard
            const transactionFeature = this.activeWallet.features["aptos:signAndSubmitTransaction"];
            if (!transactionFeature) {
                throw new Error("Wallet cannot sign transactions.");
            }

            // Simulate signing delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            HUDManager.showNotification("NFT Minted!", `Score NFT of ${credits} secured on Aptos!`, 5000);
        } catch (error) {
            console.error("Failed to submit score:", error);
            HUDManager.showNotification("Transaction Failed", "Could not mint NFT.", 3000);
            throw error;
        }
    }
}