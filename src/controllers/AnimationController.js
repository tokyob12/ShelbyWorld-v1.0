// --- Imports ---
import { CHARACTER_STATES } from "../constants/GameConfig"; 
// No direct BABYLON imports needed, relying on scene methods and passed data

// ============================================================================
// ANIMATION CONTROLLER
// ============================================================================
export class AnimationController {
  scene;
  currentCharacter = null;
  currentAnimation = null;
  previousAnimation = null;
  blendStartTime = 0;
  blendDuration = 400; 
  isBlending = false;
  weightedAnimation = null;
  jumpDelayStartTime = 0;
  isJumpDelayed = false;
  lastCharacterState = null;
  mappedAnimations = {}; 

  constructor(scene) {
    this.scene = scene;
  }
  
  setCharacter(character, loadedAnimationGroups) {
    this.currentCharacter = character;
    this.blendDuration = character.animationBlend || 400;
    
    this.currentAnimation = null;
    this.previousAnimation = null;
    this.isBlending = false;
    this.weightedAnimation = null;
    this.isJumpDelayed = false;
    this.jumpDelayStartTime = 0;
    this.lastCharacterState = null;
    
    this.stopAllAnimations(); // Stop current animations on character switch

    this.mappedAnimations = {};

    // Helper to find animation by name or fallback
    const findAnimation = (name) => {
        let animation = loadedAnimationGroups.find(a => a.name === name);
        if (animation) return animation;
        animation = loadedAnimationGroups.find(
            (anim) =>
                anim.name.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(anim.name.toLowerCase())
        );
        if (animation) return animation;
        if (name.toLowerCase().includes("idle")) {
            return loadedAnimationGroups.find(a => a.name.toLowerCase().includes("idle") || a.name.toLowerCase().includes("stand"));
        } else if (name.toLowerCase().includes("walk")) {
            return loadedAnimationGroups.find(a => a.name.toLowerCase().includes("walk") || a.name.toLowerCase().includes("run") || a.name.toLowerCase().includes("move"));
        } else if (name.toLowerCase().includes("jump")) {
            return loadedAnimationGroups.find(a => a.name.toLowerCase().includes("jump") || a.name.toLowerCase().includes("leap") || a.name.toLowerCase().includes("hop"));
        }
        return null;
    };

    this.mappedAnimations.walk = findAnimation(character.animations.walk);
    this.mappedAnimations.idle = findAnimation(character.animations.idle);
    this.mappedAnimations.jump = findAnimation(character.animations.jump);

    this.mappedAnimations.walk?.stop();
    this.mappedAnimations.idle?.stop();
    this.mappedAnimations.jump?.stop();
    
    if (!this.mappedAnimations.walk || !this.mappedAnimations.idle) {
        console.warn(`Animation mapping for ${character.name} failed. Found:`, {
            walk: this.mappedAnimations.walk?.name || "NOT FOUND",
            idle: this.mappedAnimations.idle?.name || "NOT FOUND",
            jump: this.mappedAnimations.jump?.name || "NOT FOUND",
            available: loadedAnimationGroups.map(a => a.name)
        });
    }
  }

  _getAnimationGroup(animationName) {
      if (!this.currentCharacter) return null;
      
      const configName = animationName.toLowerCase();
      
      if (configName === this.currentCharacter.animations.idle.toLowerCase()) {
          return this.mappedAnimations.idle;
      }
      if (configName === this.currentCharacter.animations.walk.toLowerCase()) {
          return this.mappedAnimations.walk;
      }
      if (configName === this.currentCharacter.animations.jump.toLowerCase()) {
          return this.mappedAnimations.jump;
      }
      
      return null;
  }
  
  updateAnimation(isMoving, characterState) {
    if (!this.currentCharacter) return;
    
    this.handleJumpDelay(characterState);

    let targetAnimationName;
    
    if (characterState === CHARACTER_STATES.IN_AIR && !this.isJumpDelayed) {
      targetAnimationName = this.currentCharacter.animations.jump;
    } else if (isMoving) {
      targetAnimationName = this.currentCharacter.animations.walk;
    } else {
      targetAnimationName = this.currentCharacter.animations.idle;
    }

    if (this.currentAnimation === targetAnimationName && !this.isBlending) {
      return;
    }

    if (!this.currentAnimation) {
      this.startAnimation(targetAnimationName);
      return;
    }

    if (this.isBlending) {
      return;
    }

    if (this.currentCharacter.animationBlend === 0) {
      this.switchAnimationDirectly(targetAnimationName);
      return;
    }

    this.startWeightedBlend(targetAnimationName);
  }

  startAnimation(animationName) {
    const animation = this._getAnimationGroup(animationName);

    if (!animation) {
      console.warn(`Animation not found: ${animationName}.`);
      return;
    }

    this.scene.animationGroups.forEach((anim) => {
      if (anim !== animation) {
        anim.stop();
      }
    });

    animation.start(true);
    this.currentAnimation = animation.name;
    this.previousAnimation = null;
    this.isBlending = false;
    this.weightedAnimation = null;
  }

  switchAnimationDirectly(targetAnimationName) {
    const currentAnim = this._getAnimationGroup(this.currentAnimation);
    const targetAnim = this._getAnimationGroup(targetAnimationName);

    if (!currentAnim || !targetAnim) {
      console.warn(`Animation not found for direct switch: current=${this.currentAnimation}, target=${targetAnimationName}`);
      return;
    }

    currentAnim.stop();
    targetAnim.start(true);
    
    this.previousAnimation = this.currentAnimation;
    this.currentAnimation = targetAnim.name;
    this.isBlending = false;
    this.weightedAnimation = null;
  }

  startWeightedBlend(targetAnimationName) {
    const currentAnim = this._getAnimationGroup(this.currentAnimation);
    const targetAnim = this._getAnimationGroup(targetAnimationName);

    if (!currentAnim || !targetAnim) {
      console.warn(`Animation not found for weighted blend: current=${this.currentAnimation}, target=${targetAnimationName}`);
      return;
    }

    currentAnim.start(true);
    targetAnim.start(true);

    currentAnim.weight = 1.0;
    targetAnim.weight = 0.0;

    this.previousAnimation = this.currentAnimation;
    this.currentAnimation = targetAnim.name;
    this.blendStartTime = Date.now();
    this.isBlending = true;
  }

  updateBlend() {
    if (!this.isBlending) return;

    const elapsedTime = Date.now() - this.blendStartTime;
    const blendProgress = Math.min(elapsedTime / this.blendDuration, 1.0);

    const previousWeight = 1.0 - this.easeInOutCubic(blendProgress);
    const currentWeight = this.easeInOutCubic(blendProgress);

    if (this.previousAnimation && this.currentAnimation) {
      const previousAnim = this._getAnimationGroup(this.previousAnimation);
      const currentAnim = this._getAnimationGroup(this.currentAnimation);

      if (previousAnim && currentAnim) {
        previousAnim.weight = previousWeight;
        currentAnim.weight = currentWeight;
      }
    }

    if (blendProgress >= 1.0) {
      this.completeBlend();
    }
  }

  completeBlend() {
    if (!this.currentAnimation) return;

    if (this.previousAnimation) {
      const previousAnim = this._getAnimationGroup(this.previousAnimation);
      if (previousAnim) {
        previousAnim.stop();
      }
    }

    const targetAnim = this._getAnimationGroup(this.currentAnimation);
    if (targetAnim) {
      targetAnim.weight = 1.0;
    }

    this.isBlending = false;
    this.weightedAnimation = null;
    this.previousAnimation = null;
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  stopAllAnimations() {
    this.scene.animationGroups.forEach((anim) => {
      anim.stop();
    });
    this.currentAnimation = null;
    this.previousAnimation = null;
    this.isBlending = false;
    this.weightedAnimation = null;
  }

  handleJumpDelay(characterState) {
    if (!this.currentCharacter || !characterState) return;
    const jumpDelay = this.currentCharacter.jumpDelay || 100;
    
    if (
      characterState === CHARACTER_STATES.IN_AIR &&
      this.lastCharacterState !== CHARACTER_STATES.IN_AIR
    ) {
      this.isJumpDelayed = true;
      this.jumpDelayStartTime = Date.now();
    }
    else if (
      characterState !== CHARACTER_STATES.IN_AIR &&
      this.lastCharacterState === CHARACTER_STATES.IN_AIR
    ) {
      this.isJumpDelayed = false;
      this.jumpDelayStartTime = 0;
    }
    else if (this.isJumpDelayed && characterState === CHARACTER_STATES.IN_AIR) {
      const elapsedTime = Date.now() - this.jumpDelayStartTime;
      if (elapsedTime >= jumpDelay) {
        this.isJumpDelayed = false;
      }
    }
    this.lastCharacterState = characterState;
  }

  getCurrentAnimation() {
    return this.currentAnimation;
  }

  isCurrentlyBlending() {
    return this.isBlending;
  }
}