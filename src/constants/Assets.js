
// --- Imports ---
import { Vector3 } from "@babylonjs/core/Maths/math.vector";


const SHELBY_URLS = {
    meebit: "https://shelby.shelbynet.staging.shelby.xyz/shelby/v1/blobs/0x236f14622de45f2f2246df2a0736d6ccbbbbbd23e4c7570ad3378cfdfaa589d5/model/Meebit.glb",
    environment: "https://shelby.shelbynet.staging.shelby.xyz/shelby/v1/blobs/0x236f14622de45f2f2246df2a0736d6ccbbbbbd23e4c7570ad3378cfdfaa589d5/model/test33.glb",
    key: "https://shelby.shelbynet.staging.shelby.xyz/shelby/v1/blobs/0x236f14622de45f2f2246df2a0736d6ccbbbbbd23e4c7570ad3378cfdfaa589d5/model/key.glb",
    crateAndKey: "https://shelby.shelbynet.staging.shelby.xyz/shelby/v1/blobs/0x236f14622de45f2f2246df2a0736d6ccbbbbbd23e4c7570ad3378cfdfaa589d5/model/logo.glb",
    sky: "https://shelby.shelbynet.staging.shelby.xyz/shelby/v1/blobs/0x236f14622de45f2f2246df2a0736d6ccbbbbbd23e4c7570ad3378cfdfaa589d5/model/sky1.hdr"
};

export const ASSETS = {
  CHARACTERS: [
    {
      name: "Meebit",
      model: SHELBY_URLS.meebit, // Parcel-resolved path
      animations: {
        idle: "idle",
        walk: "run",
        jump: "jump",
      },
      scale: 1.3,
      mass: 1,
      height: 1.8,
      radius: 0.6,
      speed: {
        inAir: 15.0,
        onGround: 14.0,       // Faster base walking speed
        boostMultiplier: 2.2, // Balanced sprint (14 * 2.2 = ~30 speed)
      },
      jumpHeight: 4.5,        // Slightly higher jump
      rotationSpeed: 0.02,    // Much snappier turning (was 0.01)
      rotationSmoothing: 0.3, // Smooths out the fast turns
      animationBlend: 150,    // Faster animation blending
      jumpDelay: 100,
    },
  ],
  ENVIRONMENTS: [
    {
      name: "Shelby Quest City",
      model: SHELBY_URLS.environment, // Parcel-resolved path
      lightmap: "",
      scale: 1.5,
      lightmappedMeshes: [],
      physicsObjects: [],
      sky: {
        TEXTURE_URL: SHELBY_URLS.sky, // Parcel-resolved path
        ROTATION_Y: 0,
        BLUR: 0,
        TYPE: "SPHERE",
      },
      spawnPoint: new Vector3(0, 1, 0),
      particles: [
        {
          name: "Magic Sparkles",
          position: new Vector3(-18, 0, -8),
          updateSpeed: 0.007,
        },
        {
          name: "Magic Sparkles",
          position: new Vector3(-4, 2, 50),
          updateSpeed: 0.007,
        },
      ],

      items: [
        {
          name: "Crate",
          url: SHELBY_URLS.crateAndKey, // Parcel-resolved path
          collectible: true,
          creditValue: 100,
          minImpulseForCollection: 0.3,
          instances: [
            {
              position: new Vector3(24, 1, 6),
              scale: 1.2,
              rotation: new Vector3(0, 0, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(44, 1, -7),
              scale: 1.2,
              rotation: new Vector3(0, 0, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(-0.7, 1.5, 33),
              scale: 1.2,
              rotation: new Vector3(0, 20, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(0, 2, -60),
              scale: 1.2,
              rotation: new Vector3(0, 23, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(-22, 1.3, -4.1),
              scale: 0.5,
              rotation: new Vector3(0, 0, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(-5.26, 3.49, 1.39),
              scale: 0.5,
              rotation: new Vector3(0, 0, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(8.09, 6.67, -6.61),
              scale: 0.5,
              rotation: new Vector3(0, 0, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(55.93, 0.32, -2.86),
              scale: 0.5,
              rotation: new Vector3(0, 0, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(60.72, 0.32, -16.23),
              scale: 0.5,
              rotation: new Vector3(0, 0, 0),
              mass: 0.5,
            },
            {
              position: new Vector3(7.86, 6.67, -39.55),
              scale: 0.5,
              rotation: new Vector3(0, 0, 0),
              mass: 0.5,
            },
          ],
        },
         {
          name: "Shelby_Key", 
          url: SHELBY_URLS.key,
          collectible: true,
          creditValue: 500,
          minImpulseForCollection: 0.5,
          mass: 0.1,
          // CRITICAL FIX: The key MUST start in an inaccessible location (e.g., far below)
          instances: [
            {
              // The initial position (hidden)
              position: new Vector3(0, -100, 8), // <--- Hidden below the map
              scale: 1.0,
              rotation: new Vector3(0, 0, 0),
              mass: 0.1,
              // NEW: Define the final visible target location
              targetPosition: new Vector3(0, 1, 8), // <--- VISIBLE LOCATION
            },
          ],
        },

      ],
    },
  ],
};
