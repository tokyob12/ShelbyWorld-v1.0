// --- Imports ---
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MOBILE_CONTROLS } from "../constants/GameConfig";

// ============================================================================
// MOBILE INPUT MANAGER
// ============================================================================
// NOTE: This class is a static utility class in the original implementation, 
// so we'll export it as a class with static methods for consistency.
export class MobileInputManager {
  static isInitialized = false;
  static joystickContainer = null;
  static joystickStick = null;
  static joystickCenter = { x: 0, y: 0 };
  static joystickActive = false;
  static joystickTouchId = null;
  static jumpButton = null;
  static boostButton = null;
  static jumpActive = false;
  static boostActive = false;
  static jumpTouchId = null;
  static boostTouchId = null;
  static inputDirection = new Vector3(0, 0, 0); // Replaced BABYLON.Vector3
  static wantJump = false;
  static wantBoost = false;

  /**
   * Initializes mobile touch controls
   * @param canvas The Babylon.js canvas element
   */
  static initialize(canvas) {
    if (this.isInitialized) {
      return;
    }
    this.cleanupExistingControls();
    this.setupMobileCanvas(canvas);
    this.createJoystick(canvas);
    this.createActionButtons(canvas);
    this.setupTouchEventListeners(canvas);
    this.applyVisibilitySettings();
    this.isInitialized = true;
  }

  /**
   * Cleans up any existing mobile controls to prevent duplicates
   */
  static cleanupExistingControls() {
    const existingJoysticks = document.querySelectorAll("#mobile-joystick");
    existingJoysticks.forEach((element) => {
      element.remove();
    });
    const existingJumpButtons = document.querySelectorAll(
      "#mobile-jump-button"
    );
    existingJumpButtons.forEach((element) => {
      element.remove();
    });
    const existingBoostButtons = document.querySelectorAll(
      "#mobile-boost-button"
    );
    existingBoostButtons.forEach((element) => {
      element.remove();
    });

    this.joystickContainer = null;
    this.joystickStick = null;
    this.jumpButton = null;
    this.boostButton = null;
    this.joystickActive = false;
    this.jumpActive = false;
    this.boostActive = false;
    this.joystickTouchId = null;
    this.jumpTouchId = null;
    this.boostTouchId = null;
    this.inputDirection.set(0, 0, 0);
    this.wantJump = false;
    this.wantBoost = false;
  }

  /**
   * Sets up canvas for full-screen mobile display
   * @param canvas The canvas element
   */
  static setupMobileCanvas(canvas) {
    const container = canvas.parentElement;
    if (!container) return;

    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "1";

    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.margin = "0";
    container.style.padding = "0";
    container.style.overflow = "hidden";

    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100vw";
    document.body.style.height = "100vh";

    window.dispatchEvent(new Event("resize"));
    this.setupOrientationHandler(canvas);
  }

  /**
   * Sets up orientation change handling for mobile
   * @param canvas The canvas element
   */
  static setupOrientationHandler(canvas) {
    const handleOrientationChange = () => {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100);
    };
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);
  }

  /**
   * Creates the virtual joystick for movement
   * @param canvas The canvas element
   */
  static createJoystick(canvas) {
    const container = canvas.parentElement;
    if (!container) return;

    this.joystickContainer = document.createElement("div");
    this.joystickContainer.id = "mobile-joystick";
    this.joystickContainer.style.cssText = `
            position: fixed;
            bottom: ${MOBILE_CONTROLS.POSITIONS.JOYSTICK.BOTTOM}px;
            left: ${MOBILE_CONTROLS.POSITIONS.JOYSTICK.LEFT}px;
            width: ${MOBILE_CONTROLS.JOYSTICK_RADIUS * 2}px;
            height: ${MOBILE_CONTROLS.JOYSTICK_RADIUS * 2}px;
            border-radius: 50%;
            background-color: ${MOBILE_CONTROLS.COLORS.JOYSTICK_BG};
            opacity: ${MOBILE_CONTROLS.OPACITY};
            border: 2px solid rgba(255, 255, 255, 0.3);
            z-index: 1000;
            pointer-events: auto;
            user-select: none;
            touch-action: none;
        `;

    this.joystickStick = document.createElement("div");
    this.joystickStick.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: ${MOBILE_CONTROLS.COLORS.JOYSTICK_STICK};
            transform: translate(-50%, -50%);
            pointer-events: none;
            transition: transform 0.1s ease;
        `;
    this.joystickContainer.appendChild(this.joystickStick);
    container.appendChild(this.joystickContainer);

    setTimeout(() => {
      const rect = this.joystickContainer?.getBoundingClientRect();
      if (rect) {
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
    }, 0);
  }

  /**
   * Creates action buttons (jump, boost)
   * @param canvas The canvas element
   */
  static createActionButtons(canvas) {
    const container = canvas.parentElement;
    if (!container) return;

    this.jumpButton = document.createElement("div");
    this.jumpButton.id = "mobile-jump-button";
    this.jumpButton.textContent = "JUMP";
    this.jumpButton.style.cssText = `
            position: fixed;
            bottom: ${MOBILE_CONTROLS.POSITIONS.JUMP_BUTTON.BOTTOM}px;
            right: ${MOBILE_CONTROLS.POSITIONS.JUMP_BUTTON.RIGHT}px;
            width: ${MOBILE_CONTROLS.BUTTON_SIZE}px;
            height: ${MOBILE_CONTROLS.BUTTON_SIZE}px;
            border-radius: 50%;
            background-color: ${MOBILE_CONTROLS.COLORS.BUTTON_BG};
            color: ${MOBILE_CONTROLS.COLORS.BUTTON_TEXT};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            opacity: ${MOBILE_CONTROLS.OPACITY};
            border: 2px solid rgba(255, 255, 255, 0.3);
            z-index: 1000;
            pointer-events: auto;
            user-select: none;
            touch-action: none;
            transition: all 0.2s ease;
        `;

    this.boostButton = document.createElement("div");
    this.boostButton.id = "mobile-boost-button";
    this.boostButton.textContent = "BOOST";
    this.boostButton.style.cssText = `
            position: fixed;
            bottom: ${MOBILE_CONTROLS.POSITIONS.BOOST_BUTTON.BOTTOM}px;
            right: ${MOBILE_CONTROLS.POSITIONS.BOOST_BUTTON.RIGHT}px;
            width: ${MOBILE_CONTROLS.BUTTON_SIZE}px;
            height: ${MOBILE_CONTROLS.BUTTON_SIZE}px;
            border-radius: 50%;
            background-color: ${MOBILE_CONTROLS.COLORS.BUTTON_BG};
            color: ${MOBILE_CONTROLS.COLORS.BUTTON_TEXT};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            opacity: ${MOBILE_CONTROLS.OPACITY};
            border: 2px solid rgba(255, 255, 255, 0.3);
            z-index: 1000;
            pointer-events: auto;
            user-select: none;
            touch-action: none;
            transition: all 0.2s ease;
        `;
    container.appendChild(this.jumpButton);
    container.appendChild(this.boostButton);
  }

  /**
   * Sets up touch event listeners
   * @param canvas The canvas element
   */
  static setupTouchEventListeners(canvas) {
    if (this.joystickContainer) {
      this.joystickContainer.addEventListener(
        "touchstart",
        this.handleJoystickTouchStart.bind(this),
        { passive: false }
      );
      this.joystickContainer.addEventListener(
        "touchmove",
        this.handleJoystickTouchMove.bind(this),
        { passive: false }
      );
      this.joystickContainer.addEventListener(
        "touchend",
        this.handleJoystickTouchEnd.bind(this),
        { passive: false }
      );
      this.joystickContainer.addEventListener(
        "touchcancel",
        this.handleJoystickTouchEnd.bind(this),
        { passive: false }
      );
      this.joystickContainer.addEventListener(
        "pointerdown",
        this.handleJoystickTouchStart.bind(this),
        { passive: false }
      );
      this.joystickContainer.addEventListener(
        "pointermove",
        this.handleJoystickTouchMove.bind(this),
        { passive: false }
      );
      this.joystickContainer.addEventListener(
        "pointerup",
        this.handleJoystickTouchEnd.bind(this),
        { passive: false }
      );
      this.joystickContainer.addEventListener(
        "mouseup",
        this.handleJoystickTouchEnd.bind(this),
        { passive: false }
      );
    }

    if (this.jumpButton) {
      this.jumpButton.addEventListener(
        "touchstart",
        this.handleJumpTouchStart.bind(this),
        { passive: false }
      );
      this.jumpButton.addEventListener(
        "touchend",
        this.handleJumpTouchEnd.bind(this),
        { passive: false }
      );
      this.jumpButton.addEventListener(
        "touchcancel",
        this.handleJumpTouchEnd.bind(this),
        { passive: false }
      );
      this.jumpButton.addEventListener(
        "pointerdown",
        this.handleJumpTouchStart.bind(this),
        { passive: false }
      );
      this.jumpButton.addEventListener(
        "pointerup",
        this.handleJumpTouchEnd.bind(this),
        { passive: false }
      );
      this.jumpButton.addEventListener(
        "mouseup",
        this.handleJumpTouchEnd.bind(this),
        { passive: false }
      );
    }

    if (this.boostButton) {
      this.boostButton.addEventListener(
        "touchstart",
        this.handleBoostTouchStart.bind(this),
        { passive: false }
      );
      this.boostButton.addEventListener(
        "touchend",
        this.handleBoostTouchEnd.bind(this),
        { passive: false }
      );
      this.boostButton.addEventListener(
        "touchcancel",
        this.handleBoostTouchEnd.bind(this),
        { passive: false }
      );
      this.boostButton.addEventListener(
        "pointerdown",
        this.handleBoostTouchStart.bind(this),
        { passive: false }
      );
      this.boostButton.addEventListener(
        "pointerup",
        this.handleBoostTouchEnd.bind(this),
        { passive: false }
      );
      this.boostButton.addEventListener(
        "mouseup",
        this.handleBoostTouchEnd.bind(this),
        { passive: false }
      );
    }

    document.addEventListener(
      "touchend",
      this.handleGlobalTouchEnd.bind(this),
      { passive: false }
    );
    document.addEventListener(
      "touchcancel",
      this.handleGlobalTouchEnd.bind(this),
      { passive: false }
    );
    document.addEventListener(
      "pointerup",
      this.handleGlobalTouchEnd.bind(this),
      { passive: false }
    );
    document.addEventListener("mouseup", this.handleGlobalTouchEnd.bind(this), {
      passive: false,
    });

    if (this.boostButton) {
      const boostArea = this.boostButton.parentElement;
      if (boostArea) {
        boostArea.addEventListener(
          "touchend",
          this.handleBoostTouchEnd.bind(this),
          { passive: false }
        );
        boostArea.addEventListener(
          "touchcancel",
          this.handleBoostTouchEnd.bind(this),
          { passive: false }
        );
        boostArea.addEventListener(
          "pointerup",
          this.handleBoostTouchEnd.bind(this),
          { passive: false }
        );
        boostArea.addEventListener(
          "mouseup",
          this.handleBoostTouchEnd.bind(this),
          { passive: false }
        );
      }
    }
  }

  /**
   * Handles joystick touch/pointer start
   * @param e Touch or Pointer event
   */
  static handleJoystickTouchStart(e) {
    e.preventDefault();
    if ("touches" in e && e.touches.length > 0) {
      this.joystickActive = true;
      this.joystickTouchId = e.touches[0].identifier;
      this.updateJoystickPosition(e.touches[0]);
    } else if ("pointerId" in e) {
      this.joystickActive = true;
      this.joystickTouchId = e.pointerId;
      this.updateJoystickPositionFromPointer(e);
    }
  }

  /**
   * Handles joystick touch/pointer move
   * @param e Touch or Pointer event
   */
  static handleJoystickTouchMove(e) {
    e.preventDefault();
    if (!this.joystickActive) return;

    if ("touches" in e) {
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.joystickTouchId) {
          this.updateJoystickPosition(e.touches[i]);
          break;
        }
      }
    } else if ("pointerId" in e && e.pointerId === this.joystickTouchId) {
      this.updateJoystickPositionFromPointer(e);
    }
  }

  /**
   * Handles joystick touch/pointer end
   * @param e Touch or Pointer event
   */
  static handleJoystickTouchEnd(e) {
    e.preventDefault();
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.resetJoystick();
    this.inputDirection.set(0, 0, 0);
  }

  /**
   * Updates joystick position and calculates input direction
   * @param touch Touch object
   */
  static updateJoystickPosition(touch) {
    if (!this.joystickStick || !this.joystickContainer) return;

    this.updateJoystickCenterPosition();
    const rect = this.joystickContainer.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    const deltaX = touchX - centerX;
    const deltaY = touchY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < MOBILE_CONTROLS.JOYSTICK_DEADZONE) {
      this.resetJoystick();
      return;
    }

    const maxDistance = MOBILE_CONTROLS.JOYSTICK_RADIUS - 15;
    const clampedDistance = Math.min(distance, maxDistance);

    const normalizedX = deltaX / distance;
    const normalizedY = deltaY / distance;

    const stickX = normalizedX * clampedDistance;
    const stickY = normalizedY * clampedDistance;
    this.joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

    this.inputDirection.x = normalizedX;
    this.inputDirection.z = -normalizedY;
  }

  /**
   * Updates joystick position based on pointer event
   * @param e Pointer event
   */
  static updateJoystickPositionFromPointer(e) {
    if (!this.joystickStick || !this.joystickContainer) return;

    this.updateJoystickCenterPosition();
    const rect = this.joystickContainer.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;
    const deltaX = touchX - centerX;
    const deltaY = touchY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < MOBILE_CONTROLS.JOYSTICK_DEADZONE) {
      this.resetJoystick();
      return;
    }

    const maxDistance = MOBILE_CONTROLS.JOYSTICK_RADIUS - 15;
    const clampedDistance = Math.min(distance, maxDistance);

    const normalizedX = deltaX / distance;
    const normalizedY = deltaY / distance;

    const stickX = normalizedX * clampedDistance;
    const stickY = normalizedY * clampedDistance;
    this.joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

    this.inputDirection.x = normalizedX;
    this.inputDirection.z = -normalizedY;
  }

  /**
   * Updates joystick center position based on current element position
   */
  static updateJoystickCenterPosition() {
    if (!this.joystickContainer) return;
    const rect = this.joystickContainer.getBoundingClientRect();
    this.joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  /**
   * Resets joystick to center position
   */
  static resetJoystick() {
    if (this.joystickStick) {
      this.joystickStick.style.transform = "translate(-50%, -50%)";
    }
    this.inputDirection.set(0, 0, 0);
  }

  /**
   * Handles jump button touch/pointer start
   * @param e Touch or Pointer event
   */
  static handleJumpTouchStart(e) {
    e.preventDefault();
    this.jumpActive = true;
    this.wantJump = true;
    if ("touches" in e && e.touches.length > 0) {
      this.jumpTouchId = e.touches[0].identifier;
    } else if ("pointerId" in e) {
      this.jumpTouchId = e.pointerId;
    }
    if (this.jumpButton) {
      this.jumpButton.style.backgroundColor =
        MOBILE_CONTROLS.COLORS.BUTTON_ACTIVE;
    }
  }

  /**
   * Handles jump button touch/pointer end
   * @param e Touch or Pointer event
   */
  static handleJumpTouchEnd(e) {
    e.preventDefault();
    this.jumpActive = false;
    this.wantJump = false;
    this.jumpTouchId = null;
    if (this.jumpButton) {
      this.jumpButton.style.backgroundColor = MOBILE_CONTROLS.COLORS.BUTTON_BG;
    }
    this.wantJump = false;
  }

  /**
   * Handles boost button touch/pointer start
   * @param e Touch or Pointer event
   */
  static handleBoostTouchStart(e) {
    e.preventDefault();
    this.boostActive = true;
    this.wantBoost = true;
    if ("touches" in e && e.touches.length > 0) {
      this.boostTouchId = e.touches[0].identifier;
    } else if ("pointerId" in e) {
      this.boostTouchId = e.pointerId;
    }
    if (this.boostButton) {
      this.boostButton.style.backgroundColor =
        MOBILE_CONTROLS.COLORS.BUTTON_ACTIVE;
    }
  }

  /**
   * Handles boost button touch/pointer end
   * @param e Touch or Pointer event
   */
  static handleBoostTouchEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.boostActive = false;
    this.wantBoost = false;
    this.boostTouchId = null;
    
    if (this.boostButton) {
      this.boostButton.style.backgroundColor = MOBILE_CONTROLS.COLORS.BUTTON_BG;
    }
    
    this.wantBoost = false;
    this.boostActive = false;
  }

  /**
   * Global touch/pointer end handler to catch any missed touch events
   * @param e Touch or Pointer event
   */
  static handleGlobalTouchEnd(e) {
    this.wantJump = false;
    this.wantBoost = false;
    this.boostActive = false;
    this.inputDirection.set(0, 0, 0);
  }

  /**
   * Gets the current input direction from mobile controls
   * @returns Input direction vector
   */
  static getInputDirection() {
    return this.inputDirection.clone();
  }

  /**
   * Gets whether jump is requested from mobile controls
   * @returns True if jump is requested
   */
  static getWantJump() {
    return this.wantJump;
  }

  /**
   * Gets whether boost is requested from mobile controls
   * @returns True if boost is requested
   */
  static getWantBoost() {
    return this.wantBoost;
  }

  /**
   * Checks if mobile controls are active
   * @returns True if mobile controls are being used
   */
  static isMobileActive() {
    return this.joystickActive || this.jumpActive || this.boostActive;
  }

  /**
   * Shows or hides mobile controls
   * @param visible Whether to show the controls
   */
  static setVisibility(visible) {
    if (this.joystickContainer) {
      this.joystickContainer.style.display = visible ? "block" : "none";
    }
    if (this.jumpButton) {
      this.jumpButton.style.display = visible ? "flex" : "none";
    }
    if (this.boostButton) {
      this.boostButton.style.display = visible ? "flex" : "none";
    }
  }

  static isVisible() {
    if (this.joystickContainer) {
      return this.joystickContainer.style.display !== "none";
    }
    return false;
  }

  /**
   * Updates the position of mobile controls
   * @param controlType The type of control ('joystick', 'jump', 'boost')
   * @param position The new position object with top/bottom/left/right properties
   */
  static updateControlPosition(controlType, position) {
    let element = null;
    switch (controlType) {
      case "joystick":
        element = this.joystickContainer;
        break;
      case "jump":
        element = this.jumpButton;
        break;
      case "boost":
        element = this.boostButton;
        break;
    }
    if (element) {
      if (position.top !== undefined) {
        element.style.top = `${position.top}px`;
      }
      if (position.bottom !== undefined) {
        element.style.bottom = `${position.bottom}px`;
      }
      if (position.left !== undefined) {
        element.style.left = `${position.left}px`;
      }
      if (position.right !== undefined) {
        element.style.right = `${position.right}px`;
      }
    }
  }

  /**
   * Updates the visibility of individual controls
   * @param controlType The type of control ('joystick', 'jump', 'boost')
   * @param visible Whether to show the control
   */
  static setControlVisibility(controlType, visible) {
    let element = null;
    switch (controlType) {
      case "joystick":
        element = this.joystickContainer;
        break;
      case "jump":
        element = this.jumpButton;
        break;
      case "boost":
        element = this.boostButton;
        break;
    }
    if (element) {
      element.style.display = visible
        ? controlType === "joystick"
          ? "block"
          : "flex"
        : "none";
    }
  }

  /**
   * Gets the current position of a mobile control
   * @param controlType The type of control ('joystick', 'jump', 'boost')
   * @returns The current position object
   */
  static getControlPosition(controlType) {
    let element = null;
    switch (controlType) {
      case "joystick":
        element = this.joystickContainer;
        break;
      case "jump":
        element = this.jumpButton;
        break;
      case "boost":
        element = this.boostButton;
        break;
    }
    if (element) {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: window.innerHeight - rect.bottom,
        left: rect.left,
        right: window.innerWidth - rect.right,
      };
    }
    return {};
  }

  /**
   * Resets all mobile controls to their default positions
   */
  static resetToDefaultPositions() {
    this.updateControlPosition("joystick", {
      bottom: MOBILE_CONTROLS.POSITIONS.JOYSTICK.BOTTOM,
      left: MOBILE_CONTROLS.POSITIONS.JOYSTICK.LEFT,
    });
    this.updateControlPosition("jump", {
      bottom: MOBILE_CONTROLS.POSITIONS.JUMP_BUTTON.BOTTOM,
      right: MOBILE_CONTROLS.POSITIONS.JUMP_BUTTON.RIGHT,
    });
    this.updateControlPosition("boost", {
      bottom: MOBILE_CONTROLS.POSITIONS.BOOST_BUTTON.BOTTOM,
      right: MOBILE_CONTROLS.POSITIONS.BOOST_BUTTON.RIGHT,
    });
  }

  /**
   * Applies visibility settings from the config
   */
  static applyVisibilitySettings() {
    this.setControlVisibility(
      "joystick",
      MOBILE_CONTROLS.VISIBILITY.SHOW_JOYSTICK
    );
    this.setControlVisibility(
      "jump",
      MOBILE_CONTROLS.VISIBILITY.SHOW_JUMP_BUTTON
    );
    this.setControlVisibility(
      "boost",
      MOBILE_CONTROLS.VISIBILITY.SHOW_BOOST_BUTTON
    );
  }

  /**
   * Forces a reset of all mobile control states
   * Call this if controls get stuck
   */
  static forceResetAllStates() {
    this.joystickActive = false;
    this.jumpActive = false;
    this.boostActive = false;

    this.joystickTouchId = null;
    this.jumpTouchId = null;
    this.boostTouchId = null;

    this.inputDirection.set(0, 0, 0);

    this.wantJump = false;
    this.wantBoost = false;

    this.resetJoystick();

    if (this.jumpButton) {
      this.jumpButton.style.backgroundColor = MOBILE_CONTROLS.COLORS.BUTTON_BG;
    }
    if (this.boostButton) {
      this.boostButton.style.backgroundColor = MOBILE_CONTROLS.COLORS.BUTTON_BG;
    }
  }

  /**
   * Disposes mobile input manager
   */
  static dispose() {
    document.removeEventListener(
      "touchend",
      this.handleGlobalTouchEnd.bind(this)
    );
    document.removeEventListener(
      "touchcancel",
      this.handleGlobalTouchEnd.bind(this)
    );
    this.cleanupExistingControls();
    this.isInitialized = false;
  }
}