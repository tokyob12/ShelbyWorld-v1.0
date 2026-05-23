// --- Polyfills for Browser Compatibility ---
import { Buffer } from "buffer/";
window.Buffer = Buffer;
globalThis.Buffer = Buffer;

// --- Babylon.js Core and Engine Imports ---
import * as BABYLON from "@babylonjs/core/Legacy/legacy";
import "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/loaders/glTF"; 
import "@babylonjs/loaders";
import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Materials/standardMaterial"; 
import "@babylonjs/core/Audio/audioSceneComponent"; 

import { Engine } from "@babylonjs/core/Engines/engine";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine"; 

// --- IMPORTANT: Import Havok Physics from NPM ---
import HavokPhysics from "@babylonjs/havok";

// --- Local Imports ---
import { SceneManager } from "./managers/SceneManager";
import { SettingsUI } from "./ui/SettingsUI";
import { HUDManager } from "./managers/HUDManager";

// Global variables
let engine = null;
let sceneToRender = null;
const canvas = document.getElementById("renderCanvas");
const welcomeOverlay = document.getElementById('welcomeOverlay');
const startButton = document.getElementById('startButton');

// --- Engine Setup ---
const createDefaultEngine = function () {
  return new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false,
  });
};

const startRenderLoop = function (engine) {
  engine.runRenderLoop(function () {
    if (sceneToRender && sceneToRender.activeCamera) {
      sceneToRender.render();
    }
  });
};

// --- Preload Game Engine (Fast Boot) ---
async function preloadGameEngine() {
    console.log("Bootstrapping Engine...");

    // 1. Initialize Havok Physics using the NPM package
    try {
        const havokInstance = await HavokPhysics();
        globalThis.HK = havokInstance; // Babylon.js looks for this global variable
        console.log("Havok Physics initialized.");
    } catch (e) {
        console.error("Failed to initialize Havok Physics:", e);
        if (startButton) startButton.textContent = "Physics Error";
        return;
    }

    // 2. Create the engine
    try {
        window.engine = createDefaultEngine();
        engine = window.engine;
    } catch (e) {
        console.error("Failed to create the default Babylon.js engine:", e);
        if (startButton) startButton.textContent = "Error Loading Engine";
        return;
    }

    // 3. Initialize Audio Engine (Muted initially)
    const engineOptions = engine.getCreationOptions?.();
    if (!engineOptions || engineOptions.audioEngine !== false) {
        AbstractEngine.audioEngine = AbstractEngine.AudioEngineFactory(
            engine.getRenderingCanvas(),
            engine.getAudioContext(),
            engine.getAudioDestination()
        );
        if (AbstractEngine.audioEngine) {
            AbstractEngine.audioEngine.setGlobalVolume(0.0); 
        }
    }

    // 4. Create Scene Manager & Scene
    const sceneManager = new SceneManager(engine, canvas);
        window.sceneManager = sceneManager; 

    window.scene = sceneManager.getScene();
    sceneToRender = window.scene;

// 5. Kick off ASYNC Asset Loading in the background
    if (startButton) {
        startButton.textContent = "STREAMING METAVERSE...";
    }

    sceneManager.initializeScene().then(() => {
        // Initialize UI only AFTER assets are done loading
        HUDManager.initialize(sceneManager.getScene(), sceneManager.characterController);
        SettingsUI.initialize(canvas, sceneManager);
        console.log("All 3D Assets Loaded Successfully!");

        // 6. UNLOCK THE START BUTTON ONLY AFTER LOADING FINISHES!
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = "START GAME";
            startButton.style.boxShadow = "0 0 20px rgba(0, 229, 255, 0.4), 0 0 40px rgba(0, 229, 255, 0.2)";
        }
    }).catch(error => {
        console.error("Asset loading failed:", error);
        if (startButton) {
            startButton.textContent = "CONNECTION ERROR";
            startButton.style.backgroundColor = "#ff4444";
            startButton.style.color = "#ffffff";
        }
    });
}


// --- Interaction & Start Game Flow ---
if (startButton && welcomeOverlay) {
    startButton.addEventListener('click', async () => {
        
        if (AbstractEngine.audioEngine) {
            AbstractEngine.audioEngine.setGlobalVolume(1.0); 
            if (AbstractEngine.audioEngine.audioContext?.state === "suspended") {
                AbstractEngine.audioEngine.audioContext.resume();
            }
        }

        welcomeOverlay.style.opacity = 0;
        
        // C. Prompt for Username/Discord
        const finalPlayerName = await HUDManager.showProfilePrompt();
        
        // ADD THIS: Update the 3D Avatar name live!
        if (window.sceneManager) {
            window.sceneManager.updatePlayerName(finalPlayerName);
        }
        
        setTimeout(() => {
            welcomeOverlay.remove();
        }, 1000); 

        startRenderLoop(engine);
        engine.resize();

    }, { once: true });
}

// Resize handler
window.addEventListener("resize", function () {
  if (engine) engine.resize();
});

// Kick off loading immediately!
preloadGameEngine();