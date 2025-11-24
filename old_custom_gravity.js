// Custom Gravity Function with Multirider and Contact-Specific Support
// This script handles multiple riders and applies different gravity values to specific contact points

// Cache reset code to ensure proper initialization
(function () {
  window.store.getState().camera.playbackFollower._frames.length = 0;
  window.store.getState().simulator.engine.engine._computed._frames.length = 1;
  const currentIndex = store.getState().player.index;
  store.dispatch({ type: "SET_PLAYER_INDEX", payload: 0 });
  requestAnimationFrame(() =>
    store.dispatch({ type: "SET_PLAYER_INDEX", payload: currentIndex }),
  );
})();

// Global variables for tracking iteration and storing gravity configurations
const GRAVITY_CONSTANTS = {
  iterationCounter: 0,
  // Define gravity configurations per rider
  // Each rider can have a default gravity and contact-specific overrides
  riderConfigs: {
    1: {
      default: { x: 0, y: 0.175 },
      // Contact-specific gravity (0-17 contact points)
      contacts: {
        0: { x: 0, y: 0.2 }, // Peg
        1: { x: 0, y: 0.15 }, // Tail
        2: { x: 0, y: 0.15 }, // Nose
        // Add more contact points as needed (3-17)
      },
    },
    2: {
      default: { x: 0, y: 0 },
      contacts: {
        0: { x: 0.1, y: 0 },
        1: { x: -0.1, y: 0 },
        2: { x: 0, y: -0.1 },
      },
    },
    // Add more rider configurations as needed
  },
};

// Main gravity definition function
Object.defineProperty(window.$ENGINE_PARAMS, "gravity", {
  get() {
    // Increment iteration counter
    GRAVITY_CONSTANTS.iterationCounter += 1;

    // Get number of riders and calculate current rider
    const numRiders =
      store.getState().simulator.engine.engine.state.riders.length;
    const iterationsPerRider = 17; // 17 contact points (0-16)
    const currentRiderIndex =
      Math.floor(
        (GRAVITY_CONSTANTS.iterationCounter - 1) / iterationsPerRider,
      ) % numRiders;
    const currentRider = currentRiderIndex + 1; // Convert to 1-based index

    // Calculate current contact point being processed (0-16)
    const currentContactPoint =
      (GRAVITY_CONSTANTS.iterationCounter - 1) % iterationsPerRider;

    // Get rider configuration
    const riderConfig = GRAVITY_CONSTANTS.riderConfigs[currentRider];

    // If no config exists for this rider, use default gravity
    if (!riderConfig) {
      return { x: 0, y: 0.175 };
    }

    // Check if there's a specific gravity for this contact point
    if (riderConfig.contacts && riderConfig.contacts[currentContactPoint]) {
      const contactGravity = riderConfig.contacts[currentContactPoint];
      // Return gravity with contactPoints array indicating which point this applies to
      return {
        x: contactGravity.x,
        y: contactGravity.y,
        contactPoints: [currentContactPoint],
      };
    }

    // Return default gravity for this rider
    return {
      x: riderConfig.default.x,
      y: riderConfig.default.y,
      contactPoints: [], // Empty array means apply to all points
    };
  },
});

// Optional: Function to dynamically update gravity configurations
function updateRiderGravity(riderNumber, contactPoint, gravityVector) {
  if (!GRAVITY_CONSTANTS.riderConfigs[riderNumber]) {
    GRAVITY_CONSTANTS.riderConfigs[riderNumber] = {
      default: { x: 0, y: 0.175 },
      contacts: {},
    };
  }

  if (contactPoint === "default") {
    GRAVITY_CONSTANTS.riderConfigs[riderNumber].default = gravityVector;
  } else {
    if (!GRAVITY_CONSTANTS.riderConfigs[riderNumber].contacts) {
      GRAVITY_CONSTANTS.riderConfigs[riderNumber].contacts = {};
    }
    GRAVITY_CONSTANTS.riderConfigs[riderNumber].contacts[contactPoint] =
      gravityVector;
  }
}

// Optional: Function to apply gravity based on frame index
function applyGravityAtFrame(
  frameIndex,
  riderNumber,
  contactPoint,
  gravityVector,
) {
  const index =
    store.getState().simulator.engine.engine._computed._frames.length;
  if (index === frameIndex) {
    updateRiderGravity(riderNumber, contactPoint, gravityVector);
  }
}

// Example usage:
// updateRiderGravity(1, 0, {x: 0.2, y: 0.1}); // Update rider 1's peg gravity
// updateRiderGravity(2, 'default', {x: 0, y: 0.2}); // Update rider 2's default gravity
