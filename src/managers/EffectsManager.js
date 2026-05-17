// --- Imports ---
import * as BABYLON from "@babylonjs/core/Legacy/legacy";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Sound } from "@babylonjs/core/Audio/sound";
import { ParticleHelper } from "@babylonjs/core/Particles/particleHelper";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color4 } from "@babylonjs/core/Maths/math.color";

// Local imports
import { CONFIG } from "../constants/GameConfig";

// ============================================================================
// EFFECTS MANAGER
// ============================================================================
export class EffectsManager {
  static activeParticleSystems = new Map();
  static environmentParticleSystems = new Map();
  static itemParticleSystems = new Map();
  static activeSounds = new Map();
  static scene = null;

  /**
   * Initializes the EffectsManager with a scene
   * @param scene The Babylon.js scene
   */
  static initialize(scene) {
    this.scene = scene;
  }

  /**
   * Creates a particle system from a snippet by name
   * @param snippetName Name of the particle snippet to create
   * @param emitter Optional emitter (mesh or position) for the particle system
   * @returns The created particle system or null if not found
   */
  static async createParticleSystem(snippetName, emitter) {
    if (!this.scene) {
      console.warn("EffectsManager not initialized. Call initialize() first.");
      return null;
    }

    const snippet = CONFIG.EFFECTS.PARTICLE_SNIPPETS.find(
      (s) => s.name === snippetName
    );

    if (!snippet) {
      console.warn(`Particle snippet "${snippetName}" not found.`);
      return null;
    }

    try {
      // Use imported ParticleHelper
      const particleSystem = await ParticleHelper.ParseFromSnippetAsync(
        snippet.snippetId,
        this.scene,
        false
      );

      if (particleSystem && emitter) {
        // Handle position emitter (Vector3)
        if (emitter instanceof Vector3) {
            particleSystem.emitter = emitter;
        } 
        // Handle mesh emitter (AbstractMesh)
        else if (emitter instanceof BABYLON.AbstractMesh) {
            particleSystem.emitter = emitter;
        } else {
            particleSystem.emitter = emitter; // Assuming emitter is a valid object/position
        }
      }

      if (particleSystem) {
        // Determine usage category
        let usageCategory = this.determineUsageCategory(
          snippetName,
          snippet.category
        );
        if (
          snippetName === "Magic Sparkles" &&
          emitter &&
          emitter instanceof BABYLON.AbstractMesh
        ) {
          usageCategory = "PLAYER";
        }
        
        const descriptiveName = `${snippetName}_${usageCategory}`;
        particleSystem.name = descriptiveName;
        this.activeParticleSystems.set(descriptiveName, particleSystem);
        this.categorizeParticleSystem(
          descriptiveName,
          particleSystem,
          snippet.category
        );
      }
      return particleSystem;
    } catch (error) {
      console.error(
        `Failed to create particle system "${snippetName}":`,
        error
      );
      return null;
    }
  }

  /**
   * Determines the usage category of a particle system based on its name and category
   */
  static determineUsageCategory(snippetName, category) {
    if (
      snippetName.includes("environment") ||
      snippetName.includes("ambient") ||
      snippetName.includes("atmosphere") ||
      snippetName.includes("background") ||
      category === "nature"
    ) {
      return "ENVIRONMENT";
    } else if (
      snippetName.includes("item") ||
      snippetName.includes("collectible") ||
      snippetName.includes("collection") ||
      snippetName.includes("pickup") ||
      (category === "magic" && snippetName !== "Magic Sparkles")
    ) {
      return "ITEMS";
    } else if (snippetName === "Magic Sparkles") {
      return "ENVIRONMENT"; 
    } else {
      return "PLAYER";
    }
  }

  /**
   * Categorizes a particle system based on its name and category
   */
  static categorizeParticleSystem(name, particleSystem, category) {
    if (name.includes("ENVIRONMENT")) {
      this.environmentParticleSystems.set(name, particleSystem);
    } else if (name.includes("ITEMS")) {
      this.itemParticleSystems.set(name, particleSystem);
    } else {
      // Player particles are only in activeParticleSystems
    }
  }

  /**
   * Creates a particle system at a specific position
   */
  static async createParticleSystemAt(snippetName, position) {
    return this.createParticleSystem(snippetName, position);
  }

  /**
   * Stops and removes a particle system by name
   */
  static removeParticleSystem(systemName) {
    const particleSystem = this.activeParticleSystems.get(systemName);
    if (particleSystem) {
      particleSystem.stop();
      particleSystem.dispose();
      this.activeParticleSystems.delete(systemName);
    }
  }

  /**
   * Stops and removes all active particle systems
   */
  static removeAllParticleSystems() {
    this.activeParticleSystems.forEach((particleSystem, name) => {
      particleSystem.stop();
      particleSystem.dispose();
    });
    this.activeParticleSystems.clear();
  }

  /**
   * Removes only environment-related particle systems
   */
  static removeEnvironmentParticles() {
    this.environmentParticleSystems.forEach((particleSystem, name) => {
      particleSystem.stop();
      particleSystem.dispose();
      this.activeParticleSystems.delete(name);
    });
    this.environmentParticleSystems.clear();
  }

  /**
   * Removes only item/collectible-related particle systems
   */
  static removeItemParticles() {
    this.itemParticleSystems.forEach((particleSystem, name) => {
      particleSystem.stop();
      particleSystem.dispose();
      this.activeParticleSystems.delete(name);
    });
    this.itemParticleSystems.clear();
  }

  /**
   * Adds a particle system to the active systems with a given name
   */
  static addParticleSystem(name, particleSystem) {
    this.activeParticleSystems.set(name, particleSystem);
  }

  /**
   * Adds a particle system to the environment category
   */
  static addEnvironmentParticleSystem(name, particleSystem) {
    this.activeParticleSystems.set(name, particleSystem);
    this.environmentParticleSystems.set(name, particleSystem);
  }

  /**
   * Adds a particle system to the item category
   */
  static addItemParticleSystem(name, particleSystem) {
    this.activeParticleSystems.set(name, particleSystem);
    this.itemParticleSystems.set(name, particleSystem);
  }

  /**
   * Gets all available particle snippet names
   */
  static getAvailableSnippets() {
    return CONFIG.EFFECTS.PARTICLE_SNIPPETS.map((snippet) => snippet.name);
  }

  /**
   * Gets particle snippets by category
   */
  static getSnippetsByCategory(category) {
    return CONFIG.EFFECTS.PARTICLE_SNIPPETS.filter(
      (snippet) => snippet.category === category
    ).map((snippet) => snippet.name);
  }

  /**
   * Gets particle snippet details by name
   */
  static getSnippetDetails(snippetName) {
    return (
      CONFIG.EFFECTS.PARTICLE_SNIPPETS.find(
        (snippet) => snippet.name === snippetName
      ) || null
    );
  }

  /**
   * Gets all active particle systems
   */
  static getActiveParticleSystems() {
    return new Map(this.activeParticleSystems);
  }

  /**
   * Pauses all active particle systems
   */
  static pauseAllParticleSystems() {
    this.activeParticleSystems.forEach((particleSystem) => {
      particleSystem.stop();
    });
  }

  /**
   * Resumes all active particle systems
   */
  static resumeAllParticleSystems() {
    this.activeParticleSystems.forEach((particleSystem) => {
      particleSystem.start();
    });
  }

  /**
   * Creates the default particle system if auto-spawn is enabled
   */
  static async createDefaultParticleSystem() {
    if (CONFIG.EFFECTS.AUTO_SPAWN && this.scene) {
      // Use imported Vector3
      const defaultPosition = new Vector3(-2, 0, -8); 
      await this.createParticleSystem(
        CONFIG.EFFECTS.DEFAULT_PARTICLE,
        defaultPosition
      );
    }
  }

  /**
   * Creates a sound effect by name
   * @param soundName Name of the sound effect to create
   * @returns The created sound or null if not found
   */
  static async createSound(soundName) {
    if (!this.scene) {
      console.warn("EffectsManager not initialized. Call initialize() first.");
      return null;
    }

    const soundConfig = CONFIG.EFFECTS.SOUND_EFFECTS.find(
      (s) => s.name === soundName
    );
    
    if (!soundConfig) {
      console.warn(`Sound effect "${soundName}" not found.`);
      return null;
    }

    try {
      // Use imported Sound
      const sound = new Sound(
        soundName,
        soundConfig.url,
        this.scene,
        null,
        {
          volume: soundConfig.volume,
          loop: soundConfig.loop,
        }
      );
      
      sound.onended = () => {};
      this.activeSounds.set(soundName, sound);
      return sound;
    } catch (error) {
      console.error(`Failed to create sound "${soundName}":`, error);
      return null;
    }
  }

  /**
   * Plays a sound effect by name
   */
  static playSound(soundName) {
    const sound = this.activeSounds.get(soundName);
    if (sound && !sound.isPlaying) {
      sound.play();
    }
  }

  /**
   * Stops a sound effect by name
   */
  static stopSound(soundName) {
    const sound = this.activeSounds.get(soundName);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }

  /**
   * Gets a sound effect by name
   */
  static getSound(soundName) {
    return this.activeSounds.get(soundName) || null;
  }

  /**
   * Stops and removes all active sounds
   */
  static removeAllSounds() {
    this.activeSounds.forEach((sound, name) => {
      sound.stop();
      sound.dispose();
    });
    this.activeSounds.clear();
  }

   /**
   * Sets the master volume of the Babylon.js Audio Engine.
   * @param volume The desired volume (0.0 to 1.0)
   */

static setMasterVolume(volume) {
    const engine = this.scene?.getEngine();
    const audioEngine = engine?.audioEngine;
    
  if (!this.scene || !this.scene.getEngine().audioEngine) {
    console.warn("Audio engine not initialized.");
    return;
  }

  // CRITICAL FIX: Use the correct method name
  audioEngine.setGlobalVolume(volume);
  
  if (volume === 0.0) {
      console.log("Audio Muted.");
  } else {
      console.log("Audio Unmuted. Volume:", volume);
  }
}
}