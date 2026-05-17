// --- Imports ---
import { CONFIG } from "../constants/GameConfig";
import { ASSETS } from "../constants/Assets";
import { SceneManager } from "../managers/SceneManager";
import { MobileInputManager } from "../controllers/MobileInputManager";
import { EffectsManager } from "../managers/EffectsManager"; 

// ============================================================================
// SETTINGS UI
// ============================================================================
export class SettingsUI {
  static settingsButton = null;
  static settingsPanel = null;
  static isPanelOpen = false;
  static sceneManager = null;
  static isInitializing = false;

  static isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  static isIPad() {
    return (
      /iPad/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
      (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
    );
  }

  static isIPadWithKeyboard() {
    if (!this.isIPad()) return false;
    return window.innerHeight < window.innerWidth;
  }

  static shouldShowSection(visibility) {
    switch (visibility) {
      case "all": return true;
      case "mobile": return this.isMobileDevice();
      case "iPadWithKeyboard": return this.isIPadWithKeyboard();
      default: return false;
    }
  }

  static initialize(canvas, sceneManager) {
    this.isInitializing = true;
    this.sceneManager = sceneManager || null;
    
    this.dispose(); 
    this.injectGlobalStyles(); 
    this.createSettingsButton(canvas);
    this.createSettingsPanel(canvas);
    this.setupEventListeners();
    this.attachButtonListener(); 
    
    setTimeout(() => {
        this.setupToggleStateHandlers(); 
    }, 50); 

    this.isInitializing = false;
  }
  
  static injectGlobalStyles() {
    const styleId = "shelby-settings-styles"; // <--- FIXED HERE
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
        .settings-header {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 30px 24px;
            border-bottom: 1px solid rgba(0, 229, 255, 0.15); /* <--- Color changed */
            background: rgba(5, 5, 8, 0.6);
            box-sizing: border-box;
        }
        .settings-header h2 {
            font-size: 1.2rem;
            font-weight: 700;
            color: #00E5FF; /* <--- Color changed */
            letter-spacing: 3px;
            margin: 0;
        }
        .settings-content {
            padding: 30px 24px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .settings-section {
            padding: 20px;
            background: rgba(15, 15, 20, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            transition: all 0.3s ease;
        }
        .settings-section:hover {
             border-color: rgba(0, 229, 255, 0.3); /* <--- Color changed */
             background: rgba(0, 229, 255, 0.02); /* <--- Color changed */
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .section-header h3 {
            margin: 0;
            font-size: 0.9rem;
            font-weight: 500;
            color: #e2e8f0;
            letter-spacing: 1px;
        }
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 46px;
            height: 24px;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(255, 255, 255, 0.1);
            transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border-radius: 24px;
        }
        .toggle-slider span { 
            position: absolute;
            content: "";
            height: 18px; width: 18px;
            left: 3px; bottom: 3px;
            background-color: #8892b0;
            transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border-radius: 50%;
        }
        .settings-section select {
            padding: 10px 14px;
            background: rgba(5, 5, 8, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #00E5FF; /* <--- Color changed */
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            min-width: 140px;
            box-sizing: border-box;
            height: 40px;
            font-family: 'Space Grotesk', sans-serif;
            transition: all 0.2s ease;
            outline: none;
        }
        .settings-section select:focus {
            border-color: #00E5FF; /* <--- Color changed */
            box-shadow: 0 0 15px rgba(0, 229, 255, 0.15); /* <--- Color changed */
        }
        .settings-section select option {
            background: #050508;
            color: #fff;
        }
    `;
    document.head.appendChild(style);
  }

  static createSettingsButton(canvas) {
    this.settingsButton = document.createElement("div");
    this.settingsButton.id = "settings-button";
    
    this.settingsButton.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
    `;
    
    Object.assign(this.settingsButton.style, {
        position: "fixed", bottom: "30px", right: "30px", width: "50px", height: "50px",
        background: "rgba(15, 15, 20, 0.8)", border: "1px solid rgba(0, 229, 255, 0.2)", /* <--- Color changed */
        borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "#00E5FF", zIndex: "2000", /* <--- Color changed */
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", backdropFilter: "blur(10px)",
        boxShadow: "0 10px 20px rgba(0,0,0,0.4)", pointerEvents: 'auto'
    });

    this.settingsButton.addEventListener("mouseenter", () => {
      this.settingsButton.style.background = "rgba(0, 229, 255, 0.1)"; /* <--- Color changed */
      this.settingsButton.style.borderColor = "rgba(0, 229, 255, 0.6)"; /* <--- Color changed */
      this.settingsButton.style.transform = "scale(1.1) rotate(45deg)";
      this.settingsButton.style.boxShadow = "0 10px 25px rgba(0, 229, 255, 0.2)"; /* <--- Color changed */
    });

    this.settingsButton.addEventListener("mouseleave", () => {
      if (!this.isPanelOpen) {
          this.settingsButton.style.background = "rgba(15, 15, 20, 0.8)";
          this.settingsButton.style.borderColor = "rgba(0, 229, 255, 0.2)"; /* <--- Color changed */
          this.settingsButton.style.transform = "scale(1) rotate(0deg)";
          this.settingsButton.style.boxShadow = "0 10px 20px rgba(0,0,0,0.4)";
      }
    });

    document.body.appendChild(this.settingsButton);
  }

  static createSettingsPanel(canvas) {
    if (this.settingsPanel) this.settingsPanel.remove();
    
    this.settingsPanel = document.createElement("div");
    this.settingsPanel.id = "settings-panel";
    
    const panelWidth = this.getPanelWidth();
    const sectionsHTML = this.generateSectionsHTML();

    this.settingsPanel.innerHTML = `
        <div class="settings-header">
            <h2>SYSTEM SETTINGS</h2>
        </div>
        <div class="settings-content">
            ${sectionsHTML}
        </div>
    `;
        
    Object.assign(this.settingsPanel.style, {
        position: "fixed", top: "0", right: `-${panelWidth}px`, width: `${panelWidth}px`,
        height: "100vh", background: "rgba(5, 5, 8, 0.95)", backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(0, 229, 255, 0.15)", /* <--- Color changed */
        boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.6)", 
        zIndex: "1999", transition: "right 0.5s cubic-bezier(0.16, 1, 0.3, 1)", 
        color: "white", fontFamily: "'Space Grotesk', sans-serif",
        overflowY: "auto", boxSizing: "border-box"
    });

    document.body.appendChild(this.settingsPanel);
    
    this.setupEventListeners();

    window.addEventListener("orientationchange", () => setTimeout(() => this.regenerateSections(), 100));
    window.addEventListener("resize", () => {
      this.regenerateSections();
      this.updatePanelWidth();
    });
  }
  
  static getPanelWidth() {
      const viewWidth = window.innerWidth;
      const minWidth = 320; 
      const ratio = 1/4; 
      return viewWidth < 600 ? viewWidth : Math.max(viewWidth * ratio, minWidth);
  }

  static regenerateSections() {
    if (!this.settingsPanel) return;
    const content = this.settingsPanel.querySelector(".settings-content");
    if (content) content.innerHTML = this.generateSectionsHTML();
    this.setupSectionEventListeners();
    setTimeout(() => this.setupToggleStateHandlers(), 50);
  }

  static generateSectionsHTML() {
    let sectionsHTML = "";
    const allSections = [
        {
            title: "Audio",
            uiElement: "toggle",
            visibility: "all", 
            defaultValue: true, 
            onChange: (value) => EffectsManager.setMasterVolume(value ? 1.0 : 0.0),
        },
        ...CONFIG.SETTINGS.SECTIONS
    ];
    
    allSections.forEach((section, index) => {
      if (!this.shouldShowSection(section.visibility)) return;
      const sectionId = `section-${index}`;
      
      if (section.uiElement === "toggle") {
        let defaultValue = section.defaultValue ?? false;
        if (section.title === "Screen Controls" && MobileInputManager.isInitialized) {
             defaultValue = MobileInputManager.isVisible(); 
        }

        sectionsHTML += `
          <div class="settings-section" id="${sectionId}">
              <div class="section-header">
                  <h3>${section.title}</h3>
                  <label class="toggle-switch">
                      <input type="checkbox" ${defaultValue ? "checked" : ""} data-section-index="${index}">
                      <span class="toggle-slider"><span></span></span>
                  </label>
              </div>
          </div>
        `;
      } else if (section.uiElement === "dropdown") {
        const defaultValue = section.defaultValue ?? section.options?.[0] ?? "";
        const sourceArray = section.title === "Character" 
          ? ASSETS.CHARACTERS : section.title === "Environment" 
          ? ASSETS.ENVIRONMENTS : (section.options || []).map(o => ({ name: o }));
          
        const optionsHTML = sourceArray.map((item) =>
              `<option value="${item.name}" ${item.name === defaultValue ? "selected" : ""}>${item.name}</option>`
        ).join("");

        sectionsHTML += `
          <div class="settings-section" id="${sectionId}">
              <div class="section-header">
                  <h3>${section.title}</h3>
                  <select data-section-index="${index}">${optionsHTML}</select>
              </div>
          </div>
        `;
      }
    });
    return sectionsHTML;
  }

  static setupSectionEventListeners() {
    const toggles = this.settingsPanel.querySelectorAll('input[type="checkbox"]');
    toggles.forEach((toggle) => {
      toggle.addEventListener("change", async (e) => {
        const target = e.target;
        const sectionIndex = parseInt(target.dataset.sectionIndex);
        
        const allSections = [
            { title: "Audio", uiElement: "toggle", visibility: "all", defaultValue: false, onChange: (value) => EffectsManager.setMasterVolume(value ? 1.0 : 0.0) },
            ...CONFIG.SETTINGS.SECTIONS
        ];
        const section = allSections[sectionIndex];
        
        if (section && section.onChange) {
            if (section.title === "Screen Controls") MobileInputManager.setVisibility(target.checked);
            else await section.onChange(target.checked);
        }
      });
    });

    const selects = this.settingsPanel.querySelectorAll("select");
    selects.forEach((select) => {
      select.addEventListener("change", async (e) => {
        const sectionIndex = parseInt(e.target.dataset.sectionIndex);
        const section = CONFIG.SETTINGS.SECTIONS[sectionIndex];
        if (section && section.onChange && !this.isInitializing) await section.onChange(e.target.value);
      });
    });
  }

  static setupToggleStateHandlers() {
    const toggleInputs = this.settingsPanel.querySelectorAll(".toggle-switch input");
    if (!toggleInputs) return;

    toggleInputs.forEach((input) => {
      const slider = input.nextElementSibling;
      if (!slider) return; 
      const toggleCircle = slider.querySelector("span");
      if (!toggleCircle) return;
      
      const updateStyle = (checked) => {
          if (checked) {
              slider.style.backgroundColor = "rgba(0, 229, 255, 0.2)"; /* <--- Color changed */
              slider.style.boxShadow = "inset 0 0 5px rgba(0, 229, 255, 0.2)"; /* <--- Color changed */
              toggleCircle.style.transform = "translateX(22px)";
              toggleCircle.style.backgroundColor = "#00E5FF"; /* <--- Color changed */
              toggleCircle.style.boxShadow = "0 0 10px rgba(0, 229, 255, 0.8)"; /* <--- Color changed */
          } else {
              slider.style.backgroundColor = "rgba(255, 255, 255, 0.05)"; 
              slider.style.boxShadow = "none";
              toggleCircle.style.transform = "translateX(0)";
              toggleCircle.style.backgroundColor = "#8892b0";
              toggleCircle.style.boxShadow = "none";
          }
      };
      
      updateStyle(input.checked); 
      input.addEventListener("change", (e) => updateStyle(e.target.checked));
      slider.addEventListener("click", (e) => e.stopPropagation());
    });
  }

  static setupEventListeners() {
    document.addEventListener("click", (e) => {
      if (this.isPanelOpen && this.settingsPanel && this.settingsButton &&
        !this.settingsPanel.contains(e.target) && !this.settingsButton.contains(e.target)) {
        this.closePanel();
      }
    });
  }

  static attachButtonListener() {
    if (this.settingsButton) {
        this.settingsButton.addEventListener("click", () => this.togglePanel());
    }
  }

  static togglePanel() {
    if (!this.settingsPanel) return;
    if (this.isPanelOpen) this.closePanel();
    else this.openPanel();
  }

  static openPanel() {
    this.updatePanelWidth();
    this.settingsPanel.style.right = "0px";
    this.isPanelOpen = true;
    
    this.settingsButton.style.transform = "scale(1.1) rotate(45deg)";
    this.settingsButton.style.background = "rgba(0, 229, 255, 0.1)"; /* <--- Color changed */
    this.settingsButton.style.borderColor = "rgba(0, 229, 255, 0.6)"; /* <--- Color changed */
  }

  static closePanel() {
    const panelWidth = this.settingsPanel.offsetWidth;
    this.settingsPanel.style.right = `-${panelWidth}px`;
    this.isPanelOpen = false;
    
    this.settingsButton.style.transform = "scale(1) rotate(0deg)";
    this.settingsButton.style.background = "rgba(15, 15, 20, 0.8)";
    this.settingsButton.style.borderColor = "rgba(0, 229, 255, 0.2)"; /* <--- Color changed */
  }

  static updatePanelWidth() {
    if (!this.settingsPanel) return;
    const panelWidth = this.getPanelWidth();
    this.settingsPanel.style.width = `${panelWidth}px`;
    if (!this.isPanelOpen) this.settingsPanel.style.right = `-${panelWidth}px`;
  }

  static dispose() {
    if (this.settingsButton) this.settingsButton.remove();
    if (this.settingsPanel) this.settingsPanel.remove();
    this.isPanelOpen = false;
  }

  static async changeCharacter(characterIndexOrName) {
    if (this.sceneManager && !this.isInitializing) {
      this.sceneManager.changeCharacter(characterIndexOrName);
    }
  }

  static async changeEnvironment(environmentName) {
    if (this.sceneManager) {
      const currentEnvironment = this.sceneManager.getCurrentEnvironment();
      if (currentEnvironment === environmentName) return; 
      
      this.sceneManager.pausePhysics();
      this.sceneManager.clearEnvironment();
      this.sceneManager.clearItems();
      this.sceneManager.clearParticles();

      await this.sceneManager.loadEnvironment(environmentName);
      await this.sceneManager.setupEnvironmentItems();
      this.sceneManager.repositionCharacter();
      this.sceneManager.forceActivateSmoothFollow();
      this.sceneManager.resumePhysics();
    }
  }
}
