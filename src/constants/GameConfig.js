
// --- Imports ---
import { Vector3 } from "@babylonjs/core/Maths/math.vector"; 

// --- Parcel Asset Imports (for sound URL) ---
import ThrusterSound from "../assets/sound/assets_sounds_effects_thruster.m4a"; 
// NOTE: Use .mp3 if the .m4a file is giving decoding errors

// ============================================================================
// Environment Types
// ============================================================================
export const OBJECT_ROLE = {
  DYNAMIC_BOX: "DYNAMIC_BOX",
  PIVOT_BEAM: "PIVOT_BEAM",
};

// ============================================================================
// Character States
// ============================================================================
export const CHARACTER_STATES = {
  IN_AIR: "IN_AIR",
  ON_GROUND: "ON_GROUND",
  START_JUMP: "START_JUMP",
};

// ============================================================================
// Configuration Constants
// ============================================================================
export const CONFIG = {
  // Camera Settings
  CAMERA: {
    START_POSITION: new Vector3(0, 5, -10),
    OFFSET: new Vector3(0, 2.8, -6.5), // HIGHER (2.8) and FURTHER BACK (-6.5)
    DRAG_SENSITIVITY: 0.015, // Smoother mouse look
    ZOOM_MIN: -15,
    ZOOM_MAX: -3,
    FOLLOW_SMOOTHING: 0.15,
  },
  // Physics Settings
  PHYSICS: {
    GRAVITY: new Vector3(0, -9.8, 0),
    CHARACTER_GRAVITY: new Vector3(0, -18, 0),
  },
  
  // Animation Settings
  ANIMATION: {
    PLAYER_SCALE: 0.7,
    PLAYER_Y_OFFSET: -0.9,
  },
  
  // Debug Settings
  DEBUG: {
    CAPSULE_VISIBLE: false,
  },
  
  // Effects Settings
  EFFECTS: {
    PARTICLE_SNIPPETS: [
      {
        name: "Fire Trail",
        description: "Realistic fire particle system with heat distortion",
        category: "fire",
        snippetId: "HYB2FR",
      },
      {
        name: "Magic Sparkles",
        description: "Enchanting sparkle effect with rainbow colors",
        category: "magic",
        snippetId: "T54JV7",
      },
      {
        name: "Dust Storm",
        description: "Atmospheric dust particles with wind effect",
        category: "nature",
        snippetId: "X8Y9Z1",
      },
      {
        name: "Energy Field",
        description: "Sci-fi energy field with electric arcs",
        category: "tech",
        snippetId: "A2B3C4",
      },
      {
        name: "Stardust",
        description: "Cosmic stardust with twinkling effect",
        category: "cosmic",
        snippetId: "D5E6F7",
      },
      {
        name: "Smoke Trail",
        description: "Realistic smoke with fade effect",
        category: "nature",
        snippetId: "G8H9I0",
      },
      {
        name: "Portal Effect",
        description: "Mystical portal with swirling particles",
        category: "magic",
        snippetId: "J1K2L3",
      },
      {
        name: "Laser Beam",
        description: "Sci-fi laser beam with energy core",
        category: "tech",
        snippetId: "M4N5O6",
      },
      {
        name: "Nebula Cloud",
        description: "Cosmic nebula with colorful gas clouds",
        category: "cosmic",
        snippetId: "P7Q8R9",
      },
      {
        name: "Explosion",
        description: "Dramatic explosion with debris",
        category: "fire",
        snippetId: "S0T1U2",
      },
    ],
    DEFAULT_PARTICLE: "Magic Sparkles",
    AUTO_SPAWN: true,
    SOUND_EFFECTS: [
      {
        name: "Thruster",
        url: ThrusterSound, // Parcel-resolved path
        volume: 0.6,
        loop: true,
      },
    ],
  },
  
  // HUD Settings
  HUD: {
    POSITION: "top",
    FONT_FAMILY: "'Segoe UI', 'Roboto', 'Arial', sans-serif",
    PRIMARY_COLOR: "#ffffff",
    SECONDARY_COLOR: "#cccccc",
    HIGHLIGHT_COLOR: "#00E5FF",
    BACKGROUND_COLOR: "#000000",
    BACKGROUND_OPACITY: 0.7,
    PADDING: 15,
    BORDER_RADIUS: 8,
    SHOW_COORDINATES: true,
    SHOW_TIME: true,
    SHOW_FPS: true,
    SHOW_STATE: true,
    SHOW_BOOST_STATUS: true,
    SHOW_CREDITS: true,
    UPDATE_INTERVAL: 100,
    MOBILE: {
      SHOW_COORDINATES: false,
      SHOW_TIME: false,
      SHOW_FPS: false,
      SHOW_STATE: true,
      SHOW_BOOST_STATUS: true,
      SHOW_CREDITS: true,
    },
  },
  
  // Settings Panel Configuration
  SETTINGS: {
    HEADING_TEXT: "Settings",
    PANEL_WIDTH_RATIO: 1 / 3,
    FULL_SCREEN_THRESHOLD: 500,
    Z_INDEX: 1800,
    BUTTON_Z_INDEX: 2000,
    SECTIONS: [
      {
        title: "Screen Controls",
        uiElement: "toggle",
        visibility: "iPadWithKeyboard",
        defaultValue: true,
        onChange: (value) => {
          // NOTE: MobileInputManager is passed in SettingsUI.js
        },
      },
      {
        title: "Character",
        uiElement: "dropdown",
        visibility: "all",
        defaultValue: "Meebit",
        options: ["Meebit"], 
        onChange: async (value) => {
          // NOTE: SettingsUI.changeCharacter is called in SettingsUI.js
        },
      },
      {
        title: "Environment",
        uiElement: "dropdown",
        visibility: "all",
        defaultValue: "Shelby Quest City",
        options: ["Shelby Quest City"],
        onChange: async (value) => {
          // NOTE: SettingsUI.changeEnvironment is called in SettingsUI.js
        },
      },
    ],
  },
  
  // Inventory Configuration
  INVENTORY: {
    HEADING_TEXT: "Inventory",
    PANEL_WIDTH_RATIO: 0.25, 
    FULL_SCREEN_THRESHOLD: 500,
    Z_INDEX: 1800,
    BUTTON_Z_INDEX: 2000,
    TILES: [],
  },
};

// ============================================================================
// Input Mapping
// ============================================================================
export const INPUT_KEYS = {
  FORWARD: ["w", "arrowup"],
  BACKWARD: ["s", "arrowdown"],
  LEFT: ["a", "arrowleft"],
  RIGHT: ["d", "arrowright"],
  STRAFE_LEFT: ["q"],
  STRAFE_RIGHT: ["e"],
  JUMP: [" "],
  BOOST: ["shift"],
  DEBUG: ["0"],
  HUD_TOGGLE: ["h"],
  HUD_POSITION: ["p"],
  RESET_CAMERA: ["1"],
};

// ============================================================================
// Mobile Touch Controls Configuration
// ============================================================================
export const MOBILE_CONTROLS = {
  JOYSTICK_RADIUS: 60,
  JOYSTICK_DEADZONE: 10,
  BUTTON_SIZE: 80,
  BUTTON_SPACING: 20,
  OPACITY: 0.7,
  COLORS: {
    JOYSTICK_BG: "#333333",
    JOYSTICK_STICK: "#ffffff",
    BUTTON_BG: "#444444",
    BUTTON_ACTIVE: "#00E5FF",
    BUTTON_TEXT: "#ffffff",
  },
  POSITIONS: {
    JOYSTICK: {
      BOTTOM: 120,
      LEFT: 0,
    },
    JUMP_BUTTON: {
      BOTTOM: 220,
      RIGHT: 0,
    },
    BOOST_BUTTON: {
      BOTTOM: 120,
      RIGHT: 0,
    },
  },
  VISIBILITY: {
    SHOW_JOYSTICK: true,
    SHOW_JUMP_BUTTON: true,
    SHOW_BOOST_BUTTON: true,
  },
};
