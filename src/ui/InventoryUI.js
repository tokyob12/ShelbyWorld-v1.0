// --- Imports ---
// No direct Babylon.js imports needed as this class only handles DOM/CSS

// Local imports
import { CONFIG } from "../constants/GameConfig";
import { InventoryManager } from "../managers/InventoryManager";

// ============================================================================
// INVENTORY UI
// ============================================================================
export class InventoryUI {
  static inventoryButton = null;
  static inventoryPanel = null;
  static isPanelOpen = false;
  static sceneManager = null;

  /**
   * Initializes the InventoryUI
   * @param canvas The canvas element
   * @param sceneManager The scene manager
   */
  static initialize(canvas, sceneManager) {
    this.sceneManager = sceneManager || null;
    this.createInventoryButton(canvas);
    this.createInventoryPanel(canvas);
    this.setupEventListeners();
    this.updateInventoryButton(); // Initialize button state
  }

  /**
   * Creates the inventory button
   * @param canvas The canvas element
   */
  static createInventoryButton(canvas) {
    // Check if a button already exists and remove it to prevent duplicates
    if (this.inventoryButton) {
      this.inventoryButton.remove();
    }
    
    // Create the main button container
    this.inventoryButton = document.createElement("div");
    this.inventoryButton.id = "inventory-button-container";
    
    // Create the inner div that will hold the icon and styling
    const innerDiv = document.createElement("div");
    innerDiv.innerHTML = `🎒`; // Backpack icon
    
    // Apply initial styles to the inner button element
    Object.assign(innerDiv.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "50px",
      height: "50px",
      background: "rgba(0, 0, 0, 0.7)",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      zIndex: "9999",
      transition: "all 0.3s ease",
      fontSize: "20px",
      color: "white",
      backdropFilter: "blur(10px)",
    });

    // Add hover effects for the inner element
    innerDiv.addEventListener("mouseenter", () => {
      innerDiv.style.background = "rgba(0, 0, 0, 0.9)";
      innerDiv.style.borderColor = "rgba(255, 255, 255, 0.6)";
      innerDiv.style.transform = "scale(1.1)";
    });
    innerDiv.addEventListener("mouseleave", () => {
      if (!this.isPanelOpen) {
        innerDiv.style.background = "rgba(0, 0, 0, 0.7)";
        innerDiv.style.borderColor = "rgba(255, 255, 255, 0.3)";
      }
      innerDiv.style.transform = "scale(1)";
    });

    this.inventoryButton.appendChild(innerDiv);
    document.body.appendChild(this.inventoryButton);
  }

  /**
   * Creates the inventory panel
   * @param canvas The canvas element
   */
  static createInventoryPanel(canvas) {
    if (this.inventoryPanel) {
      this.inventoryPanel.remove();
    }
    
    this.inventoryPanel = document.createElement("div");
    this.inventoryPanel.id = "inventory-panel";
    
    // Initial panel styling
    Object.assign(this.inventoryPanel.style, {
        position: "fixed",
        top: "0",
        right: "-100%", // Start off-screen
        width: `${this.getPanelWidth()}px`,
        height: "100vh",
        background: "rgba(0, 0, 0, 0.95)",
        backdropFilter: "blur(20px)",
        borderLeft: "2px solid rgba(255, 255, 255, 0.2)",
        zIndex: "1000",
        transition: "right 0.3s ease",
        color: "white",
        fontFamily: "Arial, sans-serif",
        overflowY: "auto",
    });

    this.updateInventoryContent();
    document.body.appendChild(this.inventoryPanel);
  }

  /**
   * Gets the panel width based on screen size
   */
  static getPanelWidth() {
    const screenWidth = window.innerWidth;
    if (screenWidth <= CONFIG.INVENTORY.FULL_SCREEN_THRESHOLD) {
      return screenWidth;
    }
    // CONFIG.INVENTORY.PANEL_WIDTH_RATIO is 0 in your config, making it 0px wide. 
    // We use a small fallback to make it visible, or honor the original code's ratio if changed.
    const ratioWidth = screenWidth * (CONFIG.INVENTORY.PANEL_WIDTH_RATIO || (1/5)); 
    return Math.max(ratioWidth, 300); // Minimum 300px width
  }

  /**
   * Updates the inventory content
   */
  static updateInventoryContent() {
    if (!this.inventoryPanel) return;
    
    // Use imported InventoryManager
    const inventoryItems = InventoryManager.getInventoryItems();
    
    const itemsHTML = Array.from(inventoryItems.entries())
      .map(([itemName, itemData]) => {
        const tileSize = Math.max(
          itemData.count > 0 ? 120 : 80,
          Math.min(200, window.innerWidth * 0.15)
        );
        
        return `
            <div class="inventory-item" data-item-name="${itemName}" style="
                width: ${tileSize}px;
                height: ${tileSize}px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                margin: 10px;
                display: inline-block;
                position: relative;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
                padding: 10px;
                box-sizing: border-box;
            ">
                <img src="${itemData.thumbnail}" alt="${itemName}" style="
                    width: 60%;
                    height: 60%;
                    object-fit: contain;
                    margin-bottom: 5px;
                ">
                <div style="
                    font-size: 12px;
                    color: white;
                    margin-bottom: 5px;
                ">${itemName}</div>
                <div style="
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: rgba(255, 68, 68, 0.9);
                    color: white;
                    border-radius: 50%;
                    width: 25px;
                    height: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                ">${itemData.count}</div>
            </div>
        `;
      })
      .join("");
      
    this.inventoryPanel.innerHTML = `
        <div class="inventory-header" style="
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.05);
            box-sizing: border-box;
            max-width: 100%;
        ">
            <h2 style="
                margin: 0;
                font-size: 24px;
                font-weight: bold;
                color: white;
            ">${CONFIG.INVENTORY.HEADING_TEXT}</h2>
        </div>
        <div class="inventory-content" style="
            padding: 20px;
            box-sizing: border-box;
            max-width: 100%;
            overflow-x: hidden;
        ">
            <div style="
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
            ">
                ${itemsHTML}
            </div>
        </div>
    `;
    
    const itemElements =
      this.inventoryPanel.querySelectorAll(".inventory-item");
      
    itemElements.forEach((element) => {
      // Add a simple hover class/style
      element.addEventListener("mouseenter", () => element.style.transform='scale(1.05)');
      element.addEventListener("mouseleave", () => element.style.transform='scale(1)');
      
      element.addEventListener("click", (e) => {
        const itemName = e.currentTarget.getAttribute("data-item-name");
        if (itemName) {
          this.useItem(itemName);
        }
      });
    });
  }

  /**
   * Uses an inventory item
   */
  static useItem(itemName) {
    // Use imported InventoryManager
    const success = InventoryManager.useInventoryItem(itemName);
    
    if (success) {
      this.updateInventoryContent();
      this.updateInventoryButton();
      this.showItemUsedFeedback(itemName);
    }
  }

  /**
   * Shows feedback when an item is used
   */
  static showItemUsedFeedback(itemName) {
    const feedback = document.createElement("div");
    Object.assign(feedback.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(0, 255, 136, 0.9)",
        color: "black",
        padding: "20px",
        borderRadius: "10px",
        zIndex: "9999",
        fontSize: "18px",
        fontWeight: "bold",
    });
    
    feedback.textContent = `Used ${itemName}!`;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }

  /**
   * Sets up event listeners
   */
  static setupEventListeners() {
    if (this.inventoryButton) {
      this.inventoryButton.addEventListener("click", () => {
        this.togglePanel();
      });
    }
    
    document.addEventListener("click", (e) => {
      if (
        this.isPanelOpen &&
        this.inventoryPanel &&
        this.inventoryButton &&
        !this.inventoryPanel.contains(e.target) &&
        !this.inventoryButton.contains(e.target)
      ) {
        this.closePanel();
      }
    });

    window.addEventListener("resize", () => {
      this.updatePanelWidth();
      if (this.isPanelOpen) {
          this.updateInventoryContent(); // Re-calculate item tile sizes on resize
      }
    });
  }

  /**
   * Toggles the inventory panel
   */
  static togglePanel() {
    if (this.isPanelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  /**
   * Opens the inventory panel
   */
  static openPanel() {
    if (this.inventoryPanel) {
      this.updatePanelWidth(); // Ensure correct width before opening
      this.inventoryPanel.style.right = "0";
      this.isPanelOpen = true;
      this.updateInventoryContent();
      this.updateInventoryButton();
      
      const innerDiv = this.inventoryButton.querySelector("div");
      if(innerDiv) {
         innerDiv.style.background = "rgba(0, 0, 0, 0.9)";
         innerDiv.style.zIndex = "9999";
      }
    }
  }

  /**
   * Closes the inventory panel
   */
  static closePanel() {
    if (this.inventoryPanel) {
      const panelWidth = this.inventoryPanel.offsetWidth;
      this.inventoryPanel.style.right = `-${panelWidth}px`;
      this.isPanelOpen = false;
      
      const innerDiv = this.inventoryButton.querySelector("div");
      if(innerDiv) {
         innerDiv.style.background = "rgba(0, 0, 0, 0.7)";
      }
    }
  }

  /**
   * Updates the panel width
   */
  static updatePanelWidth() {
    if (this.inventoryPanel) {
      const viewWidth = window.innerWidth;
      const panelWidth = this.getPanelWidth();
      
      // Update the panel width style
      this.inventoryPanel.style.width = `${panelWidth}px`;
      
      if (viewWidth < CONFIG.INVENTORY.FULL_SCREEN_THRESHOLD) {
        this.inventoryPanel.style.boxSizing = "border-box";
        this.inventoryPanel.style.padding = "0";
        this.inventoryPanel.style.margin = "0";
      } else {
        this.inventoryPanel.style.boxSizing = "";
        this.inventoryPanel.style.padding = "";
        this.inventoryPanel.style.margin = "";
      }
      
      // If closed, ensure it stays off-screen based on the new width
      if (!this.isPanelOpen) {
        this.inventoryPanel.style.right = `-${panelWidth}px`;
      }
    }
  }

  /**
   * Updates the inventory button to show item count and style
   */
  static updateInventoryButton() {
    if (this.inventoryButton) {
      // Use imported InventoryManager
      const inventoryItems = InventoryManager.getInventoryItems();
      const totalItems = Array.from(inventoryItems.values()).reduce(
        (sum, item) => sum + item.count,
        0
      );
      
      // The button container itself is already styled and positioned
      const innerDiv = this.inventoryButton.querySelector("div");
      
      if (innerDiv) {
        innerDiv.style.display = "flex"; // Ensure visibility if it was hidden
        
        if (totalItems > 0) {
          innerDiv.style.opacity = "1";
          innerDiv.style.borderColor = "rgba(0, 255, 136, 0.8)"; // Highlight border
          innerDiv.style.color = "rgba(0, 255, 136, 1)"; // Highlight color
        } else {
          innerDiv.style.opacity = "0.7";
          innerDiv.style.borderColor = "rgba(255, 255, 255, 0.3)";
          innerDiv.style.color = "white";
        }
      }
    }
  }

  /**
   * Disposes the InventoryUI
   */
  static dispose() {
    if (this.inventoryButton) {
      this.inventoryButton.remove();
      this.inventoryButton = null;
    }
    if (this.inventoryPanel) {
      this.inventoryPanel.remove();
      this.inventoryPanel = null;
    }
    this.isPanelOpen = false;
    this.sceneManager = null;
    
    // NOTE: Event listeners are implicitly removed since the elements are removed from DOM, 
    // but for global listeners, manual cleanup would be needed.
    window.removeEventListener("resize", this.updatePanelWidth);
  }
}