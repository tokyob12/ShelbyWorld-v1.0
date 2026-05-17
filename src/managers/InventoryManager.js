// --- Imports ---

// Local imports
import { CONFIG } from "../constants/GameConfig";
import { InventoryUI } from "../ui/InventoryUI";

// ============================================================================
// INVENTORY MANAGER
// ============================================================================
export class InventoryManager {
  static scene = null;
  static characterController = null;
  static inventoryItems = new Map();
  static originalJumpHeight = 0;
  static originalVisibility = 1;
  static activeEffects = new Set();

  // Item effects implementation (static methods acting on the CharacterController)
  static itemEffects = {
    superJump: (characterController) => {
      if (InventoryManager.activeEffects.has("superJump")) {
        return; 
      }
      
      const currentCharacter = characterController.getCurrentCharacter();
      InventoryManager.originalJumpHeight = currentCharacter?.jumpHeight || 2.0;
      
      const newJumpHeight = InventoryManager.originalJumpHeight * 3;
      
      if (currentCharacter) {
        currentCharacter.jumpHeight = newJumpHeight;
        
        // Ensure character physics is updated (using the method exposed on CharacterController)
        characterController.updateCharacterPhysics(
          currentCharacter,
          characterController.getPosition() // Pass current position to re-init physics with new stats
        );
      }
      
      InventoryManager.activeEffects.add("superJump");
      
      // Revert after 20 seconds
      setTimeout(() => {
        const charToRevert = characterController.getCurrentCharacter();
        if (charToRevert) {
          charToRevert.jumpHeight = InventoryManager.originalJumpHeight;
          
          characterController.updateCharacterPhysics(
            charToRevert,
            characterController.getPosition()
          );
        }
        InventoryManager.activeEffects.delete("superJump");
      }, 20000);
    },
    
    invisibility: (characterController) => {
      if (InventoryManager.activeEffects.has("invisibility")) {
        return; 
      }
      
      // Assume getPlayerMesh returns the root mesh
      const playerMesh = characterController.getPlayerMesh(); 
      InventoryManager.originalVisibility = playerMesh?.visibility || 1;
      
      if (playerMesh) {
        // Iterate over all child meshes to change material alpha
        playerMesh.getChildMeshes(false).forEach((m) => {
          if (m.material) {
            m.material.alpha = 0.25;
          }
        });
      }
      
      InventoryManager.activeEffects.add("invisibility");
      
      // Revert after 20 seconds
      setTimeout(() => {
        const playerMesh = characterController.getPlayerMesh();
        if (playerMesh) {
          playerMesh.getChildMeshes(false).forEach((m) => {
            if (m.material) {
              m.material.alpha = 1;
            }
          });
        }
        InventoryManager.activeEffects.delete("invisibility");
      }, 20000);
    },
  };

  /**
   * Initializes the InventoryManager
   * @param scene The Babylon.js scene
   * @param characterController The character controller
   */
  static initialize(scene, characterController) {
    this.scene = scene;
    this.characterController = characterController;
    this.inventoryItems.clear();
    this.activeEffects.clear();
  }

  /**
   * Adds an inventory item when collected
   */
  static addInventoryItem(itemName, itemEffectKind, thumbnail) {
    const existingItem = this.inventoryItems.get(itemName);
    
    if (existingItem) {
      existingItem.count++;
    } else {
      this.inventoryItems.set(itemName, {
        count: 1,
        itemEffectKind,
        thumbnail,
      });
    }
    
    // Update inventory UI if it's open (use imported class)
    if (InventoryUI.isPanelOpen) {
      InventoryUI.updateInventoryContent();
    }
    InventoryUI.updateInventoryButton();
  }

  /**
   * Uses an inventory item
   */
  static useInventoryItem(itemName) {
    const item = this.inventoryItems.get(itemName);
    
    if (!item || item.count <= 0) {
      return false;
    }
    
    item.count--;
    
    if (item.count <= 0) {
      this.inventoryItems.delete(itemName);
    }
    
    // Apply the item effect
    const effectFunction = this.itemEffects[item.itemEffectKind];
    if (effectFunction && this.characterController) {
      effectFunction(this.characterController);
    }
    
    // Update inventory UI 
    if (InventoryUI.isPanelOpen) {
      InventoryUI.updateInventoryContent();
    }
    InventoryUI.updateInventoryButton();
    
    return true;
  }

  /**
   * Gets all inventory items
   */
  static getInventoryItems() {
    return new Map(this.inventoryItems);
  }

  /**
   * Gets the count of a specific item
   */
  static getItemCount(itemName) {
    const item = this.inventoryItems.get(itemName);
    return item ? item.count : 0;
  }

  /**
   * Clears all inventory items
   */
  static clearInventory() {
    this.inventoryItems.clear();
    this.activeEffects.clear();
    
    // Update inventory UI
    if (InventoryUI.isPanelOpen) {
      InventoryUI.updateInventoryContent();
    }
    InventoryUI.updateInventoryButton();
  }

  /**
   * Disposes the InventoryManager
   */
  static dispose() {
    this.scene = null;
    this.characterController = null;
    this.inventoryItems.clear();
    this.activeEffects.clear();
  }
}