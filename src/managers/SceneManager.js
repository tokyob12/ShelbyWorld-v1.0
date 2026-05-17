// --- Imports ---
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin"; 
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin"; 
import { HingeConstraint } from "@babylonjs/core/Physics/v2/physicsConstraint";
import { StandardMaterial, PBRMaterial } from "@babylonjs/core/Materials/index";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"; 
import { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui/2D";

// --- Teleport Portal Imports ---
import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";

// Local imports
import { CONFIG, OBJECT_ROLE } from "../constants/GameConfig";
import { ASSETS } from "../constants/Assets";
import { CharacterController } from "../controllers/CharacterController";
import { SmoothFollowCameraController } from "../controllers/SmoothFollowCameraController";
import { EffectsManager } from "./EffectsManager";
import { NodeMaterialManager } from "./NodeMaterialManager";
import { SkyManager } from "./SkyManager";
import { HUDManager } from "./HUDManager";
import { CollectiblesManager } from "./CollectiblesManager";
import { InventoryManager } from "./InventoryManager";


// ============================================================================
// SCENE MANAGER
// ============================================================================
export class SceneManager {
  scene;
  camera;
  characterController = null;
  smoothFollowController = null;
  currentEnvironment = "Shelby Quest City"; 

  constructor(engine, canvas) {
    this.scene = new Scene(engine);
    this.camera = new TargetCamera(
      "camera1",
      CONFIG.CAMERA.START_POSITION.clone(), 
      this.scene
    );
  }

  async initializeScene() {
    this.setupLighting();
    this.setupPhysics(); 
    
    await this.setupEffects();
    
    await this.loadEnvironment("Shelby Quest City"); 
    
    this.setupCharacter();
    
    this.loadCharacterModel();

    await this.setupEnvironmentItems();
    
    if (this.characterController) {
      InventoryManager.initialize(this.scene, this.characterController);
    }
  }

  setupLighting() {
    const light = new HemisphericLight(
      "light",
      new Vector3(0, 1, 0),
      this.scene
    );
    light.intensity = 1;
    
    const light2 = new HemisphericLight(
      "light2",
      new Vector3(0, 1, 1),
      this.scene
    );
    light2.intensity = 0.3;
  }

  setupPhysics() {
    const hk = new HavokPlugin(false);
    this.scene.enablePhysics(CONFIG.PHYSICS.GRAVITY.clone(), hk);
  }

  async setupEffects() {
    try {
      EffectsManager.initialize(this.scene);
      NodeMaterialManager.initialize(this.scene);
      await EffectsManager.createSound("Thruster"); 
    } catch (error) {
      console.warn("Failed to setup effects:", error);
    }
  }

  async loadEnvironment(environmentName) {
    const environment = ASSETS.ENVIRONMENTS.find(
      (env) => env.name === environmentName
    );
    if (!environment) {
      console.error(
        `Environment "${environmentName}" not found in ASSETS.ENVIRONMENTS`
      );
      return;
    }
    
    this.clearParticles();

    try {
      const result = await SceneLoader.ImportMeshAsync(
        null, 
        "",   
        environment.model, 
        this.scene
      );      

      await NodeMaterialManager.processImportResult(result);
      
      if (result.meshes && result.meshes.length > 0) {
        const rootMesh = result.meshes.find((mesh) => !mesh.parent);
        if (rootMesh) {
          rootMesh.name = "environment";
          if (environment.scale !== 1) {
            rootMesh.scaling.x = -environment.scale; 
            rootMesh.scaling.y = environment.scale;
            rootMesh.scaling.z = environment.scale;
          }
        }
      }

      if (environment.sky) {
        try {
          SkyManager.createSky(this.scene, environment.sky);
        } catch (error) {
          console.warn("Failed to create environment sky:", error);
        }
      }
      
      this.setupEnvironmentPhysics(environment);
      
      if (environment.particles) {
        try {
          for (const particle of environment.particles) {
            const position = particle.position ? particle.position.clone() : Vector3.Zero();

            const particleSystem = await EffectsManager.createParticleSystem(
              particle.name,
              position
            );
            
            if (particleSystem && particle.updateSpeed !== undefined) {
              particleSystem.updateSpeed = particle.updateSpeed;
            }
          }
        } catch (error) {
          console.warn("Failed to create environment particles:", error);
        }
      }
      
      await NodeMaterialManager.processMeshesForNodeMaterials();
      this.currentEnvironment = environmentName;

    } catch (error) {
      console.error("Failed to load environment:", error);
    }
  }

  setupEnvironmentPhysics(environment) {
    this.setupLightmappedMeshes(environment);
    this.setupPhysicsObjects(environment);
    this.setupJoints(environment);

    if (
      environment.physicsObjects.length === 0 &&
      environment.lightmappedMeshes.length === 0
    ) {
      this.setupFallbackPhysics(environment);
    }
  }

  setupLightmappedMeshes(environment) {
    const lightmap = new Texture(environment.lightmap, this.scene);
    
    environment.lightmappedMeshes.forEach((lightmappedMesh) => {
      const mesh = this.scene.getMeshByName(lightmappedMesh.name);
      if (!mesh) return;
      
      new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0 }, this.scene);
      
      mesh.isPickable = false;
      
      if (
        mesh.material instanceof StandardMaterial ||
        mesh.material instanceof PBRMaterial
      ) {
        mesh.material.lightmapTexture = lightmap;
        if (mesh.material.useLightmapAsShadowmap !== undefined) {
             mesh.material.useLightmapAsShadowmap = true;
        }
        lightmap.uAng = Math.PI;
        lightmap.level = lightmappedMesh.level;
        lightmap.coordinatesIndex = 1;
      }
      
      mesh.freezeWorldMatrix();
      mesh.doNotSyncBoundingInfo = true;
    });
  }

  setupPhysicsObjects(environment) {
    environment.physicsObjects.forEach((physicsObject) => {
      const mesh = this.scene.getMeshByName(physicsObject.name);
      if (mesh) {
        if (physicsObject.scale !== 1) {
          mesh.scaling.setAll(physicsObject.scale);
        }
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
          mass: physicsObject.mass,
        }, this.scene);
      }
    });
  }

  setupJoints(environment) {
    const pivotBeams = environment.physicsObjects.filter(
      (obj) => obj.role === OBJECT_ROLE.PIVOT_BEAM
    );
    
    pivotBeams.forEach((pivotBeam) => {
      const beamMesh = this.scene.getMeshByName(pivotBeam.name);
      if (!beamMesh) return;
      
      beamMesh.scaling.set(3, 0.05, 1); 
      
      const fixedMassObject = environment.physicsObjects.find(
        (obj) => obj.role === OBJECT_ROLE.DYNAMIC_BOX && obj.mass === 0
      );
      
      const fixedMesh = this.scene.getMeshByName(fixedMassObject?.name || "");
      if (!fixedMesh) return;

      const fixedMass = new PhysicsAggregate(
        fixedMesh,
        PhysicsShapeType.BOX,
        { mass: 0 },
        this.scene
      );
      
      const beam = new PhysicsAggregate(
        beamMesh,
        PhysicsShapeType.BOX,
        { mass: pivotBeam.mass },
        this.scene
      );

      const joint = new HingeConstraint(
        new Vector3(0.75, 0, 0),
        new Vector3(-0.25, 0, 0),
        new Vector3(0, 0, -1),
        new Vector3(0, 0, 1),
        this.scene
      );
      
      fixedMass.body.addConstraint(beam.body, joint);
    });
  }

  setupFallbackPhysics(environment) {
    const rootEnvironmentMesh = this.scene.getMeshByName("environment");
    if (!rootEnvironmentMesh) return;
    
    const allEnvironmentMeshes = [];
    const collectMeshes = (mesh) => {
      allEnvironmentMeshes.push(mesh);
      mesh.getChildMeshes().forEach(collectMeshes);
    };
    collectMeshes(rootEnvironmentMesh);
    
    allEnvironmentMeshes.forEach((mesh) => {
      if (
        mesh instanceof Mesh &&
        mesh.geometry &&
        mesh.geometry.getTotalVertices() > 0
      ) {
        new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
          mass: 0,
        }, this.scene);
        mesh.isPickable = false;
      }
    });
  }

  setupCharacter() {
    this.characterController = new CharacterController(this.scene);
    
    if (this.characterController) {
      this.smoothFollowController = new SmoothFollowCameraController(
        this.scene,
        this.camera,
        this.characterController.getDisplayCapsule()
      );
      
      this.characterController.setCameraController(this.smoothFollowController);
      
      CollectiblesManager.initialize(this.scene, this.characterController);
    }
  }

  loadCharacterModel() {
    const character = ASSETS.CHARACTERS[0];
    if (!character) {
      console.error("No character found in ASSETS.CHARACTERS");
      return;
    }
    this.loadCharacter(character);
  }

  loadCharacter(character, preservedPosition) {
    this.scene.animationGroups.slice().forEach((group) => group.dispose());
    
    SceneLoader.ImportMeshAsync(null, "", character.model, this.scene) 
      .then(async (result) => {
        
        await NodeMaterialManager.processImportResult(result);
        
        if (result.meshes && result.meshes.length > 0) {
          const rootMesh = result.meshes.find((mesh) => !mesh.parent);
          if (rootMesh) {
            rootMesh.name = "player";
          }
        }
        
        if (this.characterController && result.meshes[0]) {
          
          result.meshes.forEach((mesh) => {
            mesh.scaling.setAll(character.scale);
          });
          
          this.characterController.setPlayerMesh(result.meshes[0]);
          
          let characterPosition;
          if (preservedPosition) {
            characterPosition = preservedPosition;
          } else {
            const currentEnvironment = ASSETS.ENVIRONMENTS.find(
              (env) => env.name === this.currentEnvironment
            );
            characterPosition = currentEnvironment
              ? currentEnvironment.spawnPoint.clone()
              : new Vector3(0, 0, 0);
          }
          
          this.characterController.updateCharacterPhysics(
            character,
            characterPosition
          );
          
          this.characterController.animationController.setCharacter(
            character, 
            this.scene.animationGroups
          );

          const playerLabelUI = AdvancedDynamicTexture.CreateFullscreenUI("PlayerLabels");
          const nameRect = new Rectangle();
          nameRect.width = "0.06"; 
          nameRect.height = "0.06";
          nameRect.background = "black";
          nameRect.thickness = 0.1;
          nameRect.alpha = 0.5;
          playerLabelUI.addControl(nameRect);

          const avatarMesh = this.characterController.getDisplayCapsule();
          nameRect.linkWithMesh(avatarMesh);
          nameRect.linkOffsetY = -240; 

          const nameTag = new TextBlock();
          nameTag.text = HUDManager.getPlayerName("Player");
          nameTag.color = "white";
          nameTag.outlineWidth = 4;
          nameTag.outlineColor = "black";
          nameTag.alpha = 1;
          nameTag.fontSize = 15;
          nameRect.addControl(nameTag);
          
          this.playerNameTag = nameTag;

          const playerParticleSystem =
            await EffectsManager.createParticleSystem(
              CONFIG.EFFECTS.DEFAULT_PARTICLE,
              result.meshes[0]
            );
            
          if (playerParticleSystem && this.characterController) {
            this.characterController.setPlayerParticleSystem(
              playerParticleSystem
            );
          }
          
          const thrusterSound = EffectsManager.getSound("Thruster");
          if (thrusterSound && this.characterController) {
            this.characterController.setThrusterSound(thrusterSound);
          }
        }
      })
      .catch((error) => {
        console.error(
          `Failed to load character model (${character.name}):`,
          error
        );
      });
  }

  updatePlayerName(newName) {
    if (this.playerNameTag) {
      this.playerNameTag.text = newName.toUpperCase(); 
    }
  }

  getScene() {
    return this.scene;
  }

  getCurrentEnvironment() {
    return this.currentEnvironment;
  }

  async setupEnvironmentItems() {
    const environment = ASSETS.ENVIRONMENTS.find(
      (env) => env.name === this.currentEnvironment
    );
    if (environment && environment.items) {
      try {
        await CollectiblesManager.setupEnvironmentItems(environment);
      } catch (error) {
        console.warn("Failed to setup environment items:", error);
      }
    }
  }

  repositionCharacter() {
    if (!this.characterController) return;
    
    const environment = ASSETS.ENVIRONMENTS.find(
      (env) => env.name === this.currentEnvironment
    );
    const spawnPoint = environment?.spawnPoint.clone() || new Vector3(0, 0, 0); 
    
    this.characterController.setPosition(spawnPoint);
    this.characterController.setVelocity(new Vector3(0, 0, 0));
    
    const displayCapsule = this.characterController.getDisplayCapsule();
    if (displayCapsule) {
      displayCapsule.position.copyFrom(spawnPoint);
    }
  }

  changeCharacter(characterIndexOrName) {
    let character;
    if (typeof characterIndexOrName === "number") {
      if (
        characterIndexOrName < 0 ||
        characterIndexOrName >= ASSETS.CHARACTERS.length
      ) {
        console.error(`Invalid character index: ${characterIndexOrName}`);
        return;
      }
      character = ASSETS.CHARACTERS[characterIndexOrName];
    } else {
      character = ASSETS.CHARACTERS.find(
        (char) => char.name === characterIndexOrName
      );
    }
    
    if (!character) {
      console.error(`Character not found: ${characterIndexOrName}`);
      return;
    }
    
    let currentPosition = null;
    if (this.characterController) {
      currentPosition = this.characterController.getPosition().clone();
    }
    
    const existingPlayer = this.scene.getMeshByName("player");
    if (existingPlayer) {
      existingPlayer.dispose();
    }

    this.loadCharacter(character, currentPosition);
  }

  clearEnvironment() {
    const rootEnvironmentMesh = this.scene.getMeshByName("environment");
    
    if (rootEnvironmentMesh) {
      const allEnvironmentMeshes = [];
      const collectMeshes = (mesh) => {
        allEnvironmentMeshes.push(mesh);
        mesh.getChildMeshes().forEach(collectMeshes);
      };
      collectMeshes(rootEnvironmentMesh);
      
      allEnvironmentMeshes.forEach((mesh) => {
        if (mesh.physicsImpostor) {
          mesh.physicsImpostor.dispose();
        }
        mesh.dispose();
      });
    } else {
      const potentialEnvironmentMeshes = this.scene.meshes.filter(
        (mesh) =>
          !mesh.name.includes("player") &&
          !mesh.name.includes("camera") &&
          !mesh.name.includes("light") &&
          !mesh.name.includes("sky") &&
          !mesh.name.includes("capsule") &&
          !mesh.name.includes("fallback_") &&
          !mesh.name.includes("crate_") &&
          !mesh.name.includes("item_") &&
          !mesh.name.includes("CharacterDisplay") && 
          mesh !== this.characterController?.getDisplayCapsule() &&
          mesh instanceof Mesh
      );
      potentialEnvironmentMeshes.forEach((mesh) => {
        if (mesh.physicsImpostor) {
          mesh.physicsImpostor.dispose();
        }
        mesh.dispose();
      });
    }
  }

  clearItems() {
    CollectiblesManager.clearCollectibles();
    
    const itemMeshes = this.scene.meshes.filter(
      (mesh) =>
        (mesh.name.startsWith("fallback_") ||
          mesh.name.startsWith("crate_") ||
          mesh.name.startsWith("item_") ||
          mesh.name.includes("collectible") ||
          mesh.name.includes("pickup") ||
          mesh.name.includes("treasure") ||
          mesh.name.includes("coin") ||
          mesh.name.includes("gem") ||
          mesh.name.includes("crystal")) &&
        !mesh.name.includes("player") && 
        !mesh.name.includes("CharacterDisplay") &&
        mesh instanceof Mesh
    );
    
    itemMeshes.forEach((mesh) => {
      if (mesh.physicsImpostor) {
        mesh.physicsImpostor.dispose();
      }
      mesh.dispose();
    });
  }

  clearParticles() {
    EffectsManager.removeEnvironmentParticles();
    EffectsManager.removeItemParticles();
    
    const particleSystems = this.scene.particleSystems;
    const unmanagedParticleSystems = particleSystems.filter(
      (ps) =>
        !ps.name.includes("PLAYER") &&
        !ps.name.includes("player") &&
        !ps.name.includes("character") &&
        !ps.name.includes("thruster") &&
        !ps.name.includes("boost")
    );
    
    unmanagedParticleSystems.forEach((ps) => {
      ps.stop();
      ps.dispose();
    });
  }

  pausePhysics() {
    if (this.characterController) {
      this.characterController.pausePhysics();
    }
  }

  resumePhysics() {
    if (this.characterController) {
      this.characterController.resumePhysics();
    }
  }

  isPhysicsPaused() {
    if (this.characterController) {
      return this.characterController.isPhysicsPaused();
    }
    return false;
  }

  forceActivateSmoothFollow() {
    if (this.smoothFollowController) {
      this.smoothFollowController.forceActivateSmoothFollow();
    }
  }

  // ==========================================================
  // HIGH-QUALITY SCI-FI TELEPORT DOOR LOGIC
  // ==========================================================
  spawnTeleportPortal() {
    if (this.scene.getMeshByName("teleportPortal")) return;

    console.log("Spawning sci-fi teleport door...");
    
    const basePos = new Vector3(53, 1.18, 6);
    const portalPos = new Vector3(53, 1.18 + 2.0, 6); 

    const portal = MeshBuilder.CreatePlane("teleportPortal", { size: 4.5 }, this.scene);
    portal.position = portalPos;
    portal.billboardMode = Mesh.BILLBOARDMODE_Y; 

    Effect.ShadersStore["portalVertexShader"] = `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        void main(void) {
            gl_Position = worldViewProjection * vec4(position, 1.0);
            vUV = uv;
        }
    `;

    Effect.ShadersStore["portalFragmentShader"] = `
        precision highp float;
        varying vec2 vUV;
        uniform float time;
        
        void main(void) {
            vec2 uv = vUV * 2.0 - 1.0;
            float d = length(uv);
            
            float angle = atan(uv.y, uv.x) + time * 2.0;
            float swirl = sin(angle * 5.0 + d * 12.0 - time * 6.0);
            
            float core = 1.0 - smoothstep(0.0, 0.8, d);
            
            vec3 color = vec3(0.0, 0.9, 1.0) * swirl * core;
            color += vec3(0.0, 0.2, 0.8) * (1.0 - d) * 0.6; 
            
            float alpha = core * smoothstep(1.0, 0.4, d);
            if (alpha < 0.05) discard;
            
            gl_FragColor = vec4(color, alpha);
        }
    `;

    const portalMaterial = new ShaderMaterial("portalShader", this.scene, {
        vertex: "portal",
        fragment: "portal",
    }, {
        attributes: ["position", "uv"],
        uniforms: ["worldViewProjection", "time"]
    });

    portalMaterial.backFaceCulling = false;
    portalMaterial.alphaMode = 1; 
    portal.material = portalMaterial;

    const particleSystem = new ParticleSystem("portalParticles", 200, this.scene);
    particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
    particleSystem.emitter = portalPos;
    particleSystem.minEmitBox = new Vector3(-1.5, -2.0, -0.5);
    particleSystem.maxEmitBox = new Vector3(1.5, 2.0, 0.5);
    particleSystem.color1 = new Color4(0, 0.9, 1, 1); 
    particleSystem.color2 = new Color4(0.8, 1, 1, 1); 
    particleSystem.colorDead = new Color4(0, 0, 0, 0);
    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.15;
    particleSystem.minLifeTime = 0.5;
    particleSystem.maxLifeTime = 1.5;
    particleSystem.emitRate = 80;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;
    particleSystem.gravity = new Vector3(0, 1, 0); 
    particleSystem.start();

    let time = 0;
    let isTeleporting = false;

    this.scene.onBeforeRenderObservable.add(() => {
        time += this.scene.getEngine().getDeltaTime() * 0.001;
        portalMaterial.setFloat("time", time);
        
        if (this.characterController && !isTeleporting) {
            const playerPos = this.characterController.getPosition();
            const dist = Vector3.Distance(playerPos, basePos);
            
            if (dist < 2.5) {
                isTeleporting = true; 
                
                HUDManager.showNotification(
                    "TELEPORT DISCOVERED", 
                    "You found the teleport and will be teleported.", 
                    4000
                );
                
                setTimeout(() => {
                    this.pausePhysics();
                    
                    HUDManager.showNotification(
                        "SHELBYWORLD", 
                        "Teleportation successful! Welcome to the new zone.", 
                        4000
                    );
                    
                    setTimeout(() => { 
                        this.resumePhysics();
                        isTeleporting = false; 
                    }, 3000);
                }, 2000);
            }
        }
    });
  }

  dispose() {
    HUDManager.dispose();
    CollectiblesManager.dispose();
    NodeMaterialManager.dispose();
    if (this.smoothFollowController) {
      this.smoothFollowController.dispose();
    }
    if (this.characterController) {
      this.characterController.dispose();
    }
  }
}
