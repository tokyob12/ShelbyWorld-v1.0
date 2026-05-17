// Easing functions and types
import { EasingFunction, SineEase } from "@babylonjs/core/Animations/easing"; 

// Vector/Quaternion classes
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector"; 

// Physics imports...
// ...
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsCharacterController } from "@babylonjs/core/Physics/v2/characterController"; 
import { CharacterSupportedState } from "@babylonjs/core/Physics/v2/index"; // Consolidated import
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";

// Local imports
import { CONFIG, INPUT_KEYS, CHARACTER_STATES } from "../constants/GameConfig";
import { MobileInputManager } from "./MobileInputManager";
import { AnimationController } from "./AnimationController";

// ============================================================================
// CHARACTER CONTROLLER
// ============================================================================
export class CharacterController {
  scene;
  characterController;
  displayCapsule;
  playerMesh;
  state = CHARACTER_STATES.IN_AIR;
  wantJump = false;
  inputDirection = new Vector3(0, 0, 0);
  targetRotationY = 0;
  keysDown = new Set();
  cameraController = null;
  boostActive = false;
  playerParticleSystem = null;
  thrusterSound = null;
  animationController;
  
  isMobileDevice;
  isIPadWithKeyboard;
  isIPad;
  keyboardEventCount = 0;
  keyboardDetectionTimeout = null;
  physicsPaused = false;
  currentCharacter = null;

  constructor(scene) {
    this.scene = scene;
    
    this.isMobileDevice = this.detectMobileDevice();
    this.isIPad = this.detectIPad();
    this.isIPadWithKeyboard = this.detectIPadWithKeyboard();

    this.characterController = new PhysicsCharacterController(
      new Vector3(0, 0, 0),
      {
        capsuleHeight: 1.8,
        capsuleRadius: 0.6,
      },
      scene
    );

    this.displayCapsule = MeshBuilder.CreateCapsule(
      "CharacterDisplay",
      {
        height: 1.8,
        radius: 0.6,
      },
      scene
    );
    this.displayCapsule.isVisible = CONFIG.DEBUG.CAPSULE_VISIBLE;

    this.playerMesh = this.displayCapsule;

    this.animationController = new AnimationController(scene);

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Using explicit KeyboardEventTypes imported above
    this.scene.onKeyboardObservable.add(this.handleKeyboard); 
    this.scene.onBeforeRenderObservable.add(this.updateCharacter);
    this.scene.onAfterPhysicsObservable.add(this.updatePhysics);

    if (this.isMobileDevice) {
      MobileInputManager.initialize(
        this.scene.getEngine().getRenderingCanvas()
      );
    }
  }

  detectMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }

  detectIPad() {
    return (
      /iPad/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 0)
    );
  }

  detectIPadWithKeyboard() {
    if (!this.isIPad) return false;
    const hasKeyboard = this.checkForKeyboardPresence();
    const hasExternalKeyboard = this.checkForExternalKeyboard();
    return hasKeyboard || hasExternalKeyboard;
  }

  checkForKeyboardPresence() {
    const viewportHeight = window.innerHeight;
    const screenHeight = window.screen.height;
    const keyboardLikelyPresent = viewportHeight < screenHeight * 0.8;
    return keyboardLikelyPresent;
  }

  checkForExternalKeyboard() {
    this.keyboardEventCount = 0;
    const keyboardThreshold = 3;
    const checkKeyboardEvents = (event) => {
      if (
        event.key.length === 1 ||
        [
          "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Shift",
        ].includes(event.key)
      ) {
        this.keyboardEventCount++;
        if (this.keyboardEventCount >= keyboardThreshold) {
          document.removeEventListener("keydown", checkKeyboardEvents);
          if (this.keyboardDetectionTimeout) {
            clearTimeout(this.keyboardDetectionTimeout);
          }
          return true;
        }
      }
      return false;
    };
    document.addEventListener("keydown", checkKeyboardEvents);
    this.keyboardDetectionTimeout = window.setTimeout(() => {
      document.removeEventListener("keydown", checkKeyboardEvents);
    }, 5000);
    return false;
  }

  handleKeyboard = (kbInfo) => {
    const key = kbInfo.event.key.toLowerCase();
    switch (kbInfo.type) {
      case KeyboardEventTypes.KEYDOWN: // Corrected from BABYLON.KeyboardEventTypes.KEYDOWN
        this.keysDown.add(key);
        this.handleKeyDown(key);
        break;
      case KeyboardEventTypes.KEYUP: // Corrected from BABYLON.KeyboardEventTypes.KEYUP
        this.keysDown.delete(key);
        this.handleKeyUp(key);
        break;
    }
  };

  handleKeyDown(key) {
    if (INPUT_KEYS.FORWARD.includes(key)) {
      this.inputDirection.z = 1;
    } else if (INPUT_KEYS.BACKWARD.includes(key)) {
      this.inputDirection.z = -1;
    } else if (INPUT_KEYS.STRAFE_LEFT.includes(key)) {
      this.inputDirection.x = -1;
    } else if (INPUT_KEYS.STRAFE_RIGHT.includes(key)) {
      this.inputDirection.x = 1;
    } else if (INPUT_KEYS.JUMP.includes(key)) {
      this.wantJump = true;
    } else if (INPUT_KEYS.BOOST.includes(key)) {
      this.boostActive = true;
      this.updateParticleSystem();
    } else if (INPUT_KEYS.DEBUG.includes(key)) {
      this.toggleDebugDisplay();
    } else if (INPUT_KEYS.HUD_TOGGLE.includes(key)) {
      // Logic for HUD_TOGGLE (requires HUDManager import)
    } else if (INPUT_KEYS.HUD_POSITION.includes(key)) {
      // Logic for HUD_POSITION (requires HUDManager import)
    } else if (INPUT_KEYS.RESET_CAMERA.includes(key)) {
      this.resetCameraToDefaultOffset();
    }
    if (this.isIPadWithKeyboard) {
      this.updateMobileInput();
    }
  }

  handleKeyUp(key) {
    if (INPUT_KEYS.FORWARD.includes(key) || INPUT_KEYS.BACKWARD.includes(key)) {
      this.inputDirection.z = 0;
    }
    if (INPUT_KEYS.LEFT.includes(key) || INPUT_KEYS.RIGHT.includes(key)) {
      this.inputDirection.x = 0;
    }
    if (
      INPUT_KEYS.STRAFE_LEFT.includes(key) ||
      INPUT_KEYS.STRAFE_RIGHT.includes(key)
    ) {
      this.inputDirection.x = 0;
    }
    if (INPUT_KEYS.JUMP.includes(key)) {
      this.wantJump = false;
    }
    if (INPUT_KEYS.BOOST.includes(key)) {
      this.boostActive = false;
      this.updateParticleSystem();
    }
    if (this.isIPadWithKeyboard) {
      this.updateMobileInput();
    }
  }

  updateMobileInput() {
    if (this.isMobileDevice) {
      const mobileDirection = MobileInputManager.getInputDirection();
      
      if (this.isIPadWithKeyboard) {
        if (
          this.state !== CHARACTER_STATES.IN_AIR &&
          Math.abs(mobileDirection.x) > 0.1
        ) {
          const rotationSpeed = this.currentCharacter?.rotationSpeed || 0.05;
          this.targetRotationY += mobileDirection.x * rotationSpeed;
        }
        
        const hasKeyboardMovement =
          INPUT_KEYS.FORWARD.some(key => this.keysDown.has(key)) ||
          INPUT_KEYS.BACKWARD.some(key => this.keysDown.has(key));

        if (!hasKeyboardMovement && Math.abs(mobileDirection.z) > 0.1) {
          this.inputDirection.z = mobileDirection.z;
        } else if (!hasKeyboardMovement && !INPUT_KEYS.FORWARD.some(key => this.keysDown.has(key))) {
          this.inputDirection.z = 0;
        }

        const mobileWantJump = MobileInputManager.getWantJump();
        const mobileWantBoost = MobileInputManager.getWantBoost();

        if (!INPUT_KEYS.JUMP.some(key => this.keysDown.has(key)) && mobileWantJump) {
          this.wantJump = true;
        } else if (!INPUT_KEYS.JUMP.some(key => this.keysDown.has(key)) && !mobileWantJump) {
          this.wantJump = false;
        }
        
        if (!INPUT_KEYS.BOOST.some(key => this.keysDown.has(key)) && mobileWantBoost) {
          this.boostActive = true;
        } else if (!INPUT_KEYS.BOOST.some(key => this.keysDown.has(key)) && !mobileWantBoost) {
          this.boostActive = false;
        }
        
      } else {
        this.inputDirection.copyFrom(mobileDirection);
        
        if (
          this.state !== CHARACTER_STATES.IN_AIR &&
          Math.abs(mobileDirection.x) > 0.1
        ) {
          const rotationSpeed = this.currentCharacter?.rotationSpeed || 0.05;
          this.targetRotationY += mobileDirection.x * rotationSpeed;
        }

        if (Math.abs(mobileDirection.z) > 0.1) {
          this.inputDirection.z = mobileDirection.z;
        } else {
          this.inputDirection.z = 0;
        }
        
        this.inputDirection.x = 0;

        this.wantJump = MobileInputManager.getWantJump();
        this.boostActive = MobileInputManager.getWantBoost();
      }
      this.updateParticleSystem();
    }
  }

  toggleDebugDisplay() {
    this.displayCapsule.isVisible = !this.displayCapsule.isVisible;
  }

  resetCameraToDefaultOffset() {
    if (this.cameraController) {
      this.cameraController.resetCameraToDefaultOffset();
    }
  }

  updateParticleSystem() {
    if (this.playerParticleSystem) {
      if (this.boostActive) {
        this.playerParticleSystem.start();
      } else {
        this.playerParticleSystem.stop();
      }
    }
    if (this.thrusterSound) {
      if (this.boostActive) {
        if (!this.thrusterSound.isPlaying) {
          this.thrusterSound.play();
        }
      } else {
        if (this.thrusterSound.isPlaying) {
          this.thrusterSound.stop();
        }
      }
    }
  }

  updateCharacter = () => {
    this.updateMobileInput();
    this.updateRotation();
    this.updatePosition();
    this.updateAnimations();
  };

  updateRotation() {
    if (this.cameraController && this.cameraController.isRotatingCharacter) {
      this.targetRotationY = this.displayCapsule.rotation.y;
      return;
    }
    if (this.state === CHARACTER_STATES.IN_AIR) {
      return;
    }
    
    const rotationSpeed = this.currentCharacter?.rotationSpeed || 0.05;
    const rotationSmoothing = this.currentCharacter?.rotationSmoothing || 0.2;
    
    if (INPUT_KEYS.LEFT.some(key => this.keysDown.has(key))) {
      this.targetRotationY -= rotationSpeed;
    }
    if (INPUT_KEYS.RIGHT.some(key => this.keysDown.has(key))) {
      this.targetRotationY += rotationSpeed;
    }

    this.displayCapsule.rotation.y +=
      (this.targetRotationY - this.displayCapsule.rotation.y) *
      rotationSmoothing;
  }

  updatePosition() {
    this.displayCapsule.position.copyFrom(
      this.characterController.getPosition()
    );

    this.playerMesh.position.copyFrom(this.characterController.getPosition());
    this.playerMesh.position.y += CONFIG.ANIMATION.PLAYER_Y_OFFSET;

    if (this.displayCapsule.rotationQuaternion) {
      if (!this.playerMesh.rotationQuaternion) {
        this.playerMesh.rotationQuaternion = new Quaternion();
      }
      this.playerMesh.rotationQuaternion.copyFrom(
        this.displayCapsule.rotationQuaternion
      );
    } else {
      this.playerMesh.rotationQuaternion = null;
      this.playerMesh.rotation.copyFrom(this.displayCapsule.rotation);
    }
  }

  updateAnimations() {
    const isMoving = this.isAnyMovementKeyPressed();
    this.animationController.updateAnimation(isMoving, this.state);
    this.animationController.updateBlend();
    if (isMoving && this.cameraController) {
      this.cameraController.checkForWalkActivation();
    }
  }

  isAnyMovementKeyPressed() {
    const keyboardMoving =
      INPUT_KEYS.FORWARD.some((key) => this.keysDown.has(key)) ||
      INPUT_KEYS.BACKWARD.some((key) => this.keysDown.has(key)) ||
      INPUT_KEYS.LEFT.some((key) => this.keysDown.has(key)) ||
      INPUT_KEYS.RIGHT.some((key) => this.keysDown.has(key)) ||
      INPUT_KEYS.STRAFE_LEFT.some((key) => this.keysDown.has(key)) ||
      INPUT_KEYS.STRAFE_RIGHT.some((key) => this.keysDown.has(key));

    if (this.isMobileDevice) {
      const mobileMoving =
        MobileInputManager.isMobileActive() &&
        MobileInputManager.getInputDirection().length() > 0.1;

      if (this.isIPadWithKeyboard) {
        return keyboardMoving || mobileMoving;
      } else {
        return mobileMoving;
      }
    }
    return keyboardMoving;
  }

  updatePhysics = () => {
    if (!this.scene.deltaTime) return;
    const deltaTime = this.scene.deltaTime / 1000.0;
    if (deltaTime === 0) return;

    if (this.physicsPaused) return;

    const down = Vector3.Down();
    const support = this.characterController.checkSupport(deltaTime, down);
    
    const characterOrientation = Quaternion.FromEulerAngles(
      0,
      this.displayCapsule.rotation.y,
      0
    );

    const desiredVelocity = this.calculateDesiredVelocity(
      deltaTime,
      support,
      characterOrientation
    );

    this.characterController.setVelocity(desiredVelocity);
    this.characterController.integrate(
      deltaTime,
      support,
      CONFIG.PHYSICS.CHARACTER_GRAVITY
    );
  };

  calculateDesiredVelocity(deltaTime, supportInfo, characterOrientation) {
    const nextState = this.getNextState(supportInfo);
    if (nextState !== this.state) {
      this.state = nextState;
    }

    const upWorld = CONFIG.PHYSICS.CHARACTER_GRAVITY.normalizeToNew();
    upWorld.scaleInPlace(-1.0);
    const forwardLocalSpace = Vector3.Forward();
    const forwardWorld =
      forwardLocalSpace.applyRotationQuaternion(characterOrientation);

    const currentVelocity = this.characterController.getVelocity();

    switch (this.state) {
      case CHARACTER_STATES.IN_AIR:
        return this.calculateAirVelocity(
          deltaTime,
          forwardWorld,
          upWorld,
          currentVelocity,
          characterOrientation
        );
      case CHARACTER_STATES.ON_GROUND:
        return this.calculateGroundVelocity(
          deltaTime,
          forwardWorld,
          upWorld,
          currentVelocity,
          supportInfo,
          characterOrientation
        );
      case CHARACTER_STATES.START_JUMP:
        return this.calculateJumpVelocity(currentVelocity, upWorld);
      default:
        return Vector3.Zero();
    }
  }

  calculateAirVelocity(
    deltaTime,
    forwardWorld,
    upWorld,
    currentVelocity,
    characterOrientation
  ) {
    const character = this.currentCharacter;
    if (!character) {
      console.warn("No character set for air physics calculations");
      return currentVelocity;
    }

    const characterMass = character.mass;
    let outputVelocity = currentVelocity.clone();

    if (this.boostActive) {
      const baseSpeed = character.speed.inAir * character.speed.boostMultiplier;
      const massAdjustedSpeed = baseSpeed / Math.sqrt(characterMass);
      
      const desiredVelocity = this.inputDirection
        .scale(massAdjustedSpeed)
        .applyRotationQuaternion(characterOrientation);
      
      outputVelocity = this.characterController.calculateMovement(
        deltaTime,
        forwardWorld,
        upWorld,
        currentVelocity,
        Vector3.Zero(),
        desiredVelocity,
        upWorld
      );
    } 

    const baseAirResistance = 0.98;
    const massAdjustedAirResistance =
      baseAirResistance - (characterMass - 1.0) * 0.01; 
    
    outputVelocity.scaleInPlace(massAdjustedAirResistance);

    outputVelocity.addInPlace(upWorld.scale(-outputVelocity.dot(upWorld)));
    outputVelocity.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));

    outputVelocity.addInPlace(
      CONFIG.PHYSICS.CHARACTER_GRAVITY.scale(deltaTime)
    );

    return outputVelocity;
  }

  calculateGroundVelocity(
    deltaTime,
    forwardWorld,
    upWorld,
    currentVelocity,
    supportInfo,
    characterOrientation
  ) {
    const character = this.currentCharacter;
    if (!character) {
      console.warn("No character set for physics calculations");
      return currentVelocity;
    }

    const characterMass = character.mass;

    const baseSpeed = this.boostActive
      ? character.speed.onGround * character.speed.boostMultiplier
      : character.speed.onGround;
      
    const massAdjustedSpeed = baseSpeed / Math.sqrt(characterMass); 

    const desiredVelocity = this.inputDirection
      .scale(massAdjustedSpeed)
      .applyRotationQuaternion(characterOrientation);
      
    const outputVelocity = this.characterController.calculateMovement(
      deltaTime,
      forwardWorld,
      supportInfo.averageSurfaceNormal,
      currentVelocity,
      supportInfo.averageSurfaceVelocity,
      desiredVelocity,
      upWorld
    );
    
    outputVelocity.subtractInPlace(supportInfo.averageSurfaceVelocity);

    const baseFriction = 0.95;
    const massAdjustedFriction = baseFriction + (characterMass - 1.0) * 0.02; 
    const maxSpeed = massAdjustedSpeed * 2.0;

    outputVelocity.scaleInPlace(massAdjustedFriction);

    const currentSpeed = outputVelocity.length();
    if (currentSpeed > maxSpeed) {
      outputVelocity.normalize().scaleInPlace(maxSpeed);
    }
    
    if (this.inputDirection.length() < 0.1) {
      const dampingFactor = 0.4 + (characterMass - 1.0) * 0.05; 
      outputVelocity.scaleInPlace(dampingFactor);
    }

    const inv1k = 1e-3;
    if (outputVelocity.dot(upWorld) > inv1k) {
      const velLen = outputVelocity.length();
      outputVelocity.normalizeFromLength(velLen);
      const horizLen = velLen / supportInfo.averageSurfaceNormal.dot(upWorld);
      const c = supportInfo.averageSurfaceNormal.cross(outputVelocity);
      const newOutputVelocity = c.cross(upWorld);
      newOutputVelocity.scaleInPlace(horizLen);
      return newOutputVelocity;
    }

    outputVelocity.addInPlace(supportInfo.averageSurfaceVelocity);
    return outputVelocity;
  }

  calculateJumpVelocity(currentVelocity, upWorld) {
    const character = this.currentCharacter;
    if (!character) {
      console.warn("No character set for jump physics calculations");
      return currentVelocity;
    }

    const characterMass = character.mass;
    const jumpHeight = this.boostActive ? 10.0 : character.jumpHeight; 
    const massAdjustedJumpHeight = jumpHeight / Math.sqrt(characterMass); 

    const u = Math.sqrt(
      2 * CONFIG.PHYSICS.CHARACTER_GRAVITY.length() * massAdjustedJumpHeight
    );
    
    const curRelVel = currentVelocity.dot(upWorld);
    return currentVelocity.add(upWorld.scale(u - curRelVel));
  }

  getNextState(supportInfo) {
    switch (this.state) {
      case CHARACTER_STATES.IN_AIR:
        return supportInfo.supportedState === CharacterSupportedState.SUPPORTED
          ? CHARACTER_STATES.ON_GROUND
          : CHARACTER_STATES.IN_AIR;
      case CHARACTER_STATES.ON_GROUND:
        if (
          supportInfo.supportedState !==
          CharacterSupportedState.SUPPORTED
        ) {
          return CHARACTER_STATES.IN_AIR;
        }
        return this.wantJump
          ? CHARACTER_STATES.START_JUMP
          : CHARACTER_STATES.ON_GROUND;
      case CHARACTER_STATES.START_JUMP:
        return CHARACTER_STATES.IN_AIR;
      default:
        return CHARACTER_STATES.IN_AIR;
    }
  }

  setPlayerMesh(mesh) {
    this.playerMesh = mesh;
    mesh.scaling.setAll(CONFIG.ANIMATION.PLAYER_SCALE);
  }

  getPlayerMesh() {
    return this.playerMesh;
  }

  getPhysicsCharacterController() {
    return this.characterController;
  }

  getCurrentCharacter() {
    return this.currentCharacter;
  }

  updateCharacterPhysics(character, spawnPosition) {
    this.characterController.setPosition(spawnPosition);
    this.currentCharacter = character;

    this.displayCapsule.scaling.setAll(1);
    this.displayCapsule.scaling.y = character.height / 1.8;
    this.displayCapsule.scaling.x = character.radius / 0.6;
    this.displayCapsule.scaling.z = character.radius / 0.6;

    this.characterController.setVelocity(new Vector3(0, 0, 0));
    this.inputDirection.setAll(0);
    this.wantJump = false;
    this.boostActive = false;
    this.state = CHARACTER_STATES.IN_AIR;
  }

  getDisplayCapsule() {
    return this.displayCapsule;
  }

  setCameraController(cameraController) {
    this.cameraController = cameraController;
  }

  setPlayerParticleSystem(particleSystem) {
    this.playerParticleSystem = particleSystem;
    if (particleSystem) {
      particleSystem.stop();
    }
  }

  getPlayerParticleSystem() {
    return this.playerParticleSystem;
  }

  setThrusterSound(sound) {
    this.thrusterSound = sound;
    sound.stop();
  }

  isMoving() {
    return this.isAnyMovementKeyPressed();
  }

  isBoosting() {
    return this.boostActive;
  }

  getState() {
    return this.state;
  }

  isOnGround() {
    return this.state === CHARACTER_STATES.ON_GROUND;
  }

  getPhysicsBody() {
    return null;
  }

  getVelocity() {
    return this.characterController.getVelocity();
  }

  getPosition() {
    return this.characterController.getPosition();
  }

  setPosition(position) {
    this.characterController.setPosition(position);
  }

  setVelocity(velocity) {
    this.characterController.setVelocity(velocity);
  }

  pausePhysics() {
    this.physicsPaused = true;
    this.characterController.setVelocity(new Vector3(0, 0, 0));
  }

  resumePhysics() {
    this.physicsPaused = false;
  }

  isPhysicsPaused() {
    return this.physicsPaused;
  }

  // NOTE: resetToStartPosition relies on a SceneManager method which will get the current environment
  resetToStartPosition() {
    // This is handled by SceneManager.repositionCharacter() in the full flow, 
    // but the fallback logic requires ASSETS. This is safe to leave simplified here.
    const spawnPoint = new Vector3(0, 0, 0); 
    
    this.characterController.setPosition(spawnPoint);
    this.characterController.setVelocity(new Vector3(0, 0, 0));
    this.inputDirection.setAll(0);
    this.wantJump = false;
    this.boostActive = false;
    this.state = CHARACTER_STATES.IN_AIR;
  }

  dispose() {
    // Since MobileInputManager is a static class, we need to call its static dispose
    MobileInputManager.dispose(); 
  }
}