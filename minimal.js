(() => {
  // ==== PART 1: CONTACT POINTS DEFINITIONS ====
  const ContactPoints = {
    PEG: 0,
    TAIL: 1,
    NOSE: 2,
    STRING: 3,
    BUTT: 4,
    SHOULDER: 5,
    RHAND: 6,
    LHAND: 7,
    LFOOT: 8,
    RFOOT: 9,
    SCARF_0: 10,
    SCARF_1: 11,
    SCARF_2: 12,
    SCARF_3: 13,
    SCARF_4: 14,
    SCARF_5: 15,
    SCARF_6: 16,
  };
  const sled = [0, 1, 2, 3];
  const scarf = [10, 11, 12, 13, 14, 15, 16];
  const notScarf = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const rider = [4, 5, 6, 7, 8, 9]; // Body parts only
  const all = [...Array(17).keys()]; // All contact points (0-16)

  // Create a PointGroups object for easy access to point groups
  const PointGroups = {
    ALL: all,
    SLED: sled,
    RIDER: rider,
    SCARF: scarf,
  };

  const defaultPointOffsets = {
    // Sled points
    [ContactPoints.PEG]: { x: 0, y: 0 },
    [ContactPoints.TAIL]: { x: 0, y: 5 },
    [ContactPoints.NOSE]: { x: 15, y: 5 },
    [ContactPoints.STRING]: { x: 17.5, y: 0 },

    // Rider points
    [ContactPoints.BUTT]: { x: 5, y: 0 },
    [ContactPoints.SHOULDER]: { x: 5, y: -5.5 },
    [ContactPoints.RHAND]: { x: 11.5, y: -5 },
    [ContactPoints.LHAND]: { x: 11.5, y: -5 },
    [ContactPoints.LFOOT]: { x: 10, y: 5 },
    [ContactPoints.RFOOT]: { x: 10, y: 5 },

    // Scarf points
    [ContactPoints.SCARF_0]: { x: 3, y: -5.5 },
    [ContactPoints.SCARF_1]: { x: 1, y: -5.5 },
    [ContactPoints.SCARF_2]: { x: -1, y: -5.5 },
    [ContactPoints.SCARF_3]: { x: -3, y: -5.5 },
    [ContactPoints.SCARF_4]: { x: -5, y: -5.5 },
    [ContactPoints.SCARF_5]: { x: -7, y: -5.5 },
    [ContactPoints.SCARF_6]: { x: -9, y: -5.5 },
  };

  const kramualPointOffsets = {
    // Sled points
    [ContactPoints.PEG]: { x: 0, y: 0 },
    [ContactPoints.TAIL]: { x: -0.48, y: 0 },
    [ContactPoints.NOSE]: { x: 16.9, y: 0 },
    [ContactPoints.STRING]: { x: 20.7, y: 0 },

    // Rider points
    [ContactPoints.BUTT]: { x: 4.85, y: 0 },
    [ContactPoints.SHOULDER]: { x: 6.42, y: 0 },
    [ContactPoints.RHAND]: { x: 13.11, y: 0 },
    [ContactPoints.LHAND]: { x: 12.61, y: 0 },
    [ContactPoints.LFOOT]: { x: 12.57, y: 0 },
    [ContactPoints.RFOOT]: { x: 12.24, y: 0 },

    // Scarf points
    [ContactPoints.SCARF_0]: { x: 8.42, y: 0.02 },
    [ContactPoints.SCARF_1]: { x: 10.42, y: -0.02 },
    [ContactPoints.SCARF_2]: { x: 12.42, y: 0.01 },
    [ContactPoints.SCARF_3]: { x: 14.42, y: 0.06 },
    [ContactPoints.SCARF_4]: { x: 16.42, y: 0.05 },
    [ContactPoints.SCARF_5]: { x: 18.42, y: 0 },
    [ContactPoints.SCARF_6]: { x: 20.42, y: -0.01 },
  };

  // Define a Shapes object to store different predefined shapes
  const Shapes = {
    DEFAULT: defaultPointOffsets,
    KRAMUAL: kramualPointOffsets,
    // Add other shapes like STANDING, CROUCHING, etc. in the future
  };

  // Define velocity modes as constants
  const VelocityMode = {
    RESET: "reset",
    MAINTAIN: "maintain",
    ADOPT_TARGET: "adopt-target",
  };

  function getOffsetsRelativeTo(referencePoint) {
    const ref = defaultPointOffsets[referencePoint];
    if (!ref)
      throw new Error("Invalid reference contact point: " + referencePoint);

    const result = {};

    for (const cp in defaultPointOffsets) {
      const p = defaultPointOffsets[cp];
      result[cp] = {
        x: p.x - ref.x,
        y: p.y - ref.y,
      };
    }

    return result;
  }

  // ==== PART 2: CACHE RESET ====
  window.store.getState().camera.playbackFollower._frames.length = 0;
  window.store.getState().simulator.engine.engine._computed._frames.length = 1;
  const currentIndex = store.getState().player.index;
  store.dispatch({ type: "SET_PLAYER_INDEX", payload: 0 });
  requestAnimationFrame(() =>
    store.dispatch({ type: "SET_PLAYER_INDEX", payload: currentIndex }),
  );

  // ==== PART 4: GRAVITY MANAGER CONSTANTS AND UTILITIES ====
  console.log("Initializing improved gravity system...");
  const globalStartGravity = { x: 0, y: 0.15 };
  const FRAMES_PER_SECOND = 40;
  const playbackSpeed = 1.04;
  const trueFPB = 40 / playbackSpeed;

  function framesToTimestamp(frames) {
    const minutes = Math.floor(frames / (FRAMES_PER_SECOND * 60));
    const seconds = Math.floor(frames / FRAMES_PER_SECOND) % 60;
    const remainingFrames = Math.floor(frames % FRAMES_PER_SECOND);
    return [minutes, seconds, remainingFrames];
  }

  function timestampToFrames([minutes, seconds, remainingFrames]) {
    return (
      minutes * FRAMES_PER_SECOND * 60 +
      seconds * FRAMES_PER_SECOND +
      remainingFrames
    );
  }

  // ==== PART 5: RIDER CLASS ====
  class Rider {
    constructor(
      id,
      startPosition = { x: 0, y: 0 },
      startVelocity = { x: 0, y: 0 },
      remountable = true,
      startAngle = 0,
      defaultGravity = globalStartGravity,
    ) {
      this.id = id;
      this.startPosition = startPosition;
      this.startVelocity = startVelocity;
      this.remountable = remountable;
      this.startAngle = startAngle;
      this.defaultGravity = defaultGravity;
      this.gravityKeyframes = [];
    }

    addGravityKeyframes(keyframes) {
      this.gravityKeyframes.push(...keyframes);
      this.gravityKeyframes.sort((a, b) => a[0] - b[0]);
    }

    getGravityKeyframes() {
      return this.gravityKeyframes.map(([frames, accel]) => [
        framesToTimestamp(frames),
        accel,
      ]);
    }

    copy() {
      const newRider = new Rider(
        this.id,
        { ...this.startPosition },
        { ...this.startVelocity },
        this.remountable,
        this.startAngle,
        { ...this.defaultGravity },
      );
      newRider.gravityKeyframes = [...this.gravityKeyframes];
      return newRider;
    }
  }

  // ==== PART 6: GRAVITY UTILITY FUNCTIONS ====
  function applyGravity(
    riders,
    baseTimestamp,
    keyframeFn,
    intervalFn = (i) => 0,
  ) {
    if (!riders) throw new Error("riders is required");
    if (!Array.isArray(riders)) riders = [riders];
    if (!Array.isArray(baseTimestamp))
      throw new Error(
        "baseTimestamp must be an array [minutes, seconds, frames]",
      );

    const timeAsFrames = timestampToFrames(baseTimestamp);

    riders.forEach((rider, i) => {
      const t = timeAsFrames + intervalFn(i);
      rider.addGravityKeyframes(keyframeFn(t, rider.defaultGravity));
    });
  }

  function generateRiderArray(originalRider, count, modifiers = {}) {
    if (!originalRider.id) throw new Error("Base rider must have an id");

    return Array.from({ length: count }, (_, i) => {
      const rider = originalRider.copy();
      rider.id = `${originalRider.id}_${i}`;

      if (modifiers.startPosition)
        rider.startPosition = modifiers.startPosition(rider.startPosition, i);
      if (modifiers.startVelocity)
        rider.startVelocity = modifiers.startVelocity(rider.startVelocity, i);
      if (modifiers.startAngle)
        rider.startAngle = modifiers.startAngle(rider.startAngle, i);

      return rider;
    });
  }

  // ==== PART 8: GRAVITY EFFECT FUNCTIONS ====
  const popFn = ({ x, y, contactPoints }, duration = 0) => {
    return (t, g) => [
      [t + 0, { x, y, contactPoints }],
      [t + duration + 1, g],
    ];
  };

  const setGravityFn = ({ x, y, contactPoints }) => {
    return (t, g) => [[t, { x, y, contactPoints }]];
  };

  /**
   * Consolidated teleport function that handles all teleportation scenarios
   * @param {Object} options Configuration options
   */
  const teleport = ({
    targetContactPoint = null,
    targetPosition = null,
    affectedPoints = PointGroups.ALL,
    shape = Shapes.DEFAULT,
    rotation = 0,
    velocityMode = VelocityMode.RESET,
    velocityOffset = null, // New parameter: {x: 0, y: 0} to add velocity
    customShape = null,
  }) => {
    return (t, g) => [
      // Frame 1: Position adjustment
      [
        t,
        {
          type: "computed",
          compute: "teleport_position",
          targetContactPoint,
          targetPosition,
          affectedPoints,
          shape,
          rotation,
          customShape,
        },
      ],
      // Frame 2: Velocity management + optional velocity offset
      [
        t + 1,
        {
          type: "computed",
          compute: "teleport_velocity",
          velocityMode,
          velocityOffset, // Pass the velocity offset to be applied
          affectedPoints,
          // Store the original gravity to restore in frame 3
          originalGravity: g,
        },
      ],
      // Frame 3: Return to normal gravity
      [t + 2, g],
    ];
  };

  const kramual = (rotation = 0) => {
    return teleport({
      targetContactPoint: ContactPoints.TAIL,
      affectedPoints: PointGroups.ALL,
      shape: Shapes.KRAMUAL,
      rotation,
      velocityMode: VelocityMode.ADOPT_TARGET,
    });
  };

  // Kramual with upward velocity after teleport
  const kramualWithLaunch = (
    rotation = 0,
    launchVelocity = { x: 0, y: -5 },
  ) => {
    return teleport({
      affectedPoints: PointGroups.ALL,
      shape: Shapes.KRAMUAL,
      rotation,
      velocityMode: VelocityMode.RESET,
      velocityOffset: launchVelocity,
    });
  };

  // Convenience function: Teleport rider to sled
  const teleportRiderToSled = () => {
    return teleport({
      targetContactPoint: ContactPoints.PEG,
      affectedPoints: PointGroups.ALL,
      velocityMode: VelocityMode.RESET,
    });
  };

  // ==== PART 9: ENHANCED CUSTOM GRAVITY FUNCTION ====
  window.setCustomGravityWithContactPoints = function (keyframes) {
    // Store keyframes without flattening (they're already in the correct format)
    window.allGravityKeyframes = keyframes.map((riderKeyframes) => {
      // riderKeyframes is already an array of [timestamp, gravity] pairs
      // No need to flatten
      return riderKeyframes.sort((a, b) => {
        // Sort by the first frame number in the timestamp
        return timestampToFrames(a[0]) - timestampToFrames(b[0]);
      });
    });
  };

  // ==== OVERRIDE ENGINE GRAVITY USING ALL PRECOMPUTED KEYFRAMES ====
  Object.defineProperty(window.$ENGINE_PARAMS, "gravity", {
    get() {
      const frameIndex =
        store.getState().simulator.engine.engine._computed._frames.length;

      const riders =
        store.getState().simulator.engine.engine.state.riders || [];
      const numRiders = riders.length;
      if (numRiders === 0) {
        return { x: 0, y: 0.175 };
      }

      const iterationsPerRider = 17; // number of contact points
      const globalIteration = (window.__gravityIterationCounter =
        (window.__gravityIterationCounter || 0) + 1);

      const currentRiderIndex =
        Math.floor((globalIteration - 1) / iterationsPerRider) % numRiders;
      const currentContactPoint = (globalIteration - 1) % iterationsPerRider;

      // Get keyframes for this rider
      const riderKeyframes =
        window.allGravityKeyframes?.[currentRiderIndex] || [];

      // Find the most recent keyframe <= current frame
      let gravity = null;
      for (let i = 0; i < riderKeyframes.length; i++) {
        const [timestamp, g] = riderKeyframes[i];
        const keyframeFrame = timestampToFrames(timestamp);
        if (keyframeFrame <= frameIndex) {
          gravity = g;
        } else {
          break;
        }
      }

      // Default if no gravity keyframe exists
      if (!gravity) {
        return { x: 0, y: 0.175 };
      }

      // Handle computed instructions
      if (gravity.type === "computed") {
        const frameData = store
          .getState()
          .simulator.engine.engine.getFrame(frameIndex - 1);
        const riderData =
          frameData?.snapshot?.entities?.[0]?.entities?.[currentRiderIndex];
        const contactPointData = riderData?.points?.[currentContactPoint];

        if (!contactPointData) {
          return { x: 0, y: 0.175 };
        }

        switch (gravity.compute) {
          case "teleport_position": {
            if (!gravity.affectedPoints.includes(currentContactPoint)) {
              return { x: 0, y: 0 };
            }

            const targetPos = calculateTargetPosition({
              contactPoint: currentContactPoint,
              targetContactPoint: gravity.targetContactPoint,
              targetPosition: gravity.targetPosition,
              shape: gravity.shape,
              rotation: gravity.rotation,
              customShape: gravity.customShape,
              riderData,
            });

            return {
              x: targetPos.x - contactPointData.pos.x - contactPointData.vel.x,
              y: targetPos.y - contactPointData.pos.y - contactPointData.vel.y,
            };
          }

          case "teleport_velocity": {
            if (!gravity.affectedPoints.includes(currentContactPoint)) {
              return { x: 0, y: 0 };
            }

            let velocityChange = { x: 0, y: 0 };

            // First, handle the velocity mode
            if (gravity.velocityMode === "reset") {
              velocityChange = {
                x: -contactPointData.vel.x,
                y: -contactPointData.vel.y,
              };
            } else if (gravity.velocityMode === "maintain") {
              velocityChange = { x: 0, y: 0 };
            } else if (gravity.velocityMode === "adopt-target") {
              const targetVel = getTargetVelocity(
                gravity.targetContactPoint,
                riderData,
              );
              velocityChange = {
                x: targetVel.x - contactPointData.vel.x,
                y: targetVel.y - contactPointData.vel.y,
              };
            }

            // Then, add the velocity offset if provided
            if (gravity.velocityOffset) {
              velocityChange.x += gravity.velocityOffset.x;
              velocityChange.y += gravity.velocityOffset.y;
            }

            return velocityChange;
          }

          default:
            return { x: 0, y: 0.175 };
        }
      }

      // Regular gravity
      return gravity || { x: 0, y: 0.175 };
    },
  });

  /**
   * Helper function to calculate target position for a contact point
   */
  function calculateTargetPosition({
    contactPoint,
    targetContactPoint,
    targetPosition,
    shape,
    rotation = 0,
    riderData,
  }) {
    // Step 1: Resolve target XY position
    let anchorPosition;

    if (targetPosition !== null) {
      // Use the explicitly provided position for the anchor
      anchorPosition = targetPosition;
    } else if (targetContactPoint !== null) {
      // Use the current position of the target contact point as the anchor position
      const targetPoint = riderData.points[targetContactPoint];
      anchorPosition = {
        x: targetPoint.pos.x + targetPoint.vel.x,
        y: targetPoint.pos.y + targetPoint.vel.y,
      };
    } else {
      // Default: use PEG's current position
      const pegPoint = riderData.points[ContactPoints.PEG];
      anchorPosition = {
        x: pegPoint.pos.x + pegPoint.vel.x,
        y: pegPoint.pos.y + pegPoint.vel.y,
      };
      targetContactPoint = ContactPoints.PEG; // Set for offset calculation
    }

    // Step 2: Get the offset of the anchor point in the shape
    const anchorOffset = shape[targetContactPoint || ContactPoints.PEG];

    // Step 3: Get the offset of the contact point we're calculating for
    const contactPointOffset = shape[contactPoint];

    // Step 4: Calculate relative offset from anchor to contact point
    let relativeOffset = {
      x: contactPointOffset.x - anchorOffset.x,
      y: contactPointOffset.y - anchorOffset.y,
    };

    // Step 5: Apply rotation if needed
    if (rotation !== 0) {
      relativeOffset = rotateOffset(relativeOffset, rotation);
    }

    // Step 6: Calculate final position (anchor position + relative offset)
    return {
      x: anchorPosition.x + relativeOffset.x,
      y: anchorPosition.y + relativeOffset.y,
    };
  }

  /**
   * Rotates an offset by the given angle in degrees
   */
  function rotateOffset(offset, angleDegrees) {
    const angleRadians = angleDegrees * (Math.PI / 180);
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);

    return {
      x: offset.x * cos - offset.y * sin,
      y: offset.x * sin + offset.y * cos,
    };
  }

  /**
   * Gets velocity from a target contact point
   */
  function getTargetVelocity(targetContactPoint, riderData) {
    if (targetContactPoint === null || !riderData.points[targetContactPoint]) {
      return { x: 0, y: 0 };
    }

    return {
      x: riderData.points[targetContactPoint].vel.x,
      y: riderData.points[targetContactPoint].vel.y,
    };
  }

  // ==== PART 11: EXAMPLE RIDER SETUP ====
  const kramRider = new Rider(
    "kramRider",
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    true,
    90,
    globalStartGravity,
  );

  const introRider = new Rider(
    "introRider",
    { x: 0, y: 300 },
    { x: 0, y: 0 },
    true,
    0,
    { x: 0, y: 0.15 },
  );

  const riders = {
    introRiders: generateRiderArray(introRider, 1),
  };
  const Intervals = {
    simultaneous: () => 0,
    stagger: (frames) => (i) => i * frames,
    exponential:
      (base, scale = 1) =>
      (i) =>
        Math.pow(base, i) * scale,
    sine: (period, amplitude) => (i) => Math.sin(i * period) * amplitude,
  };

  // Version with explicit timing control
  const sequence =
    (...steps) =>
    (t, g) => {
      let currentTime = t;
      const allKeyframes = [];

      for (const step of steps) {
        if (typeof step === "number") {
          // It's a wait duration
          currentTime += step;
        } else {
          // It's an effect function
          const keyframes = step(currentTime, g);
          allKeyframes.push(...keyframes);
          currentTime = keyframes[keyframes.length - 1][0] + 1;
        }
      }

      return allKeyframes;
    };

  // ==== PART 12: APPLY GRAVITY EFFECTS ====
  // IMPORTANT: Set initial gravity at frame 0 for all riders

  // Example: Pop effect with contact-specific gravity
  applyGravity(
    riders.introRiders,
    [0, 1, 0],
    popFn({ x: 0, y: -5 }),
    Intervals.stagger(40),
  );

  applyGravity(
    riders.introRiders,
    [0, 5, 0],
    teleportRiderToSled(), // stop after teleport
    Intervals.stagger(40),
  );

  applyGravity(
    riders.introRiders,
    [0, 6, 0],
    kramualWithLaunch(0, { x: 0, y: 10 }), // stop after teleport
    Intervals.stagger(40),
  );
  applyGravity(
    riders.introRiders,
    [0, 7, 0],
    teleport({
      affectedPoints: PointGroups.ALL,
      shape: Shapes.KRAMUAL,
      rotation: -90,
      velocityMode: VelocityMode.RESET,
      velocityOffset: { x: -1, y: 0 },
    }), // stop after teleport
    Intervals.stagger(40),
  );

  applyGravity(
    riders.introRiders,
    [0, 9, 0],
    teleport({
      targetContactPoint: ContactPoints.TAIL,
      affectedPoints: PointGroups.ALL,
      shape: Shapes.KRAMUAL,
      rotation: 180,
      velocityMode: VelocityMode.RESET,
      velocityOffset: { x: -2, y: 0 },
    }), // stop after teleport
    Intervals.stagger(40),
  );

  applyGravity(
    riders.introRiders,
    [0, 10, 5],
    popFn({ x: 30, y: -5 }), // stop after teleport
    Intervals.stagger(40),
  );
  applyGravity(
    riders.introRiders,
    [0, 10, 10],
    setGravityFn({ x: 0, y: -0.175 }), // stop after teleport
    Intervals.stagger(40),
  );

  // ==== PART 13: COMMIT CHANGES ====
  if (window.Actions) {
    const allRiders = Object.values(riders).flat();

    // 1. Collect all gravity keyframes for each rider
    const allGravityKeyframes = allRiders.map((r) => r.getGravityKeyframes());

    console.log("Gravity keyframes:", allGravityKeyframes);

    // 2. Initialize the custom gravity subscriber with these keyframes
    window.setCustomGravityWithContactPoints(allGravityKeyframes);

    // 3. Commit the riders to the track/actions system
    window.Actions.setRiders(allRiders);
    window.Actions.commitTrackChanges();
  }
})();
