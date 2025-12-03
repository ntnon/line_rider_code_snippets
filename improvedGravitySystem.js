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

  // Define a Shapes object to store different predefined shapes
  const Shapes = {
    DEFAULT: defaultPointOffsets,
    // Add other shapes like STANDING, CROUCHING, etc. in the future
  };

  // Define velocity modes as constants
  const VelocityMode = {
    RESET: "reset",
    MAINTAIN: "maintain",
    ADOPT_TARGET: "adopt-target",
  };

  // Define position modes as constants
  const PositionMode = {
    DEFAULT_SHAPE: "default-shape",
    MAINTAIN_RELATIVE: "maintain-relative",
    CUSTOM_SHAPE: "custom-shape",
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

  // ==== PART 3: IMPROVED GRAVITY SYSTEM WITH COMPLETE STATE TRACKING ====
  const GRAVITY_SYSTEM = {
    iterationCounter: 0,
    keyframesByRider: [],
    FRAMES_PER_SECOND: 40,
    contactPointStates: {},
    lastProcessedFrame: -1,
    defaultGravity: null, // Will be set from frame 0 or initial rider gravity

    timestampToFrames([minutes, seconds, frames]) {
      return (
        minutes * this.FRAMES_PER_SECOND * 60 +
        seconds * this.FRAMES_PER_SECOND +
        frames
      );
    },

    // Initialize rider states with proper defaults from keyframes or rider defaults
    initRiderStates(riderIndex, initialGravity = null) {
      if (!this.contactPointStates[riderIndex]) {
        this.contactPointStates[riderIndex] = {};

        // Use provided initial gravity, or fall back to soft default
        const defaultGrav = initialGravity ||
          this.defaultGravity || { x: 0, y: 0.175 };

        for (let i = 0; i < 17; i++) {
          this.contactPointStates[riderIndex][i] = { ...defaultGrav };
        }
      }
    },

    // Process all frames up to the current frame to maintain complete state
    updateStatesUpToFrame(frameIndex) {
      // Process all frames from last processed to current
      for (
        let frame = this.lastProcessedFrame + 1;
        frame <= frameIndex;
        frame++
      ) {
        this.processFrameKeyframes(frame);
      }
      this.lastProcessedFrame = frameIndex;
    },

    // Process keyframes for a specific frame
    processFrameKeyframes(frameIndex) {
      for (
        let riderIndex = 0;
        riderIndex < this.keyframesByRider.length;
        riderIndex++
      ) {
        const riderKeyframes = this.keyframesByRider[riderIndex];
        if (!riderKeyframes) continue;

        // Ensure rider is initialized
        this.initRiderStates(riderIndex);

        // Find keyframes that match this frame
        for (const [timestamp, gravity] of riderKeyframes) {
          const keyframeFrame = this.timestampToFrames(timestamp);

          if (keyframeFrame === frameIndex) {
            // Apply gravity changes to the state
            if (gravity.type === "computed") {
              // Store computed gravity instruction for runtime evaluation
              if (
                !gravity.contactPoints ||
                gravity.contactPoints.length === 0
              ) {
                // Apply to all contact points
                for (let cp = 0; cp < 17; cp++) {
                  this.contactPointStates[riderIndex][cp] = gravity;
                }
              } else {
                // Apply only to specified contact points
                for (const cp of gravity.contactPoints) {
                  if (cp >= 0 && cp < 17) {
                    this.contactPointStates[riderIndex][cp] = gravity;
                  }
                }
              }
            } else {
              // Regular gravity values
              if (
                !gravity.contactPoints ||
                gravity.contactPoints.length === 0
              ) {
                // Apply to all contact points
                for (let cp = 0; cp < 17; cp++) {
                  this.contactPointStates[riderIndex][cp] = {
                    x: gravity.x,
                    y: gravity.y,
                  };
                }
              } else {
                // Apply only to specified contact points
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
      }
    },

    // Get gravity for a specific contact point, maintaining state continuity
    getGravityForContact(riderIndex, contactPoint, frameIndex) {
      // Ensure all frames up to current are processed
      this.updateStatesUpToFrame(frameIndex);

      // Ensure rider is initialized
      this.initRiderStates(riderIndex);

      // Return current state for this contact point
      return this.contactPointStates[riderIndex][contactPoint];
    },

    // Initialize the system with frame 0 gravity for all riders
    initializeFromKeyframes(keyframes) {
      // Reset system
      this.contactPointStates = {};
      this.lastProcessedFrame = -1;

      // Find and apply frame 0 gravity for each rider
      keyframes.forEach((riderKeyframes, riderIndex) => {
        if (!riderKeyframes || riderKeyframes.length === 0) return;

        // Look for frame 0 keyframe
        let initialGravity = null;
        for (const [timestamp, gravity] of riderKeyframes) {
          const frame = this.timestampToFrames(timestamp);
          if (frame === 0) {
            initialGravity =
              gravity.type === "computed"
                ? null
                : { x: gravity.x, y: gravity.y };
            break;
          }
        }

        // Initialize rider with frame 0 gravity or use default
        this.initRiderStates(riderIndex, initialGravity);

        // If we found a frame 0 keyframe, apply it properly
        if (initialGravity) {
          this.processFrameKeyframes(0);
        }
      });

      // Set default gravity from first rider's initial state if available
      if (
        !this.defaultGravity &&
        this.contactPointStates[0] &&
        this.contactPointStates[0][0]
      ) {
        this.defaultGravity = { ...this.contactPointStates[0][0] };
      }
    },
  };

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

  // ==== PART 7: INTERVAL AND FILTER FUNCTIONS ====
  const intervalFns = {
    full: (i) => trueFPB * i,
    half: (i) => (trueFPB / 2) * i,
    quarter: (i) => (trueFPB / 4) * i,
    eighth: (i) => (trueFPB / 8) * i,
    sixteenth: (i) => (trueFPB / 16) * i,
  };

  const filterFns = {
    even: (i) => i % 2 == 0,
    odd: (i) => i % 2 !== 0,
    all: (i) => true,
    first: (i) => i === 0,
    tail: (i) => i !== 0,
  };

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

  const defaultGravityFn = (t, g) => [[t, g]];

  // Reimplementation of teleportTo using the consolidated system
  const teleportTo = ({ x, y, contactPoints }) => {
    return teleport({
      targetPosition: { x, y },
      affectedPoints: contactPoints || PointGroups.ALL,
      positionMode: PositionMode.MAINTAIN_RELATIVE,
      velocityMode: VelocityMode.MAINTAIN,
    });
  };

  // Reimplementation of teleportToAndStop using the consolidated system
  const teleportToAndStop = ({
    x,
    y,
    contactPoints,
    defaultPosition = false,
  }) => {
    return teleport({
      targetPosition: { x, y },
      affectedPoints: contactPoints || PointGroups.ALL,
      positionMode: defaultPosition
        ? PositionMode.DEFAULT_SHAPE
        : PositionMode.MAINTAIN_RELATIVE,
      velocityMode: VelocityMode.RESET,
      rotation: 0,
    });
  };

  // Reimplementation of teleportBy using the consolidated system
  const teleportBy = ({ x, y, contactPoints }) => {
    // For relative movement, we need to use a custom function
    // that applies an offset to each point's current position
    return (t, g) => [
      [t, { x: x, y: y, contactPoints: contactPoints }],
      [t + 1, { x: -x, y: -y, contactPoints: contactPoints }],
      [t + 2, g],
    ];
  };

  // Reimplementation of teleportByAndStop using the consolidated system
  const teleportByAndStop = ({ x, y, contactPoints }) => {
    // Similar to teleportBy but stops momentum
    return (t, g) => [
      [t, { x: x, y: y, contactPoints: contactPoints }],
      [
        t + 1,
        {
          type: "computed",
          compute: "teleport_velocity",
          velocityMode: VelocityMode.RESET,
          affectedPoints: contactPoints || PointGroups.ALL,
        },
      ],
      [t + 2, g],
    ];
  };

  /**
   * Consolidated teleport function that handles all teleportation scenarios
   * @param {Object} options Configuration options
   */
  const teleport = ({
    targetContactPoint = null,
    targetPosition = null,
    affectedPoints = PointGroups.ALL,
    positionMode = PositionMode.DEFAULT_SHAPE,
    rotation = 0,
    velocityMode = VelocityMode.RESET,
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
          positionMode,
          rotation,
          customShape,
        },
      ],
      // Frame 2: Velocity management
      [
        t + 1,
        {
          type: "computed",
          compute: "teleport_velocity",
          velocityMode,
          affectedPoints,
          // Store the original gravity to restore in frame 3
          originalGravity: g,
        },
      ],
      // Frame 3: Return to normal gravity
      [t + 2, g],
    ];
  };

  // Convenience function: Teleport to absolute position
  const teleportToPosition = (
    x,
    y,
    affectedPoints = PointGroups.ALL,
    rotation = 0,
    velocityMode = VelocityMode.RESET,
  ) => {
    return teleport({
      targetPosition: { x, y },
      affectedPoints,
      positionMode: PositionMode.DEFAULT_SHAPE,
      rotation,
      velocityMode,
    });
  };

  // Convenience function: Teleport sled to rider
  const teleportSledToRider = (maintainVelocity = false) => {
    return teleport({
      targetContactPoint: ContactPoints.BUTT,
      affectedPoints: PointGroups.ALL,
      positionMode: PositionMode.DEFAULT_SHAPE,
      velocityMode: maintainVelocity
        ? VelocityMode.MAINTAIN
        : VelocityMode.RESET,
    });
  };

  // Convenience function: Teleport rider to sled
  const teleportRiderToSled = (maintainVelocity = false) => {
    return teleport({
      targetContactPoint: ContactPoints.PEG,
      affectedPoints: PointGroups.ALL,
      positionMode: PositionMode.DEFAULT_SHAPE,
      velocityMode: maintainVelocity
        ? VelocityMode.MAINTAIN
        : VelocityMode.RESET,
    });
  };

  // Convenience function: Reset to default position with rotation
  const resetToDefaultPosition = (rotation = 0, maintainVelocity = false) => {
    return teleport({
      affectedPoints: PointGroups.ALL,
      positionMode: PositionMode.DEFAULT_SHAPE,
      rotation,
      velocityMode: maintainVelocity
        ? VelocityMode.MAINTAIN
        : VelocityMode.RESET,
    });
  };

  // Convenience function: Apply a custom shape
  const applyShape = (shape, rotation = 0, maintainVelocity = false) => {
    return teleport({
      affectedPoints: PointGroups.ALL,
      positionMode: PositionMode.CUSTOM_SHAPE,
      customShape: shape,
      rotation,
      velocityMode: maintainVelocity
        ? VelocityMode.MAINTAIN
        : VelocityMode.RESET,
    });
  };

  // ==== PART 9: ENHANCED CUSTOM GRAVITY FUNCTION ====
  window.setCustomGravityWithContactPoints = function (keyframes) {
    // Store and sort keyframes for each rider
    GRAVITY_SYSTEM.keyframesByRider = keyframes.map((riderKeyframes) => {
      return riderKeyframes.sort((a, b) => {
        const frameA = GRAVITY_SYSTEM.timestampToFrames(a[0]);
        const frameB = GRAVITY_SYSTEM.timestampToFrames(b[0]);
        return frameA - frameB;
      });
    });

    // Initialize system with proper defaults from frame 0
    GRAVITY_SYSTEM.initializeFromKeyframes(GRAVITY_SYSTEM.keyframesByRider);

    console.log(
      "Custom gravity system initialized for",
      keyframes.length,
      "riders with complete state tracking",
    );
  };

  window.setCustomGravity = window.setCustomGravityWithContactPoints;

  // ==== PART 10: GRAVITY PROPERTY OVERRIDE ====
  Object.defineProperty(window.$ENGINE_PARAMS, "gravity", {
    get() {
      GRAVITY_SYSTEM.iterationCounter += 1;

      const frameIndex =
        store.getState().simulator.engine.engine._computed._frames.length;

      const numRiders =
        store.getState().simulator.engine.engine.state.riders.length;
      if (numRiders === 0) {
        // Return soft default or last known good gravity
        return GRAVITY_SYSTEM.defaultGravity || { x: 0, y: 0.175 };
      }

      const iterationsPerRider = 17;
      const currentRiderIndex =
        Math.floor((GRAVITY_SYSTEM.iterationCounter - 1) / iterationsPerRider) %
        numRiders;
      const currentContactPoint =
        (GRAVITY_SYSTEM.iterationCounter - 1) % iterationsPerRider;

      const gravity = GRAVITY_SYSTEM.getGravityForContact(
        currentRiderIndex,
        currentContactPoint,
        frameIndex,
      );

      // Handle computed gravity
      if (gravity && gravity.type === "computed") {
        // Always use the previous frame data to avoid recursion
        const frameData = store
          .getState()
          .simulator.engine.engine.getFrame(frameIndex - 1);
        if (
          !frameData ||
          !frameData.snapshot ||
          !frameData.snapshot.entities ||
          !frameData.snapshot.entities[0] ||
          !frameData.snapshot.entities[0].entities ||
          !frameData.snapshot.entities[0].entities[currentRiderIndex]
        ) {
          // Return last known state for this contact point
          return (
            GRAVITY_SYSTEM.contactPointStates[currentRiderIndex]?.[
              currentContactPoint
            ] ||
            GRAVITY_SYSTEM.defaultGravity || { x: 0, y: 0.175 }
          );
        }

        const riderData =
          frameData.snapshot.entities[0].entities[currentRiderIndex];
        const contactPoint = riderData.points[currentContactPoint];

        switch (gravity.compute) {
          case "teleport_position": {
            // Check if this contact point should be affected
            if (!gravity.affectedPoints.includes(currentContactPoint)) {
              return { x: 0, y: 0 }; // No change for unaffected points
            }

            // Calculate target position based on the options
            let targetPosition = calculateTargetPosition({
              contactPoint: currentContactPoint,
              targetContactPoint: gravity.targetContactPoint,
              targetPosition: gravity.targetPosition,
              positionMode: gravity.positionMode,
              rotation: gravity.rotation,
              customShape: gravity.customShape,
              riderData,
            });

            // Calculate acceleration needed to reach target position
            const accelX =
              targetPosition.x - contactPoint.pos.x - contactPoint.vel.x;
            const accelY =
              targetPosition.y - contactPoint.pos.y - contactPoint.vel.y;

            return { x: accelX, y: accelY };
          }

          case "teleport_velocity": {
            // Check if this contact point should be affected
            if (!gravity.affectedPoints.includes(currentContactPoint)) {
              return { x: 0, y: 0 }; // No change for unaffected points
            }

            if (gravity.velocityMode === VelocityMode.RESET) {
              // Cancel all velocity
              return { x: -contactPoint.vel.x, y: -contactPoint.vel.y };
            } else if (gravity.velocityMode === VelocityMode.MAINTAIN) {
              // In maintain mode, we don't change existing velocity
              return { x: 0, y: 0 };
            } else if (gravity.velocityMode === VelocityMode.ADOPT_TARGET) {
              // This would set velocity to match a target point's velocity
              const targetVel = getTargetVelocity(
                gravity.targetContactPoint,
                riderData,
              );
              return {
                x: targetVel.x - contactPoint.vel.x,
                y: targetVel.y - contactPoint.vel.y,
              };
            }

            // Default fallback
            return { x: -contactPoint.vel.x, y: -contactPoint.vel.y };
          }

          default:
            // Return current state for unknown compute types
            return (
              GRAVITY_SYSTEM.contactPointStates[currentRiderIndex]?.[
                currentContactPoint
              ] ||
              GRAVITY_SYSTEM.defaultGravity || { x: 0, y: 0.175 }
            );
        }
      }

      return gravity || GRAVITY_SYSTEM.defaultGravity || { x: 0, y: 0.175 };
    },
  });

  /**
   * Helper function to calculate target position for a contact point
   */
  function calculateTargetPosition({
    contactPoint,
    targetContactPoint,
    targetPosition,
    positionMode,
    rotation = 0,
    customShape,
    riderData,
  }) {
    // Base reference point and position
    let referencePoint, referencePosition;

    // 1. Determine reference point and position
    if (targetContactPoint !== null) {
      referencePoint = targetContactPoint;
      referencePosition = riderData.points[referencePoint].pos;
      // Add velocity to compensate for frame difference
      referencePosition = {
        x: referencePosition.x + riderData.points[referencePoint].vel.x,
        y: referencePosition.y + riderData.points[referencePoint].vel.y,
      };
    } else if (targetPosition !== null) {
      // Use provided absolute position
      referencePoint = null;
      referencePosition = targetPosition;
    } else {
      // Default to current position of PEG
      referencePoint = ContactPoints.PEG;
      referencePosition = riderData.points[referencePoint].pos;
      // Add velocity to compensate for frame difference
      referencePosition = {
        x: referencePosition.x + riderData.points[referencePoint].vel.x,
        y: referencePosition.y + riderData.points[referencePoint].vel.y,
      };
    }

    // 2. Calculate relative position based on mode
    let relativeOffset = { x: 0, y: 0 };

    if (positionMode === PositionMode.DEFAULT_SHAPE) {
      // Get offset from default shape
      const offsets = getOffsetsRelativeTo(referencePoint || ContactPoints.PEG);
      relativeOffset = offsets[contactPoint];
    } else if (positionMode === PositionMode.CUSTOM_SHAPE) {
      // Get offset from custom shape
      const shape = customShape || Shapes.DEFAULT;
      relativeOffset = shape[contactPoint];
    } else if (positionMode === PositionMode.MAINTAIN_RELATIVE) {
      // Maintain current relative position to reference point
      if (referencePoint !== null && contactPoint !== referencePoint) {
        const refPos = riderData.points[referencePoint].pos;
        const contactPos = riderData.points[contactPoint].pos;
        relativeOffset = {
          x: contactPos.x - refPos.x,
          y: contactPos.y - refPos.y,
        };
      }
    }

    // 3. Apply rotation if needed
    if (rotation !== 0) {
      relativeOffset = rotateOffset(relativeOffset, rotation);
    }

    // 4. Calculate final target position
    return {
      x: referencePosition.x + relativeOffset.x,
      y: referencePosition.y + relativeOffset.y,
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
    introRiders: generateRiderArray(introRider, 2),
  };

  // ==== PART 12: APPLY GRAVITY EFFECTS ====
  // IMPORTANT: Set initial gravity at frame 0 for all riders
  applyGravity(riders.introRiders, [0, 0, 0], setGravityFn({ x: 0, y: 0 }));

  // Example: Pop effect with contact-specific gravity
  applyGravity(
    riders.introRiders,
    [0, 1, 0],
    popFn({ x: 0, y: 10, contactPoints: sled }),
    (i) => 40 * i,
  );

  applyGravity(
    riders.introRiders,
    [0, 5, 0],
    teleportRiderToSled(false), // stop after teleport
    (i) => 40 * i,
  );

  applyGravity(
    riders.introRiders,
    [0, 9, 20],
    teleportBy(0, 10), // stop after teleport
    (i) => 40 * i,
  );

  // ==== PART 13: COMMIT CHANGES ====
  if (window.Actions) {
    const allRiders = Object.values(riders).flat();
    const allGravityKeyframes = allRiders.map((r) => r.getGravityKeyframes());
    console.log("Gravity keyframes:", allGravityKeyframes);
    window.Actions.setRiders(allRiders);
    setCustomGravity(allGravityKeyframes);
    window.Actions.commitTrackChanges();
  }

  // ==== PART 14: EXPORT USEFUL FUNCTIONS TO GLOBAL SCOPE ====
  window.GravitySystem = {
    // Classes and main functions
    Rider,
    applyGravity,
    generateRiderArray,

    // Gravity effect functions
    setGravityFn,
    popFn,
    teleportTo,
    teleportBy,
    teleportSledToRider,
    teleportRiderToSled,

    // Utility functions
    intervalFns,
    filterFns,
    ContactPoints,

    // Debug functions
    debugStates: () => {
      console.log(
        "Current gravity states:",
        JSON.parse(JSON.stringify(GRAVITY_SYSTEM.contactPointStates)),
      );
      console.log("Default gravity:", GRAVITY_SYSTEM.defaultGravity);
      console.log("Last processed frame:", GRAVITY_SYSTEM.lastProcessedFrame);
    },

    // Access to internal system for advanced debugging
    _internal: GRAVITY_SYSTEM,
  };

  console.log(
    "Gravity system initialized. Use window.GravitySystem to access utilities.",
  );
})();
