// Enhanced Custom Gravity Function with Contact Points Support
// Compatible with setCustomGravity API but adds contactPoints capability

(function () {
  // Cache reset code to ensure proper initialization
  window.store.getState().camera.playbackFollower._frames.length = 0;
  window.store.getState().simulator.engine.engine._computed._frames.length = 1;
  const currentIndex = store.getState().player.index;
  store.dispatch({ type: "SET_PLAYER_INDEX", payload: 0 });
  requestAnimationFrame(() =>
    store.dispatch({ type: "SET_PLAYER_INDEX", payload: currentIndex }),
  );
})();

// Global storage for gravity keyframes and tracking
const GRAVITY_SYSTEM = {
  iterationCounter: 0,
  keyframesByRider: [],
  FRAMES_PER_SECOND: 40,
  // Track current gravity state for each contact point of each rider
  contactPointStates: {}, // Format: { riderIndex: { contactPoint: {x, y} } }
  lastFrameIndex: -1,

  // Convert timestamp [minutes, seconds, frames] to total frames
  timestampToFrames([minutes, seconds, frames]) {
    return (
      minutes * this.FRAMES_PER_SECOND * 60 +
      seconds * this.FRAMES_PER_SECOND +
      frames
    );
  },

  // Initialize contact point states for a rider if needed
  initRiderStates(riderIndex) {
    if (!this.contactPointStates[riderIndex]) {
      this.contactPointStates[riderIndex] = {};
      // Initialize all 17 contact points with default gravity
      for (let i = 0; i < 17; i++) {
        this.contactPointStates[riderIndex][i] = { x: 0, y: 0.175 };
      }
    }
  },

  // Update gravity states based on keyframes at current frame
  updateStatesAtFrame(frameIndex) {
    // Only update if we've moved to a new frame
    if (frameIndex === this.lastFrameIndex) return;
    this.lastFrameIndex = frameIndex;

    // Check each rider's keyframes
    for (
      let riderIndex = 0;
      riderIndex < this.keyframesByRider.length;
      riderIndex++
    ) {
      this.initRiderStates(riderIndex);
      const riderKeyframes = this.keyframesByRider[riderIndex];
      if (!riderKeyframes) continue;

      // Find all keyframes that should be active by this frame
      for (const [timestamp, gravity] of riderKeyframes) {
        const keyframeFrame = this.timestampToFrames(timestamp);

        // Only process keyframes that match exactly the current frame
        // This ensures we apply changes at the right moment
        if (keyframeFrame === frameIndex) {
          if (!gravity.contactPoints || gravity.contactPoints.length === 0) {
            // No contactPoints specified or empty array - update all points
            for (let cp = 0; cp < 17; cp++) {
              this.contactPointStates[riderIndex][cp] = {
                x: gravity.x,
                y: gravity.y,
              };
            }
          } else {
            // Only update specified contact points
            for (const cp of gravity.contactPoints) {
              if (cp >= 0 && cp < 17) {
                this.contactPointStates[riderIndex][cp] = {
                  x: gravity.x,
                  y: gravity.y,
                };
              }
            }
          }
        }
      }
    }
  },

  // Get the current gravity for a specific rider and contact point
  getGravityForContact(riderIndex, contactPoint, frameIndex) {
    // Update states for current frame
    this.updateStatesAtFrame(frameIndex);

    // Initialize if needed
    this.initRiderStates(riderIndex);

    // Return the current state for this contact point
    return (
      this.contactPointStates[riderIndex][contactPoint] || { x: 0, y: 0.175 }
    );
  },
};

// Enhanced setCustomGravity function that supports contactPoints
window.setCustomGravityWithContactPoints = function (keyframes) {
  // Reset states when setting new keyframes
  GRAVITY_SYSTEM.contactPointStates = {};
  GRAVITY_SYSTEM.lastFrameIndex = -1;

  // Store and sort keyframes for each rider
  GRAVITY_SYSTEM.keyframesByRider = keyframes.map((riderKeyframes) => {
    // Sort keyframes by timestamp
    return riderKeyframes.sort((a, b) => {
      const frameA = GRAVITY_SYSTEM.timestampToFrames(a[0]);
      const frameB = GRAVITY_SYSTEM.timestampToFrames(b[0]);
      return frameA - frameB;
    });
  });

  // Initialize gravity states from frame 0
  for (let frame = 0; frame <= 0; frame++) {
    GRAVITY_SYSTEM.updateStatesAtFrame(frame);
  }

  console.log(
    "Custom gravity with contact points initialized for",
    keyframes.length,
    "riders",
  );
};

// Main gravity definition function
Object.defineProperty(window.$ENGINE_PARAMS, "gravity", {
  get() {
    // Increment iteration counter
    GRAVITY_SYSTEM.iterationCounter += 1;

    // Get current frame index
    const frameIndex =
      store.getState().simulator.engine.engine._computed._frames.length;

    // Get number of riders
    const numRiders =
      store.getState().simulator.engine.engine.state.riders.length;
    if (numRiders === 0) return { x: 0, y: 0.175 };

    // Calculate current rider and contact point
    const iterationsPerRider = 17; // 17 contact points (0-16)
    const currentRiderIndex =
      Math.floor((GRAVITY_SYSTEM.iterationCounter - 1) / iterationsPerRider) %
      numRiders;
    const currentContactPoint =
      (GRAVITY_SYSTEM.iterationCounter - 1) % iterationsPerRider;

    // Get gravity for this specific contact point
    const gravity = GRAVITY_SYSTEM.getGravityForContact(
      currentRiderIndex,
      currentContactPoint,
      frameIndex,
    );

    return gravity;
  },
});

// Convenience function that maintains backward compatibility
window.setCustomGravity = window.setCustomGravityWithContactPoints;

// Example usage:
/*
setCustomGravityWithContactPoints([
    [
        [[0, 0, 0], {x: 0, y: 0.175}], // Set all points to normal gravity
        [[0, 2, 0], {x: 0.2, y: 0, contactPoints: [0, 1, 2]}], // Only update peg, tail, nose
        [[0, 3, 0], {x: 0, y: 0.175, contactPoints: [0]}], // Only update peg (others keep their values)
    ], // Rider 0
    [
        [[0, 0, 0], {x: 0, y: 0}], // Zero gravity for all points
        [[0, 1, 0], {x: 0, y: 0.175, contactPoints: [3, 4, 5]}], // Only update specific points
        [[0, 2, 0], {x: -0.1, y: 0.2}], // Update all points
    ] // Rider 1
]);
*/


// Debug helper to inspect current gravity states
window.debugGravityStates = function () {
  console.log(
    "Current gravity states:",
    JSON.parse(JSON.stringify(GRAVITY_SYSTEM.contactPointStates)),
  );
};
