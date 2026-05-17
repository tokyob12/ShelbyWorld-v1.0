
// --- Imports ---
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes/index";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";

// ============================================================================
// SKY MANAGER
// ============================================================================
export class SkyManager {
  static sky = null;
  static skyTexture = null;

  /**
   * Creates and applies a sky to the scene
   * @param scene The Babylon.js scene
   * @param skyConfig Configuration object for the sky
   * @returns The created sky mesh
   */
  static createSky(scene, skyConfig) {
    // Remove existing sky if present
    this.removeSky();

    // Use imported Texture
    this.skyTexture = new Texture(skyConfig.TEXTURE_URL, scene);

    if (skyConfig.BLUR > 0) {
      this.skyTexture.level = skyConfig.BLUR;
    }

    if (skyConfig.TYPE.toUpperCase() === "SPHERE") {
      this.createSkySphere(scene, skyConfig.ROTATION_Y);
    } else {
      this.createSkyBox(scene, skyConfig.ROTATION_Y);
    }

    return this.sky;
  }

  /**
   * Creates a sky sphere (360-degree sphere)
   * @param scene The Babylon.js scene
   * @param rotationY Y-axis rotation in radians
   */
  static createSkySphere(scene, rotationY) {
    // Use imported MeshBuilder
    this.sky = MeshBuilder.CreateSphere(
      "skySphere",
      {
        diameter: 1000.0,
        segments: 32,
      },
      scene
    );

    // Use imported StandardMaterial and Color3
    const skyMaterial = new StandardMaterial("skySphere", scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.diffuseTexture = this.skyTexture;
    skyMaterial.disableLighting = true;
    skyMaterial.emissiveTexture = this.skyTexture;
    skyMaterial.emissiveColor = new Color3(1, 1, 1);

    this.sky.material = skyMaterial;

    this.sky.rotation.x = Math.PI;

    if (rotationY !== 0) {
      this.sky.rotation.y = rotationY;
    }
  }

  /**
   * Creates a sky box (standard cube skybox)
   * @param scene The Babylon.js scene
   * @param rotationY Y-axis rotation in radians
   */
  static createSkyBox(scene, rotationY) {
    // Use imported Texture constant
    this.skyTexture.coordinatesMode = Texture.SKYBOX_MODE;

    // Use imported MeshBuilder
    this.sky = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);

    // Use imported StandardMaterial and Color3
    const skyMaterial = new StandardMaterial("skyBox", scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.diffuseTexture = this.skyTexture;
    skyMaterial.disableLighting = true;
    skyMaterial.emissiveTexture = this.skyTexture;
    skyMaterial.emissiveColor = new Color3(1, 1, 1);

    this.sky.material = skyMaterial;

    if (rotationY !== 0) {
      this.sky.rotation.y = rotationY;
    }
  }

  /**
   * Removes the sky from the scene
   */
  static removeSky() {
    if (this.sky) {
      this.sky.dispose();
      this.sky = null;
    }
    if (this.skyTexture) {
      this.skyTexture.dispose();
      this.skyTexture = null;
    }
  }

  /**
   * Updates the sky rotation
   * @param rotationY Y-axis rotation in radians
   */
  static setRotation(rotationY) {
    if (this.sky) {
      this.sky.rotation.y = rotationY;
    }
  }

  /**
   * Updates the sky blur
   * @param blur Blur amount (0-1)
   */
  static setBlur(blur) {
    if (this.skyTexture) {
      this.skyTexture.level = blur;
    }
  }

  /**
   * Gets the current sky mesh
   * @returns The sky mesh or null if not created
   */
  static getSky() {
    return this.sky;
  }

  /**
   * Checks if a sky exists
   * @returns True if sky exists, false otherwise
   */
  static hasSky() {
    return this.sky !== null;
  }
}