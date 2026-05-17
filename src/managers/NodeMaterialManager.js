// --- Imports ---
import * as BABYLON from "@babylonjs/core/Legacy/legacy";
import { NodeMaterial } from "@babylonjs/core/Materials/Node/nodeMaterial";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

// ============================================================================
// NODE MATERIAL MANAGER
// ============================================================================
export class NodeMaterialManager {
  static scene = null;
  static activeNodeMaterials = new Map();

  /**
   * Initializes the NodeMaterialManager with a scene
   * @param scene The Babylon.js scene
   */
  static initialize(scene) {
    this.scene = scene;
  }

  /**
   * Processes all meshes in the scene to look for #nmSnippetId patterns
   * and applies node materials accordingly
   */
  static async processMeshesForNodeMaterials() {
    if (!this.scene) {
      console.warn(
        "NodeMaterialManager not initialized. Call initialize() first."
      );
      return;
    }

    const meshes = this.scene.meshes;
    for (const mesh of meshes) {
      if (mesh instanceof BABYLON.Mesh) {
        await this.processMeshForNodeMaterial(mesh);
      }
    }
  }

  /**
   * Processes a specific mesh to check for #nmSnippetId pattern and apply node material
   * @param mesh The mesh to process
   */
  static async processMeshForNodeMaterial(mesh) {
    if (!this.scene) {
      console.warn(
        "NodeMaterialManager not initialized. Call initialize() first."
      );
      return;
    }

    // Check if mesh name contains #nm pattern
    const nmMatch = mesh.name.match(/#nm([A-Z0-9]+)/);
    if (!nmMatch) {
      return; // No node material snippet ID found
    }

    const snippetId = nmMatch[1];
    const meshName = mesh.name;

    try {
      // Check if we already have this node material cached
      let nodeMaterial = this.activeNodeMaterials.get(snippetId);

      if (!nodeMaterial) {
        // Parse the node material from the snippet only if not cached
        // Use imported NodeMaterial
        nodeMaterial = await NodeMaterial.ParseFromSnippetAsync(
          snippetId,
          this.scene
        );

        if (nodeMaterial) {
          // Store the node material for reuse
          this.activeNodeMaterials.set(snippetId, nodeMaterial);
          
          // Ensure node material is compiled
          if (!nodeMaterial.isCompiled) {
              nodeMaterial.build(false);
          }
        }
      }

      if (nodeMaterial) {
        // Apply the node material to the mesh
        mesh.material = nodeMaterial;
      } else {
        console.warn(
          `Failed to parse node material from snippet "${snippetId}" for mesh "${meshName}"`
        );
      }
    } catch (error) {
      console.error(
        `Failed to apply node material "${snippetId}" to mesh "${meshName}":`,
        error
      );
    }
  }

  /**
   * Processes meshes from a model import result
   * @param result The result from ImportMeshAsync
   */
  static async processImportResult(result) {
    if (!this.scene) {
      console.warn(
        "NodeMaterialManager not initialized. Call initialize() first."
      );
      return;
    }

    if (result.meshes) {
      for (const mesh of result.meshes) {
        // Ensure we are only processing meshes (or sub-classes that can have materials)
        if (mesh instanceof AbstractMesh) {
          await this.processMeshForNodeMaterial(mesh);
        }
      }
    }
  }

  /**
   * Gets a cached node material by snippet ID
   * @param snippetId The snippet ID
   * @returns The cached node material or null if not found
   */
  static getCachedNodeMaterial(snippetId) {
    return this.activeNodeMaterials.get(snippetId) || null;
  }

  /**
   * Clears all cached node materials
   */
  static clearCachedNodeMaterials() {
    this.activeNodeMaterials.clear();
  }

  /**
   * Gets all active node materials
   * @returns Map of snippet IDs to node materials
   */
  static getActiveNodeMaterials() {
    return new Map(this.activeNodeMaterials);
  }

  /**
   * Disposes all node materials and clears the manager
   */
  static dispose() {
    this.activeNodeMaterials.forEach((nodeMaterial) => {
      nodeMaterial.dispose();
    });
    this.activeNodeMaterials.clear();
    this.scene = null;
  }
}