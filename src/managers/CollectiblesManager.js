// --- Imports ---
import * as BABYLON from "@babylonjs/core/Legacy/legacy";
import "@babylonjs/loaders";

import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"; 
// ...
import { Sound } from "@babylonjs/core/Audio/sound";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

import { PhysicsAggregate, PhysicsShapeBox } from "@babylonjs/core/Physics/v2/index";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Animation } from "@babylonjs/core/Animations/animation";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"; 


// Local imports
import { CRATE_QUESTIONS } from "../constants/CrateQuestions";
import { ASSETS } from "../constants/Assets"; // Needed for resetToStartPosition (temporary fallback)
import { EffectsManager } from "./EffectsManager";
import { InventoryManager } from "./InventoryManager";
import { HUDManager } from "./HUDManager";
import { NodeMaterialManager } from "./NodeMaterialManager";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin"; 


// ============================================================================
// COLLECTIBLES MANAGER
// ============================================================================
export class CollectiblesManager {
  static scene = null;
  static characterController = null;
  static collectibles = new Map();
  static collectibleBodies = new Map();
  static collectionSound = null;
  static totalCredits = 0;
  static collectionObserver = null;
  static collectedItems = new Set();
  static instanceBasis = null;
  static physicsShape = null; 
  static itemConfigs = new Map(); 
  static physicsReadyObservable = new Observable(); 
  static physicsReadyObserver = null;
  
  // --- Shelby Key Challenge State ---
  static SHELBY_KEY_THRESHOLD_SCORE = 100; // Trigger score (7 Crates @ 100 Credits)
  static shelbyKeySpawned = false; // Tracks if the key has been moved
  static shelbyKeyInstance = null; // Reference to the actual key mesh
  static shelbyKeyTargetPosition = null; // Target spawn position
  static shelbyKeyAggregate = null;
  static originalModelBasis = null; 


  // -------------------------------


  /**
   * Waits for physics to be properly initialized
   */
  static async waitForPhysicsInitialization() {
    if (!this.scene) {
      throw new Error("Scene not available for physics initialization check");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Initializes the CollectiblesManager
   */
  static initialize(scene, characterController) {
    this.scene = scene;
    this.characterController = characterController;
    this.totalCredits = 0;
    this.collectedCount = 0;
    this.shelbyKeySpawned = false;
    return Promise.resolve();
  }

  static async setupEnvironmentItems(environment) {
    if (!this.scene || !environment.items) {
      console.warn(
        "CollectiblesManager not properly initialized or no items in environment"
      );
      return;
    }
    this.collectibles.clear();
    this.collectibleBodies.clear();
    this.collectedItems.clear();
    this.itemConfigs.clear();
    this.shelbyKeyInstance = null;
    this.shelbyKeyTargetPosition = null;

    await this.setupCollectiblesForEnvironment(environment);
  }

  /**
   * Sets up collectibles for a specific environment
   */
  static async setupCollectiblesForEnvironment(environment) {
    if (!this.scene || !environment.items) {
      console.warn(
        "Scene or items not available in setupCollectiblesForEnvironment"
      );
      return;
    }

    await this.waitForPhysicsInitialization();

        const primaryItemConfig = environment.items.find(item => item.collectible); 

    if (primaryItemConfig) {
        await this.loadItemModel(primaryItemConfig);
        // Store the final instanceBasis as the definitive clone source
        this.originalCrateModelBasis = this.instanceBasis; 
    } else {
        console.error("No collectible items found to establish model basis.");
        return; // Cannot proceed without a basis model
    }

    // Create collection sound 
    if (this.collectionSound) {
        this.collectionSound.dispose();
    }
    this.collectionSound = new Sound( 
      "collectionSound",
      "src/assets/sound/assets_sounds_effects_collect.m4a", // Relying on the final working path
      this.scene,
      null, // readyToPlayCallback
      { 
        volume: 0.7,
        loop: false
       }
    );
    
    // Load model basis once (assuming all share the same model basis)
    for (const itemConfig of environment.items) {
        if (itemConfig.collectible) {
            await this.loadItemModel(itemConfig); 
            break; 
        }
    }

    // Iterate through all items in environment and create instances
    for (const itemConfig of environment.items) {
      if (itemConfig.collectible) {
        for (let i = 0; i < itemConfig.instances.length; i++) {
          const instance = itemConfig.instances[i];
          const instanceId = `${itemConfig.name.toLowerCase()}_instance_${
            i + 1
          }`;
          await this.createCollectibleInstance(
            instanceId,
            instance,
            itemConfig
          );
        }
      }
    }
    
    this.setupCollisionDetection();
  }

  /**
   * Loads an item model to use as instance basis
   */
  static async loadItemModel(itemConfig) {
    if (!this.scene) {
      console.warn("Scene not available in loadItemModel");
      return;
    }
    
    if (this.instanceBasis) {
        this.instanceBasis.dispose();
        this.instanceBasis = null;
    }

    try {
      const result = await SceneLoader.ImportMeshAsync(null, "", itemConfig.url, this.scene);
      
      await NodeMaterialManager.processImportResult(result);

      
      if (result.meshes && result.meshes.length > 0) {
        const rootMesh = result.meshes.find((mesh) => !mesh.parent);
        if (rootMesh) {
          rootMesh.name = `${itemConfig.name.toLowerCase()}_basis`;
          rootMesh.setEnabled(false);
        }
      }

      const meshWithGeometry = result.meshes.find((mesh) => {
        if (mesh instanceof AbstractMesh) {
          return mesh.geometry && mesh.geometry.getTotalVertices() > 0;
        }
        return false;
      });


      if (meshWithGeometry) {
        this.instanceBasis = meshWithGeometry;
        this.instanceBasis.isVisible = false;
        this.instanceBasis.setEnabled(false);
        
        const boundingInfo = this.instanceBasis.getBoundingInfo();
        if (boundingInfo) {
          const size = boundingInfo.boundingBox.maximumWorld.subtract(
            boundingInfo.boundingBox.minimumWorld
          );
          this.physicsShape = new PhysicsShapeBox(
            Vector3.Zero(), 
            Quaternion.Identity(), 
            size.scale(0.5), 
            this.scene
          );
        } else {
          this.physicsShape = new PhysicsShapeBox(
            Vector3.Zero(), 
            Quaternion.Identity(), 
            Vector3.One(), 
            this.scene
          );
        }
      } else {
        console.warn(
          `No meshes with geometry found for ${itemConfig.name}, creating fallback`
        );
        // Use a special fallback for the key if it's not a standard asset
        this.createFallbackInstanceBasis(itemConfig.name === "Shelby_Key");
      }
    } catch (error) {
        console.error("Failed to load item model:", itemConfig.url, error);
        this.createFallbackInstanceBasis(itemConfig.name === "Shelby_Key");
    }
  }

  /**
   * Creates a fallback instance basis using a simple box/sphere
   */
  static createFallbackInstanceBasis(isKeyFallback = false) {
    if (!this.scene) return;
    
    const size = isKeyFallback ? 1.5 : 2;
    this.instanceBasis = MeshBuilder.CreateSphere( // Use a Sphere for Key
      "fallback_item_basis",
      { diameter: size },
      this.scene
    ); 
    const material = new StandardMaterial(
      "fallback_item_basis_material",
      this.scene
    );
    // Use a cyan/bright material for a debug key
    material.diffuseColor = isKeyFallback ? new Color3(0, 0.9, 1) : new Color3(0.5, 0.8, 1); 
    material.emissiveColor = isKeyFallback ? new Color3(0, 0.45, 0.5) : new Color3(0.1, 0.2, 0.3); 
    this.instanceBasis.material = material;
    
    this.instanceBasis.isVisible = false;
    this.instanceBasis.setEnabled(false);

    this.physicsShape = new PhysicsShapeBox(
      Vector3.Zero(), 
      Quaternion.Identity(), 
      Vector3.One(), 
      this.scene
    );
  }

  /**
   * Creates a collectible instance from the instance basis
   */
  static async createCollectibleInstance(id, instance, itemConfig) {
    if (!this.scene || !this.instanceBasis) {
      console.error(
        "No scene or instance basis available for creating collectible instance"
      );
      return;
    }

    
    try {
      const meshInstance = this.instanceBasis.createInstance(id);
      
      if (meshInstance.parent) {
        meshInstance.setParent(null);
      }
      
      meshInstance.position = instance.position.clone(); 
      meshInstance.scaling.setAll(instance.scale);
      
      if (instance.rotation) {
         meshInstance.rotation = new Vector3(
            instance.rotation.x * Math.PI / 180, 
            instance.rotation.y * Math.PI / 180, 
            instance.rotation.z * Math.PI / 180
         );
      }

      meshInstance.isVisible = true;
      meshInstance.setEnabled(true);
      
      const physicsAggregate = new PhysicsAggregate(
        meshInstance,
        BABYLON.PhysicsShapeType.BOX, 
        { mass: instance.mass }
      );

      // --- CRITICAL SHELBY KEY TRACKING ---
if (itemConfig.name === "Shelby_Key") {
    this.shelbyKeyInstance = meshInstance; 
    this.shelbyKeyAggregate = physicsAggregate; 

    // FINAL FIX: Ensure the key is invisible and static until spawned
    meshInstance.isVisible = false;
    physicsAggregate.body.setMotionType(PhysicsMotionType.STATIC); // Set to static
    
    // Store target position
    if (instance.targetPosition) {
       this.shelbyKeyTargetPosition = instance.targetPosition.clone();
    } else {
       this.shelbyKeyTargetPosition = instance.position.clone();
    }
} else {
    // Other meshes are visible and dynamic
    meshInstance.isVisible = true;
}
      // ---------------------------------
      
      this.collectibles.set(id, meshInstance);
      if (physicsAggregate.body) {
        this.collectibleBodies.set(id, physicsAggregate.body);
      }

      this.itemConfigs.set(id, itemConfig);

      this.addRotationAnimation(meshInstance);
    } catch (error) {
      console.error(`Failed to create collectible instance ${id}:`, error);
    }
  }

  /**
   * Adds a rotation animation to make collectibles more visible
   */
  static addRotationAnimation(mesh) {
    if (!this.scene) return;
    
    const animation = new Animation(
      "rotationAnimation",
      "rotation.y",
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );
    
    const keyFrames = [
      { frame: 0, value: 0 },
      { frame: 30, value: 2 * Math.PI },
    ];
    
    animation.setKeys(keyFrames);
    mesh.animations = [animation];
    this.scene.beginAnimation(mesh, 0, 30, true);
  }

  /**
   * Sets up collision detection for collectibles
   */
  static setupCollisionDetection() {
    if (!this.scene || !this.characterController) return;
    
    this.collectionObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.checkCollisions();
    });
  }

  /**
   * Checks for collisions between character and collectibles
   */
  static checkCollisions() {
    if (!this.characterController) return;
    
    const characterPosition =
      this.characterController.getDisplayCapsule().position;
    const collectionRadius = 1.5; 
    
    for (const [id, mesh] of this.collectibles.entries()) {
      if (this.collectedItems.has(id)) continue;
      
      const distance = Vector3.Distance(
        characterPosition,
        mesh.position
      );
      
      if (distance <= collectionRadius) {
        this.attemptCollection(id, mesh);
      }
    }
  }

  /**
   * Attempts to collect an item based on velocity
   */
  static attemptCollection(collectibleId, collectibleMesh) {
    if (!this.characterController) return;
    
    const itemConfig = this.itemConfigs.get(collectibleId);
    if (!itemConfig) {
      console.warn(`No item config found for collectible ${collectibleId}`);
      return;
    }
    
    const characterVelocity = this.characterController.getVelocity();
    const speed = characterVelocity.length();
    
    // Check impulse requirement for collection
    if (speed >= (itemConfig.minImpulseForCollection || 0.3)) { 
      this.collectItem(collectibleId, collectibleMesh, itemConfig);
    }
  }

  /**
   * Collects an item and adds credits
   */
  static collectItem(collectibleId, collectibleMesh, itemConfig) {
    if (!collectibleId || !collectibleMesh || !itemConfig) return;

    if (this.collectedItems.has(collectibleId)) return;
    this.collectedItems.add(collectibleId);

    const name = (itemConfig.name || "").toLowerCase();
        // --- CRITICAL FIX: Intercept Shelby_Key Collection ---
    if (itemConfig.name === "Shelby_Key") {
        // 1. Award credits
        CollectiblesManager.addCredits(itemConfig.creditValue || 0);
        // 2. Play sound
        if (this.collectionSound) this.collectionSound.play();
        // 3. Show final popup
        HUDManager.showShelbyKeySuccessPopup(itemConfig.creditValue || 0);
        // 4. Remove key
        this.removeCollectible(collectibleId);
        return; // End collection logic immediately
    }
    // ----------------------------------------------------



    const finalizeCollection = (wasCorrect) => {
      // 1. Point Collection Logic
      if (wasCorrect && itemConfig.creditValue) {
        CollectiblesManager.addCredits(itemConfig.creditValue); 
      }
      
      // 2. Check for Shelby Key Spawn Condition (AFTER score is added)
      if (
          !this.shelbyKeySpawned && 
          this.totalCredits >= this.SHELBY_KEY_THRESHOLD_SCORE
      ) {
          this.spawnShelbyKey();
      }

      // 3. Inventory/Sound
      if (
        itemConfig.inventory &&
        itemConfig.itemEffectKind &&
        itemConfig.thumbnail
      ) {
        InventoryManager.addInventoryItem(
          itemConfig.name,
          itemConfig.itemEffectKind,
          itemConfig.thumbnail
        );
      }

      if (wasCorrect && this.collectionSound) this.collectionSound.play();
      if (wasCorrect) this.showCollectionEffects(collectibleMesh.position);

      this.removeCollectible(collectibleId);
    };

    
    if (name === "crate" || name.includes("crate")) {
      const qIndex = Math.floor(Math.random() * CRATE_QUESTIONS.length);
      const qItem = CRATE_QUESTIONS[qIndex];

      const question = qItem?.question || itemConfig.question || "Answer the question to get the reward!";
      const answers = qItem?.answers || itemConfig.answers || ["A", "B", "C"];
      const correctIndex =
        typeof qItem?.correctIndex === "number"
          ? qItem.correctIndex
          : typeof itemConfig.correctIndex === "number"
          ? itemConfig.correctIndex
          : 0;
      const reward = itemConfig.creditValue ?? 50;

      HUDManager.showQuestionPopup(
        question,
        answers,
        correctIndex,
        reward,
        (wasCorrect) => {
          finalizeCollection(wasCorrect);
        }
      );

      return;
    }

    // ---------- Normal collectible flow (non-crate) ----------
    finalizeCollection(true); // Treat all non-quiz items as instantly collected
  }


static async spawnShelbyKey() {
    // 1. Initial Checks (ensure we have a target and haven't spawned yet)
    if (!this.scene || this.shelbyKeySpawned || !this.shelbyKeyTargetPosition) {
        console.error("Shelby Key Spawn Failed: Missing target position or already spawned.");
        return;
    }

    // Get the tracked item configuration
    const keyConfigEntry = Array.from(this.itemConfigs.values()).find(
        config => config.name === "Shelby_Key"
    );
    if (!keyConfigEntry) return;

    this.shelbyKeySpawned = true;

    // Retrieve necessary data
    const keyModelURL = keyConfigEntry.url;
    const keyMass = keyConfigEntry.instances?.[0]?.mass || 0.1;

    try {
        // 1. Load the key model immediately
        const result = await SceneLoader.ImportMeshAsync(
            null, 
            "", 
            keyModelURL, 
            this.scene
        );
        
        // 2. Mesh Check
        if (result.meshes.length === 0) {
            throw new Error("Asset load succeeded, but file contains no meshes to render.");
        }

        const rootMesh = result.meshes[0]; 
        
        const visualMesh = result.meshes.find(m => m.geometry) || rootMesh;

        if (rootMesh !== visualMesh) {
            rootMesh.getChildMeshes(false).forEach(child => {
                child.setParent(null);
            });
            rootMesh.dispose();
        }


        // 4. Teleport the visual mesh *VISUALLY* FIRST
        visualMesh.position.copyFrom(this.shelbyKeyTargetPosition); 
        
        // 5. Setup Physics on the new mesh (using the VISUAL mesh for physics binding)
        const newAggregate = new PhysicsAggregate(
            visualMesh, 
            BABYLON.PhysicsShapeType.BOX, 
            { mass: keyMass } 
        );

        // 6. Force Visibility/Enabled state on ALL meshes (Guaranteed Render Fix)
        result.meshes.forEach(mesh => { 
            mesh.isVisible = true; 
            mesh.setEnabled(true);
            
            if (mesh.material) {
                mesh.material.alpha = 1.0; 
                if (mesh.material.needDepthPrePass !== undefined) { 
                    mesh.material.needDepthPrePass = true;
                }
            }
        });
        
        // 7. Final Physics Sync (Resetting forces at the new location)
        if (newAggregate.body) {
            newAggregate.body.setLinearVelocity(Vector3.Zero());
            newAggregate.body.setAngularVelocity(Vector3.Zero());
            // Sync the rigid body's position with the mesh's new position
            newAggregate.body.transformNode.position.copyFrom(this.shelbyKeyTargetPosition); 
        }
        
        const newCollectibleId = `shelby_key_live_${Date.now()}`;
        this.collectibles.set(newCollectibleId, visualMesh); // Add mesh to collection tracker
        
        if (newAggregate.body) {
             this.collectibleBodies.set(newCollectibleId, newAggregate.body); // Add body to collection tracker
        }
        
        this.itemConfigs.set(newCollectibleId, keyConfigEntry); 
        // -------------------------------------------------------------------------
        
        
        // 8. Success Logging
        console.log(`[CHALLENGE] Shelby_Key spawned at: ${this.shelbyKeyTargetPosition.x.toFixed(2)}, ${this.shelbyKeyTargetPosition.y.toFixed(2)}, ${this.shelbyKeyTargetPosition.z.toFixed(2)}`);
        
        // Final Notification
        HUDManager.showNotification(
             "Shelby_Key Unlocked!", 
             `A special objective key has appeared at ${this.shelbyKeyTargetPosition.x.toFixed(0)}, ${this.shelbyKeyTargetPosition.z.toFixed(0)}!`
        );


    } catch (error) {
        // --- CATCH BLOCK: REPORT THE FAILURE ---
        console.error("CRITICAL Shelby_Key SPAWN FAILURE:", error);
        
        // Fallback Notification:
        HUDManager.showNotification(
             "Shelby_Key ERROR!", 
             "The key's location has been revealed, but an asset error occurred. Key is likely invisible."
        );
        // --- END CATCH BLOCK ---
    }
}
    
  /**
   * Shows collection effects at the specified position
   */
  static async showCollectionEffects(position) {
    if (!this.scene) return;
    
    const particleSystem = new ParticleSystem(
      "Magic Sparkles_ITEMS",
      50,
      this.scene
    );
    
    particleSystem.particleTexture = new Texture(
      "https://www.babylonjs-playground.com/textures/flare.png",
      this.scene
    );
    particleSystem.emitter = position.clone(); 
    
    particleSystem.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
    particleSystem.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
    particleSystem.color1 = new Color4(0.5, 0.8, 1, 1); 
    particleSystem.color2 = new Color4(0.2, 0.6, 0.9, 1); 
    particleSystem.colorDead = new Color4(0, 0.3, 0.6, 0); 
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.3;
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 0.8;
    particleSystem.emitRate = 100;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;
    particleSystem.gravity = new Vector3(0, -9.81, 0);
    particleSystem.direction1 = new Vector3(-2, -2, -2);
    particleSystem.direction2 = new Vector3(2, 2, 2);
    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;
    particleSystem.updateSpeed = 0.016;
    particleSystem.start();
    
    EffectsManager.addItemParticleSystem(
      "Magic Sparkles_ITEMS",
      particleSystem
    );

    setTimeout(() => {
      particleSystem.stop();
      particleSystem.dispose();
    }, 1000);
  }

  /**
   * Removes a collectible from the scene
   */
  static removeCollectible(collectibleId) {
    const mesh = this.collectibles.get(collectibleId);
    if (mesh) {
      mesh.dispose();
      this.collectibles.delete(collectibleId);
      this.collectibleBodies.delete(collectibleId);
      this.itemConfigs.delete(collectibleId);
    }
  }

  static getTotalCredits() {
    return this.totalCredits;
  }

  static addCredits(amount) {
    this.totalCredits += amount;
  }

  static getCollectibles() {
    return new Map(this.collectibles);
  }

  static clearCollectibles() {
    for (const [id, mesh] of this.collectibles.entries()) {
      this.removeCollectible(id);
    }
    
    this.collectibles.clear();
    this.collectibleBodies.clear();
    this.itemConfigs.clear();
    this.collectedItems.clear();

    if (this.collectionSound) {
      this.collectionSound.dispose();
      this.collectionSound = null;
    }

    if (this.instanceBasis) {
      this.instanceBasis.dispose();
      this.instanceBasis = null;
    }
  }

  /**
   * Disposes the CollectiblesManager
   */
  static dispose() {
    for (const [id, mesh] of this.collectibles.entries()) {
      this.removeCollectible(id);
    }
    
    if (this.collectionObserver && this.scene) {
      this.scene.onBeforeRenderObservable.remove(this.collectionObserver);
      this.collectionObserver = null;
    }
    
    this.physicsReadyObservable.clear();

    if (this.collectionSound) {
      this.collectionSound.dispose();
      this.collectionSound = null;
    }

    if (this.instanceBasis) {
      this.instanceBasis.dispose();
      this.instanceBasis = null;
    }

    this.scene = null;
    this.characterController = null;
    this.totalCredits = 0;
    this.collectedItems.clear();
  }
}
