// --- Imports ---
import * as BABYLON from "@babylonjs/core/Legacy/legacy";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AdvancedDynamicTexture, Control, Rectangle, TextBlock, Button, StackPanel } from "@babylonjs/gui/2D";

// Local imports
import { CONFIG, CHARACTER_STATES } from "../constants/GameConfig";
import { CollectiblesManager } from "./CollectiblesManager";
import { ShelbyManager } from "./ShelbyManager";

// ============================================================================
// HUD MANAGER
// ============================================================================
export class HUDManager {
  static hudContainer = null;
  static hudElements = new Map();
  static scene = null;
  static characterController = null;
  static startTime = 0;
  static lastUpdateTime = 0;
  static updateInterval = null;
  static fpsCounter = 0;
  static fpsLastTime = 0;
  static currentFPS = 0;
  
  // Name Prompt properties
  static playerName = "";
  static _namePromptShowing = false;
  static _namePrompt_prevCamera = null;
  static _namePrompt_prevCanvasPointerEvents = null;
  
  // Time Up properties
  static timeUpGui = null;
  static timeUpGuiShown = false;
  static _timeUpAlreadyShown = false;
  static _timeUpFadeInterval = null;
  
  // Question Popup properties
  static questionGui = null;

  // show a full-screen modal asking for player's name. Returns a Promise<string>.
  static showNamePrompt(
    promptText = "Enter your name",
    placeholder = "Player"
  ) {
    if (this.playerName && this.playerName.trim().length > 0) {
      return Promise.resolve(this.playerName);
    }
    if (this._namePromptShowing)
      return Promise.resolve(this.playerName || placeholder);

    this._namePromptShowing = true;

    return new Promise((resolve) => {
      // create overlay (DOM logic remains here)
      const overlay = document.createElement("div");
      overlay.id = "name-prompt-overlay";
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        zIndex: "2147483647",
        pointerEvents: "auto",
        fontFamily: "Arial, sans-serif",
      });

      const box = document.createElement("div");
      Object.assign(box.style, {
        width: "min(720px, 92%)",
        padding: "28px",
        borderRadius: "12px",
        background: "#0f1720",
        color: "#fff",
        textAlign: "center",
        boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
      });

      const title = document.createElement("div");
      title.textContent = promptText;
      Object.assign(title.style, {
        fontSize: "20px",
        marginBottom: "12px",
        fontWeight: "600",
      });

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = placeholder;
      input.id = "player-name-input";
      Object.assign(input.style, {
        width: "80%",
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "#fff",
        fontSize: "16px",
        outline: "none",
      });

      try {
        const saved = localStorage.getItem("playerName");
        if (saved) input.value = saved;
      } catch (e) {}

      const hint = document.createElement("div");
      hint.textContent = "Secure Your Data, Protect Your Privacy";
      Object.assign(hint.style, {
        fontSize: "12px",
        color: "#9aa3b2",
        marginTop: "8px",
        marginBottom: "14px",
      });

      const buttonRow = document.createElement("div");
      Object.assign(buttonRow.style, {
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        marginTop: "8px",
      });

      const submitBtn = document.createElement("button");
      submitBtn.textContent = "Start";
      Object.assign(submitBtn.style, {
        padding: "10px 18px",
        borderRadius: "8px",
        border: "none",
        background: "#00E5FF",
        color: "#050508",
        cursor: "pointer",
        fontSize: "16px",
      });

      buttonRow.appendChild(submitBtn);
      box.appendChild(title);
      box.appendChild(input);
      box.appendChild(hint);
      box.appendChild(buttonRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      // Lock camera/controls & freeze player defensively
      try {
        const canvas = this.scene?.getEngine().getRenderingCanvas();
        const cam = this.scene?.activeCamera;
        this._namePrompt_prevCanvasPointerEvents = canvas?.style?.pointerEvents;
        this._namePrompt_prevCamera = cam;
        if (cam && canvas && typeof cam.detachControl === "function")
          cam.detachControl(canvas);
        if (canvas) canvas.style.pointerEvents = "none";
      } catch (e) {}

      try {
        if (
          this.characterController &&
          typeof this.characterController.pausePhysics === "function"
        ) {
          this.characterController.pausePhysics();
        }
      } catch (e) {}

      // helper to close and resolve
      const finish = (name) => {
        const finalName = (name || "").toString().trim() || "Player";
        this.playerName = finalName;
        try {
          localStorage.setItem("playerName", finalName);
        } catch (e) {}
        try {
          overlay.remove();
        } catch (e) {}
        try {
          const canvas = this.scene?.getEngine().getRenderingCanvas();
          const cam = this._namePrompt_prevCamera;
          if (cam && canvas && typeof cam.attachControl === "function")
            cam.attachControl(canvas, true);
          if (canvas)
            canvas.style.pointerEvents =
              this._namePrompt_prevCanvasPointerEvents ?? "auto";
        } catch (e) {}
        try {
          if (
            this.characterController &&
            typeof this.characterController.resumePhysics === "function"
          )
            this.characterController.resumePhysics();
        } catch (e) {}
        this._namePromptShowing = false;
        this._namePrompt_prevCamera = null;
        this._namePrompt_prevCanvasPointerEvents = null;
        resolve(this.playerName);
      };

      // events
      submitBtn.addEventListener("click", () => finish(input.value));
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish(input.value);
      });

      setTimeout(() => input.focus(), 50);
    });
  }

  static showProfilePrompt() {
      if (this._namePromptShowing) return Promise.resolve(this.playerName);
      this._namePromptShowing = true;

      return new Promise((resolve) => {
          const styleId = "shelby-prompt-styles";
          if (!document.getElementById(styleId)) {
              const style = document.createElement("style");
              style.id = styleId;
              style.textContent = `
                  @keyframes promptFadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(15px); } }
                  @keyframes modalSlideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                  .shelby-prompt-overlay { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; background: rgba(5, 5, 8, 0.8); font-family: 'Space Grotesk', sans-serif; animation: promptFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                  .shelby-prompt-modal { width: min(500px, 90%); padding: 40px; background: rgba(15, 15, 20, 0.6); border: 1px solid rgba(0, 229, 255, 0.15); border-radius: 16px; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05); text-align: center; animation: modalSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.1s; opacity: 0; }
                  .shelby-prompt-title { font-size: 1.5rem; font-weight: 700; color: #00E5FF; letter-spacing: 2px; margin-bottom: 30px; }
                  .shelby-prompt-btn { width: 100%; padding: 16px; margin-top: 10px; background: #00E5FF; color: #050508; border: none; border-radius: 8px; font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 0 20px rgba(0, 229, 255, 0.2); display: flex; align-items: center; justify-content: center; gap: 10px; }
                  .shelby-prompt-btn:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(0, 229, 255, 0.4); }
              `;
              document.head.appendChild(style);
          }

          const overlay = document.createElement("div");
          overlay.className = "shelby-prompt-overlay";

          const box = document.createElement("div");
          box.className = "shelby-prompt-modal";

          const title = document.createElement("div");
          title.className = "shelby-prompt-title";
          title.textContent = "SHELBY PROTOCOL LINK";

          const subtitle = document.createElement("p");
          subtitle.style.color = "#8892b0";
          subtitle.style.marginBottom = "30px";
          subtitle.textContent = "Connect your Aptos wallet (e.g., Petra) to initialize a verifiable gaming session.";

          const submitBtn = document.createElement("button");
          submitBtn.className = "shelby-prompt-btn";
          
          submitBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12h2v4h-2z"></path></svg> CONNECT APTOS WALLET`;

          box.appendChild(title);
          box.appendChild(subtitle);
          box.appendChild(submitBtn);
          overlay.appendChild(box);
          document.body.appendChild(overlay);

          submitBtn.addEventListener("click", async () => {
              submitBtn.textContent = "CONNECTING...";
              submitBtn.disabled = true;

              try {
                  const walletData = await ShelbyManager.connectWallet();
                  await ShelbyManager.startGameSession();

                  this.playerName = walletData.shortAddress;
                  
                  overlay.style.transition = "opacity 0.4s ease";
                  overlay.style.opacity = "0";
                  box.style.transform = "translateY(20px) scale(0.95)";
                  
                  setTimeout(() => {
                      overlay.remove();
                      this._namePromptShowing = false;
                      resolve(this.playerName);
                  }, 400);

              } catch (error) {
                  submitBtn.innerHTML = `CONNECT APTOS WALLET`;
                  submitBtn.disabled = false;
              }
          });
      });
  }

  static getPlayerName(defaultName = "Player") {
    return (
      this.playerName ||
      (localStorage.getItem
        ? localStorage.getItem("playerName") || defaultName
        : defaultName)
    );
  }

  static leftZone = null;
  static centerZone = null;
  static rightZone = null;

  static initialize(scene, characterController) {
    if (this.hudContainer) {
      this.dispose();
    }
    this.scene = scene;
    this.characterController = characterController;
    this.startTime = Date.now();
    this.createHUD();
    
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
      
    if (isMobile) {
      this.setElementVisibility("coordinates", false);
      this.setElementVisibility("time", false);
      this.setElementVisibility("credits", true);
    } else {
      this.setElementVisibility("coordinates", CONFIG.HUD.SHOW_COORDINATES);
      this.setElementVisibility("time", CONFIG.HUD.SHOW_TIME);
      this.setElementVisibility("credits", CONFIG.HUD.SHOW_CREDITS);
    }
    this.startUpdateLoop();
  }

  static createHUD() {
    if (!this.scene) return;
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    this.addHUDAnimations();

    this.hudContainer = document.createElement("div");
    this.hudContainer.id = "game-hud";
    this.hudContainer.style.cssText = this.getHUDContainerStyles();

    const timeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const creditsIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`;
    const coordsIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>`;

    this.createHUDElement("time", "TIME REMAINING", timeIcon);
    this.createHUDElement("credits", "NETWORK CREDITS", creditsIcon);
    this.createHUDElement("coordinates", "SYS.COORDS", coordsIcon);

    this.hudContainer.appendChild(this.hudElements.get('time'));
    this.hudContainer.appendChild(this.hudElements.get('coordinates'));
    this.hudContainer.appendChild(this.hudElements.get('credits'));

    const canvasParent = canvas.parentElement;
    if (canvasParent) {
      canvasParent.appendChild(this.hudContainer);
    }
    
    this.scene.onBeforeRenderObservable.add(() => {
        this.fpsCounter++;
        const currentTime = Date.now();
        if (currentTime - this.fpsLastTime >= 1000) {
            this.currentFPS = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsLastTime = currentTime;
        }
    });
  }

  static showShelbyKeySuccessPopup(credits) {
    if (!this.scene || this._shelbyKeyPopupShowing) return;
    this._shelbyKeyPopupShowing = true;

    const overlay = document.createElement("div");
    overlay.id = "shelby-key-success-overlay";
    Object.assign(overlay.style, {
        position: "fixed", 
        inset: "0", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        background: "rgba(10, 10, 30, 0.95)", 
        backdropFilter: "blur(5px)", 
        zIndex: "2147483647", 
        opacity: "0", 
        transition: "opacity 0.5s ease-out", 
        fontFamily: "'Space Grotesk', sans-serif", 
        pointerEvents: "auto"
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
        width: "min(600px, 90%)", 
        padding: "40px", 
        borderRadius: "12px", 
        background: "rgba(0, 0, 0, 0.9)", 
        border: `2px solid ${CONFIG.HUD.HIGHLIGHT_COLOR}`, 
        boxShadow: `0 0 25px rgba(0, 229, 255, 0.6)`, 
        color: "white", 
        textAlign: "center", 
        transform: "scale(0.8)", 
        transition: "transform 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)"
    });
    
    box.innerHTML = `
        <h1 style="color: ${CONFIG.HUD.HIGHLIGHT_COLOR}; font-size: 3rem; margin-bottom: 10px; text-shadow: 0 0 5px ${CONFIG.HUD.HIGHLIGHT_COLOR}; margin-top: 0;">
            SHELBY KEY SECURED!
        </h1>
        <p style="font-size: 1.2rem; margin-bottom: 25px; color: #8892b0; line-height: 1.5;">
            You have successfully answered the sufficient questions! Now you can mint the NFT passport to access Shelbyworld through the teleport door.
        </p>
        <div style="font-size: 1.5rem; font-weight: bold; color: ${CONFIG.HUD.HIGHLIGHT_COLOR}; margin-bottom: 30px;">
            FINAL SCORE: ${credits} CREDITS
        </div>
        <button id="shelby-key-continue" style="
            padding: 16px 30px; font-size: 1.1rem; font-weight: bold; border: none;
            background: ${CONFIG.HUD.HIGHLIGHT_COLOR}; color: black; border-radius: 8px;
            cursor: pointer; transition: background 0.2s; margin-bottom: 15px; width: 100%;
        ">
            MINT SCORE AS NFT
        </button>
        <button id="shelby-key-skip" style="
            padding: 16px 30px; font-size: 1rem; border: 1px solid #8892b0;
            background: transparent; color: #8892b0; border-radius: 8px;
            cursor: pointer; width: 100%; transition: all 0.2s;
        ">
            CONTINUE EXPLORING
        </button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = "1";
        box.style.transform = "scale(1)";
    }, 50);

    try {
        if (this.characterController) this.characterController.pausePhysics();
        if (this.scene.activeCamera) this.scene.activeCamera.detachControl();
    } catch (e) {
        console.warn("Could not detach controls:", e);
    }
    
    const submitBtn = document.getElementById("shelby-key-continue");
    if (submitBtn) {
        submitBtn.textContent = "MINT SCORE AS NFT";
        
        submitBtn.addEventListener("click", async () => {
            submitBtn.textContent = "SIGNING APTOS TRANSACTION...";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";
            submitBtn.style.cursor = "not-allowed";
            
            try {
                await ShelbyManager.submitFinalScore(credits);
                submitBtn.textContent = "NFT MINTED ✓";
                submitBtn.style.background = "#00ff88";
                submitBtn.style.opacity = "1";
                
                setTimeout(() => {
                    overlay.style.opacity = "0";
                    box.style.transform = "scale(0.8)";
                    
                    setTimeout(() => {
                        overlay.remove(); 
                        
                        try {
                            if (this.characterController) this.characterController.resumePhysics();
                            const canvas = this.scene.getEngine().getRenderingCanvas();
                            if (this.scene.activeCamera && canvas) {
                                this.scene.activeCamera.attachControl(canvas, true);
                            }
                        } catch (e) {}
                        
                        this._shelbyKeyPopupShowing = false;

                        if (window.sceneManager) {
                            window.sceneManager.spawnTeleportPortal();
                        }

                        // Inform the user to go to the teleport door
                        HUDManager.showNotification(
                            "Access Granted!", 
                            "Your NFT Passport is minted. Go find the Teleport Door to enter Shelbyworld!", 
                            8000
                        );

                    }, 500); 
                }, 1500);

            } catch (error) {
                submitBtn.textContent = "RETRY MINTING";
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
            }
        });
    }

    const skipBtn = document.getElementById("shelby-key-skip");
    if (skipBtn) {
        skipBtn.addEventListener("mouseenter", () => {
            skipBtn.style.background = "rgba(255, 255, 255, 0.1)";
            skipBtn.style.color = "white";
        });
        skipBtn.addEventListener("mouseleave", () => {
            skipBtn.style.background = "transparent";
            skipBtn.style.color = "#8892b0";
        });

        skipBtn.addEventListener("click", () => {
            overlay.style.opacity = "0";
            box.style.transform = "scale(0.8)";
            
            setTimeout(() => {
                overlay.remove(); 
                
                try {
                    if (this.characterController) this.characterController.resumePhysics();
                    const canvas = this.scene.getEngine().getRenderingCanvas();
                    if (this.scene.activeCamera && canvas) {
                        this.scene.activeCamera.attachControl(canvas, true);
                    }
                } catch (e) {
                    console.warn("Could not attach controls:", e);
                }
                
                this._shelbyKeyPopupShowing = false;
            }, 500); 
        });
    }
  }

  static addHUDAnimations() {
    const styleId = "shelby-hud-premium-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
        /* Main Box Styling */
        .shelby-hud-box {
            position: absolute;
            background: linear-gradient(135deg, rgba(15, 15, 20, 0.85) 0%, rgba(5, 5, 8, 0.95) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 229, 255, 0.2);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
            transition: all 0.3s ease;
            pointer-events: auto;
        }

        .shelby-hud-box::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 4px; height: 100%;
            background: #00E5FF;
            box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
        }

        .hud-inner {
            padding: 12px 20px 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .hud-header {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #8892b0;
        }

        .hud-icon {
            display: flex;
            color: #00E5FF;
            opacity: 0.8;
        }

        .hud-label {
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }

        .hud-value {
            font-size: 1.4rem;
            font-weight: 700;
            color: #ffffff;
            font-family: 'Consolas', monospace;
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
            letter-spacing: 1px;
            line-height: 1;
        }

        #hud-credits-value { color: #00E5FF; text-shadow: 0 0 15px rgba(0, 229, 255, 0.4); }
        #hud-time-value { color: #00ff88; text-shadow: 0 0 15px rgba(0, 255, 136, 0.4); }

        .hud-pos-time { 
            top: 30px; 
            left: 30px; 
            min-width: 180px; 
        }
        .hud-pos-time .hud-header { 
            justify-content: flex-start; 
        }
        
        .hud-pos-credits { 
            top: 30px; 
            right: 30px; 
            min-width: 200px; 
        }
        
        .hud-pos-coordinates { 
            bottom: 30px; 
            left: 30px; 
            min-width: 240px; 
        }
        .hud-pos-coordinates .hud-value { 
            font-size: 1rem; 
            color: #a0aec0; 
        }
        
        @media (max-width: 768px) {
            .hud-pos-time { 
                top: 15px; 
                left: 15px; 
                transform: none; 
            }
            .hud-pos-credits { 
                top: 15px; 
                right: 15px; 
                min-width: auto; 
            }
            .hud-pos-coordinates { 
                bottom: 15px; 
                left: 15px; 
            }
            .hud-value { 
                font-size: 1.1rem; 
            }
        }

        @keyframes valueFlash {
            0% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.1); filter: brightness(1.5); }
            100% { transform: scale(1); filter: brightness(1); }
        }
        .flash-update { animation: valueFlash 0.3s ease-out; }
    `;
    document.head.appendChild(style);
  }

  static getHUDContainerStyles() {
    return `
        position: absolute;
        top: 0; 
        left: 0; 
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        font-family: 'Space Grotesk', 'Consolas', monospace;
        overflow: hidden;
    `;
  }

  static createHUDElement(id, label, svgIcon) {
    if (!this.hudContainer) return;
    
    const element = document.createElement("div");
    element.id = `hud-${id}`;
    element.className = `shelby-hud-box hud-pos-${id}`;
    
    element.innerHTML = `
        <div class="hud-inner">
            <div class="hud-header">
                <span class="hud-icon">${svgIcon}</span>
                <span class="hud-label">${label}</span>
            </div>
            <div class="hud-value" id="hud-${id}-value">--</div>
        </div>
    `;

    this.hudElements.set(id, element);
  }

  static getHUDElementStyles() {
    const config = CONFIG.HUD;
    return `
            background: rgba(10, 10, 30, 0.85);
            color: ${config.PRIMARY_COLOR};
            padding: 10px 14px;
            margin: 4px;
            border-radius: 4px; 
            border: none;
            border-left: 2px solid ${config.HIGHLIGHT_COLOR};
            border-bottom: 1px solid rgba(255, 255, 255, 0.2); 
            backdrop-filter: blur(8px);
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.25), 0 2px 8px rgba(0, 0, 0, 0.5);
            min-width: 80px;
            text-align: center;
            transition: all 0.3s ease-in-out;
            cursor: default;
        `;
  }

  static startUpdateLoop() {
    this.updateInterval = window.setInterval(() => {
      this.updateHUD();
    }, CONFIG.HUD.UPDATE_INTERVAL);
  }

  static updateHUD() {
    if (!this.scene || !this.characterController) return;
    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime < CONFIG.HUD.UPDATE_INTERVAL) return;
    this.lastUpdateTime = currentTime;
    
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
      
    const getShow = (key) => isMobile ? CONFIG.HUD.MOBILE[key] : CONFIG.HUD[key];

    if (getShow("SHOW_COORDINATES")) this.updateCoordinates();
    if (getShow("SHOW_TIME")) this.updateTime();
    if (getShow("SHOW_FPS")) this.updateFPS();
    if (getShow("SHOW_STATE")) this.updateState();
    if (getShow("SHOW_BOOST_STATUS")) this.updateBoostStatus();
    if (getShow("SHOW_CREDITS")) this.updateCredits();
  }

  static updateCoordinates() {
    const element = this.hudElements.get("coordinates");
    if (!element) return;
    
    const position = this.characterController.getDisplayCapsule().position; 
    const valueElement = element.querySelector("#hud-coordinates-value");
    if (valueElement) {
      valueElement.textContent = `X: ${position.x.toFixed(
        2
      )} Y: ${position.y.toFixed(2)} Z: ${position.z.toFixed(2)}`;
    }
  }

  static showNotification(title, message, duration = 5000) {
    // 1. Ensure the notification container wrapper exists
    let container = document.getElementById("shelby-notification-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "shelby-notification-container";
        Object.assign(container.style, {
            position: "fixed",
            top: "100px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "center",
            zIndex: "20000",
            pointerEvents: "none"
        });
        document.body.appendChild(container);
    }

    // 2. Create the individual Toast Notification
    const notification = document.createElement("div");
    Object.assign(notification.style, {
        width: "max-content",
        maxWidth: "min(450px, 90vw)",
        padding: "12px 24px",
        background: "rgba(10, 10, 30, 0.95)",
        color: "white",
        border: `2px solid ${CONFIG.HUD.HIGHLIGHT_COLOR}`,
        borderRadius: "4px",
        boxShadow: "0 8px 30px rgba(0, 229, 255, 0.2)",
        fontFamily: CONFIG.HUD.FONT_FAMILY,
        pointerEvents: "auto",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: "0",
        transform: "translateY(-15px)"
    });

    notification.innerHTML = `
      <div style="font-weight: bold; font-size: 15px; color: ${CONFIG.HUD.HIGHLIGHT_COLOR};">${title}</div>
      <div style="font-size: 13px; margin-top: 4px; line-height: 1.4;">${message}</div>
    `;

    container.appendChild(notification);

    // 3. Fade in smoothly
    setTimeout(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";
    }, 50);

    // 4. Fade out and remove cleanly
    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateY(-10px)";
        
        setTimeout(() => {
            notification.remove();
            
            // Clean up container if empty to avoid lingering DOM elements
            if (container.children.length === 0) {
                container.remove();
            }
        }, 400); 
    }, duration);
  }

  static updateTime() {
    const element = this.hudElements.get("time");
    if (!element) return;
    if (!this.scene) return;

    const elapsedSec = (Date.now() - this.startTime) / 1000;
    let remainingSeconds = Math.max(0, Math.ceil(180 - elapsedSec));

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    const timeString =
      hours > 0
        ? `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        : `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;

    const valueElement = element.querySelector("#hud-time-value");
    if (valueElement) valueElement.textContent = timeString;

    if (remainingSeconds <= 0) {
      if (!this.timeUpGuiShown) {
        this.timeUpGuiShown = true;
        this.showTimeUpScreen();
        if (this.characterController && this.characterController.pausePhysics) {
          this.characterController.pausePhysics();
        }
      }
      return;
    }
  }

  static showTimeUpScreen() {
    if (this.timeUpGui) return; 
    if (!this.scene) return;

    if (!this._timeUpAlreadyShown) this._timeUpAlreadyShown = false;

    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI_TimeUp");

    const background = new Rectangle();
    background.width = "100%";
    background.height = "100%";
    background.thickness = 0;
    background.background = "black";
    background.color = "black";
    background.alpha = 0; 
    background.zIndex = 0;
    background.isPointerBlocker = true;
    advancedTexture.addControl(background);

    const textBlock = new TextBlock();
    textBlock.text = "⏰ TIME IS FINISHED!";
    textBlock.color = "white";
    textBlock.fontSize = "30vh";
    textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    textBlock.alpha = 0; 
    textBlock.zIndex = 2;
    advancedTexture.addControl(textBlock);

    const reward = CollectiblesManager.getTotalCredits() ?? 0; 
    const creditsText = new TextBlock();
    creditsText.text = `${reward} Credits`;
    creditsText.color = "#00E5FF";
    creditsText.fontSize = "20vh";
    creditsText.top = "30vh"; 
    creditsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    creditsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    creditsText.alpha = 0;
    creditsText.zIndex = 2;
    advancedTexture.addControl(creditsText);

    try {
      const canvas = this.scene.getEngine().getRenderingCanvas();
      const cam = this.scene.activeCamera;
      if (cam && canvas) {
        this._timeUp_prevCamera = cam;
        this._timeUp_prevCanvasPointerEvents = canvas.style.pointerEvents;
        if (typeof cam.detachControl === "function") {
          cam.detachControl(canvas);
        } else if (cam.inputs && typeof cam.inputs.clear === "function") {
          cam.inputs.clear();
        }
        try {
          canvas.style.pointerEvents = "none";
        } catch (e) {}
      }
    } catch (err) {
      console.warn("[HUD] detach camera input error", err);
    }

    try {
      if (
        this.characterController &&
        typeof this.characterController.pausePhysics === "function"
      ) {
        this.characterController.pausePhysics();
      }
    } catch (e) {
      console.warn("[HUD] freeze failed", e);
    }

    const durationMs = 600;
    const steps = 30;
    const stepDelay = Math.max(8, Math.floor(durationMs / steps));
    let currentStep = 0;

    const bgStart = 0;
    const bgEnd = 0.7;
    const textStart = 0;
    const textEnd = 1.0;

    if (this._timeUpFadeInterval) {
      clearInterval(this._timeUpFadeInterval);
      this._timeUpFadeInterval = null;
    }

    this._timeUpFadeInterval = setInterval(() => {
      currentStep++;
      const t = Math.min(1, currentStep / steps);

      const ease = 1 - Math.pow(1 - t, 2);

      background.alpha = bgStart + (bgEnd - bgStart) * ease;
      textBlock.alpha = textStart + (textEnd - textStart) * ease;
      creditsText.alpha = textStart + (textEnd - textStart) * ease;

      if (t >= 1) {
        clearInterval(this._timeUpFadeInterval);
        this._timeUpFadeInterval = null;

        background.alpha = bgEnd;
        textBlock.alpha = textEnd;
        creditsText.alpha = textEnd;
      }
    }, stepDelay);
  }

  static showQuestionPopup(
    question,
    answers,
    correctIndex,
    rewardCredits = 50,
    onResult = null
  ) {
    if (this._questionPopupShowing) return;
    this._questionPopupShowing = true;

    try {
      const canvas = this.scene.getEngine().getRenderingCanvas();
      const cam = this.scene.activeCamera;
      if (cam && canvas && typeof cam.attachControl === "function") {
        cam.attachControl(canvas, true);
      }
    } catch (e) { console.warn(e); }

    if (this.characterController && typeof this.characterController.pausePhysics === "function") {
      try { this.characterController.pausePhysics(); } catch (e) { console.warn(e); }
    }

    const styleId = "shelby-question-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            @keyframes qModalFadeIn {
                from { opacity: 0; backdrop-filter: blur(0px); }
                to { opacity: 1; backdrop-filter: blur(12px); }
            }
            @keyframes qModalSlideUp {
                from { opacity: 0; transform: translateY(30px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .shelby-q-overlay {
                position: fixed; inset: 0; z-index: 20000;
                display: flex; align-items: center; justify-content: center;
                background: rgba(5, 5, 8, 0.85);
                font-family: 'Space Grotesk', sans-serif;
                animation: qModalFadeIn 0.4s ease-out forwards;
                pointer-events: auto;
            }
            .shelby-q-modal {
                width: min(700px, 90%);
                padding: 40px;
                background: rgba(15, 15, 20, 0.8);
                border: 1px solid rgba(0, 229, 255, 0.2);
                border-radius: 12px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
                text-align: center;
                animation: qModalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                opacity: 0;
            }
            .shelby-q-header {
                font-size: 0.9rem; font-weight: 700; color: #00E5FF;
                text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;
                display: flex; justify-content: space-between; align-items: center;
            }
            .shelby-q-reward {
                background: rgba(0, 229, 255, 0.1); padding: 4px 10px; border-radius: 4px;
            }
            .shelby-q-text {
                font-size: 1.5rem; font-weight: 500; color: #ffffff;
                line-height: 1.4; margin-bottom: 30px;
            }
            .shelby-q-options {
                display: flex; flex-direction: column; gap: 12px;
            }
            .shelby-q-btn {
                width: 100%; padding: 18px 24px; text-align: left;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px; color: #e2e8f0; font-size: 1.1rem;
                font-family: 'Space Grotesk', sans-serif;
                cursor: pointer; transition: all 0.2s ease;
                display: flex; align-items: center;
            }
            .shelby-q-btn:hover {
                background: rgba(0, 229, 255, 0.08);
                border-color: rgba(0, 229, 255, 0.5);
                color: #00E5FF;
                transform: translateX(5px);
            }
            .shelby-q-btn span.letter {
                display: inline-block; width: 30px; height: 30px;
                line-height: 28px; text-align: center;
                background: rgba(255, 255, 255, 0.1); border-radius: 4px;
                margin-right: 15px; font-weight: 700; font-size: 0.9rem;
            }
            .shelby-q-btn:hover span.letter { background: #00E5FF; color: #000; }
            
            .shelby-q-btn.correct {
                background: rgba(0, 255, 136, 0.2) !important;
                border-color: #00ff88 !important; color: #00ff88 !important;
            }
            .shelby-q-btn.correct span.letter { background: #00ff88 !important; color: #000 !important; }
            
            .shelby-q-btn.wrong {
                background: rgba(255, 68, 68, 0.2) !important;
                border-color: #ff4444 !important; color: #ff4444 !important;
            }
            .shelby-q-btn.wrong span.letter { background: #ff4444 !important; color: #fff !important; }
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement("div");
    overlay.className = "shelby-q-overlay";

    const modal = document.createElement("div");
    modal.className = "shelby-q-modal";

    const header = document.createElement("div");
    header.className = "shelby-q-header";
    header.innerHTML = `
        <span>DECRYPT NODE DATA</span>
        <span class="shelby-q-reward">REWARD: ${rewardCredits} CR</span>
    `;

    const qText = document.createElement("div");
    qText.className = "shelby-q-text";
    qText.textContent = question;

    const optionsContainer = document.createElement("div");
    optionsContainer.className = "shelby-q-options";

    let answered = false;
    const finish = (isCorrect) => {
        if (answered) return;
        answered = true;

        setTimeout(() => {
            overlay.style.transition = "opacity 0.3s ease";
            overlay.style.opacity = "0";
            modal.style.transition = "transform 0.3s ease";
            modal.style.transform = "scale(0.95)";

            setTimeout(() => {
                try { overlay.remove(); } catch (e) {}
                this._questionPopupShowing = false;

                try {
                  const canvas = this.scene.getEngine().getRenderingCanvas();
                  const cam = this.scene.activeCamera;
                  if (cam && canvas && typeof cam.attachControl === "function") {
                    cam.attachControl(canvas, true);
                  }
                } catch (e) { console.warn(e); }

                if (this.characterController && typeof this.characterController.resumePhysics === "function") {
                  try { this.characterController.resumePhysics(); } catch (e) { console.warn(e); }
                }

                if (typeof onResult === "function") onResult(isCorrect);
            }, 300); 
        }, 800); 
    };

    const letters = ['A', 'B', 'C', 'D', 'E'];
    answers.forEach((ans, idx) => {
        const btn = document.createElement("button");
        btn.className = "shelby-q-btn";
        btn.innerHTML = `<span class="letter">${letters[idx] || '-'}</span> ${ans}`;
        
        btn.addEventListener("click", () => {
            if (answered) return; 
            
            const isCorrect = (idx === correctIndex);
            
            if (isCorrect) {
                btn.classList.add("correct");
            } else {
                btn.classList.add("wrong");
                const allBtns = optionsContainer.querySelectorAll(".shelby-q-btn");
                if (allBtns[correctIndex]) {
                    allBtns[correctIndex].classList.add("correct");
                }
            }
            
            finish(isCorrect);
        });

        optionsContainer.appendChild(btn);
    });

    modal.appendChild(header);
    modal.appendChild(qText);
    modal.appendChild(optionsContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  static updateFPS() {
    const element = this.hudElements.get("fps");
    if (!element) return;
    const valueElement = element.querySelector("#hud-fps-value");
    if (valueElement) {
      valueElement.textContent = `${this.currentFPS} FPS`;
      if (this.currentFPS >= 55) {
        valueElement.style.color = CONFIG.HUD.HIGHLIGHT_COLOR;
      } else if (this.currentFPS >= 30) {
        valueElement.style.color = CONFIG.HUD.PRIMARY_COLOR;
      } else {
        valueElement.style.color = "#ff4444";
      }
    }
  }
  
  static updateState() {
    const element = this.hudElements.get("state");
    if (!element) return;
    const valueElement = element.querySelector("#hud-state-value");
    if (valueElement) {
      const isMoving = this.characterController.isMoving();
      const isOnGround = this.characterController.isOnGround();
      let stateText = "";
      
      if (isMoving && isOnGround) {
        stateText = "Walking";
        valueElement.style.color = CONFIG.HUD.PRIMARY_COLOR;
      } else if (isMoving && !isOnGround) {
        stateText = "Flying";
        valueElement.style.color = CONFIG.HUD.HIGHLIGHT_COLOR;
      } else if (!isOnGround) {
        stateText = "In Air";
        valueElement.style.color = CONFIG.HUD.SECONDARY_COLOR;
      } else {
        stateText = "Idle";
        valueElement.style.color = CONFIG.HUD.SECONDARY_COLOR;
      }
      valueElement.textContent = stateText;
    }
  }

  static updateBoostStatus() {
    const element = this.hudElements.get("boost");
    if (!element) return;
    const valueElement = element.querySelector("#hud-boost-value");
    if (valueElement) {
      const isBoosting = this.characterController.isBoosting();
      
      if (isBoosting) {
        valueElement.textContent = "ACTIVE";
        valueElement.style.color = CONFIG.HUD.HIGHLIGHT_COLOR;
        element.style.animation = "pulse 0.5s ease-in-out infinite alternate";
      } else {
        valueElement.textContent = "Inactive";
        valueElement.style.color = CONFIG.HUD.SECONDARY_COLOR;
        element.style.animation = "none";
      }
    }
  }
  
  static updateCredits() {
    const element = this.hudElements.get("credits");
    if (!element) return;
    
    const totalCredits = CollectiblesManager.getTotalCredits(); 
    const valueElement = element.querySelector("#hud-credits-value");
    
    if (valueElement) {
      const currentValue = parseInt(valueElement.textContent) || 0;
      
      if (currentValue !== totalCredits) {
          valueElement.textContent = `${totalCredits}`;
          
          valueElement.classList.remove('flash-update');
          void valueElement.offsetWidth; 
          valueElement.classList.add('flash-update');
      }
    }
  }

  static setElementVisibility(elementId, visible) {
    const element = this.hudElements.get(elementId);
    if (element) {
      element.style.display = visible ? "block" : "none";
    }
  }

  static updateConfig(newConfig) {
    if (this.hudContainer && newConfig.POSITION) {
      this.hudContainer.style.cssText = this.getHUDContainerStyles();
    }
    
    this.hudElements.forEach((element, id) => {
      const currentDisplay = element.style.display;
      element.style.cssText = this.getHUDElementStyles();
      if (currentDisplay) {
        element.style.display = currentDisplay;
      }
    });

    if (newConfig.SHOW_COORDINATES !== undefined) {
      this.setElementVisibility("coordinates", newConfig.SHOW_COORDINATES);
    }
    if (newConfig.SHOW_TIME !== undefined) {
      this.setElementVisibility("time", newConfig.SHOW_TIME);
    }
    if (newConfig.SHOW_FPS !== undefined) {
      this.setElementVisibility("fps", newConfig.SHOW_FPS);
    }
    if (newConfig.SHOW_STATE !== undefined) {
      this.setElementVisibility("state", newConfig.SHOW_STATE);
    }
    if (newConfig.SHOW_BOOST_STATUS !== undefined) {
      this.setElementVisibility("boost", newConfig.SHOW_BOOST_STATUS);
    }
    if (newConfig.SHOW_CREDITS !== undefined) {
      this.setElementVisibility("credits", newConfig.SHOW_CREDITS);
    }
  }

  static setPosition(position) {
    this.updateConfig({ POSITION: position });
  }

  static setColors(primaryColor, secondaryColor, highlightColor) {
    this.hudElements.forEach((element, id) => {
      const label = element.querySelector(".hud-label");
      const value = element.querySelector(".hud-value");
      if (label) label.style.color = secondaryColor;
      if (value) value.style.color = primaryColor; 
    });
  }

  static setVisibility(visible) {
    if (this.hudContainer) {
      this.hudContainer.style.display = visible ? "flex" : "none";
    }
  }

  static dispose() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.hudContainer) {
      this.hudContainer.remove();
      this.hudContainer = null;
    }
    if (this.timeUpGui) {
        this.timeUpGui.dispose();
        this.timeUpGui = null;
    }
     if (this.questionGui) {
        this.questionGui.dispose();
        this.questionGui = null;
    }
    if (this._timeUpFadeInterval) {
        clearInterval(this._timeUpFadeInterval);
        this._timeUpFadeInterval = null;
    }
    
    this.hudElements.clear();
    this.scene = null;
    this.characterController = null;
  }
}