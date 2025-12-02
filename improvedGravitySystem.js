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

  // Absolute teleportation function, maintain existing velocity
  const teleportTo = ({ x, y, contactPoints }) => {
    return (t, g) => [
      [
        t,
        {
          type: "computed",
          compute: "teleport_absolute",
          x: x,
          y: y,
          contactPoints: contactPoints,
        },
      ],
      [
        t + 1,
        {
          type: "computed",
          compute: "cancel_teleport_absolute",
          x: x,
          y: y,
          contactPoints: contactPoints,
        },
      ],
      [t + 2, g],
    ];
  };

  // Relative teleportation function, maintain existing velocity
  const teleportBy = ({ x, y, contactPoints }) => {
    return (t, g) => [
      [t, { x: x, y: y, contactPoints: contactPoints }],
      [t + 1, { x: -x, y: -y, contactPoints: contactPoints }],
      [t + 2, g],
    ];
  };

  // Teleportation functions - with velocity cancellation
  const teleportToAndStop = ({ x, y, contactPoints }) => {
    return (t, g) => [
      [
        t,
        {
          type: "computed",
          compute: "teleport_absolute",
          x: x,
          y: y,
          contactPoints: contactPoints,
        },
      ],
      [
        t + 1,
        {
          type: "computed",
          compute: "teleport_absolute_stop",
          x: x,
          y: y,
          contactPoints: contactPoints,
        },
      ],
      [t + 2, g],
    ];
  };

  const teleportByAndStop = ({ x, y, contactPoints }) => {
    return (t, g) => [
      [t, { x: x, y: y, contactPoints: contactPoints }],
      [
        t + 1,
        {
          type: "computed",
          compute: "cancelVelocity",
          x: x,
          y: y,
          contactPoints: contactPoints,
        },
      ],
      [t + 2, g],
    ];
  };

  // NEW: Teleport sled to rider or rider to sled
  const teleportSledToRider = (maintainVelocity = true) => {
    return (t, g) => [
      [
        t,
        {
          type: "computed",
          compute: "teleport_sled_to_rider",
          maintainVelocity: maintainVelocity,
        },
      ],
      [
        t + 1,
        {
          type: "computed",
          compute: "cancel_sled_to_rider",
          maintainVelocity: maintainVelocity,
        },
      ],
      [t + 2, g],
    ];
  };

  const teleportRiderToSled = (maintainVelocity = true) => {
    return (t, g) => [
      [
        t,
        {
          type: "computed",
          compute: "teleport_rider_to_sled",
          maintainVelocity: maintainVelocity,
        },
      ],
      [
        t + 1,
        {
          type: "computed",
          compute: "cancel_rider_to_sled",
          maintainVelocity: maintainVelocity,
        },
      ],
      [t + 2, g],
    ];
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
          case "teleport_absolute": {
            // Check if this contact point should be affected
            if (
              gravity.contactPoints &&
              gravity.contactPoints.length > 0 &&
              !gravity.contactPoints.includes(currentContactPoint)
            ) {
              return { x: 0, y: 0 }; // No change for unspecified points
            }

            // Use first specified contact point as reference, or PEG if none specified
            const referencePointIndex =
              gravity.contactPoints && gravity.contactPoints.length > 0
                ? gravity.contactPoints[0]
                : 0;
            const referencePoint = riderData.points[referencePointIndex];

            if (currentContactPoint === referencePointIndex) {
              // Reference point goes directly to target
              const accelX =
                gravity.x - referencePoint.pos.x - referencePoint.vel.x;
              const accelY =
                gravity.y - referencePoint.pos.y - referencePoint.vel.y;
              return { x: accelX, y: accelY };
            } else {
              if (
                !gravity.contactPoints ||
                gravity.contactPoints.includes(currentContactPoint)
              ) {
                // Other points maintain offset from reference point
                const offsetX = contactPoint.pos.x - referencePoint.pos.x;
                const offsetY = contactPoint.pos.y - referencePoint.pos.y;
                const targetX = gravity.x + offsetX;
                const targetY = gravity.y + offsetY;
                const accelX =
                  targetX - contactPoint.pos.x - contactPoint.vel.x;
                const accelY =
                  targetY - contactPoint.pos.y - contactPoint.vel.y;
                return { x: accelX, y: accelY };
              }
            }
            break;
          }

          case "cancel_teleport_absolute": {
            // Check if this contact point was affected
            if (
              gravity.contactPoints &&
              gravity.contactPoints.length > 0 &&
              !gravity.contactPoints.includes(currentContactPoint)
            ) {
              return { x: 0, y: 0 }; // No change for unspecified points
            }

            // Use same reference point logic as teleport_absolute
            const referencePointIndex =
              gravity.contactPoints && gravity.contactPoints.length > 0
                ? gravity.contactPoints[0]
                : 0;
            const referencePoint = riderData.points[referencePointIndex];

            if (currentContactPoint === referencePointIndex) {
              // Cancel reference point's acceleration
              const origAccelX =
                gravity.x - referencePoint.pos.x + referencePoint.vel.x;
              const origAccelY =
                gravity.y - referencePoint.pos.y + referencePoint.vel.y;
              return { x: -origAccelX, y: -origAccelY };
            } else {
              // Cancel other points' acceleration based on offset
              const offsetX = contactPoint.pos.x - referencePoint.pos.x;
              const offsetY = contactPoint.pos.y - referencePoint.pos.y;
              const origTargetX = gravity.x + offsetX;
              const origTargetY = gravity.y + offsetY;
              const origAccelX =
                origTargetX - contactPoint.pos.x + contactPoint.vel.x;
              const origAccelY =
                origTargetY - contactPoint.pos.y + contactPoint.vel.y;
              return { x: -origAccelX, y: -origAccelY };
            }
          }

          case "teleport_absolute_stop": {
            // Check if this contact point should be affected
            if (
              gravity.contactPoints &&
              gravity.contactPoints.length > 0 &&
              !gravity.contactPoints.includes(currentContactPoint)
            ) {
              return { x: 0, y: 0 }; // No change for unspecified points
            }
            // Cancel all velocity after teleport
            return { x: -contactPoint.vel.x, y: -contactPoint.vel.y };
          }

          case "cancelVelocity": {
            // Check if this contact point should be affected
            if (
              gravity.contactPoints &&
              gravity.contactPoints.length > 0 &&
              !gravity.contactPoints.includes(currentContactPoint)
            ) {
              return { x: 0, y: 0 }; // No change for unspecified points
            }
            return { x: -contactPoint.vel.x, y: -contactPoint.vel.y };
          }

          case "teleport_sled_to_rider": {
            // Only affect sled contact points
            if (!sled.includes(currentContactPoint)) {
              return { x: 0, y: 0 };
            }

            // Find center of rider (BUTT position is a good reference)
            const buttPoint = riderData.points[ContactPoints.BUTT];

            // Map sled points to rider relative positions
            let targetX, targetY;
            switch (currentContactPoint) {
              case ContactPoints.PEG:
                // PEG goes to BUTT position
                targetX = buttPoint.pos.x;
                targetY = buttPoint.pos.y;
                break;
              case ContactPoints.TAIL:
                // TAIL goes behind BUTT
                targetX = buttPoint.pos.x - 10;
                targetY = buttPoint.pos.y;
                break;
              case ContactPoints.NOSE:
                // NOSE goes in front of BUTT
                targetX = buttPoint.pos.x + 10;
                targetY = buttPoint.pos.y;
                break;
              case ContactPoints.STRING:
                // STRING goes above BUTT
                targetX = buttPoint.pos.x;
                targetY = buttPoint.pos.y - 5;
                break;
            }

            if (gravity.maintainVelocity) {
              const accelX = targetX - contactPoint.pos.x - contactPoint.vel.x;
              const accelY = targetY - contactPoint.pos.y - contactPoint.vel.y;
              return { x: accelX, y: accelY };
            } else {
              const accelX = targetX - contactPoint.pos.x;
              const accelY = targetY - contactPoint.pos.y;
              return { x: accelX, y: accelY };
            }
          }

          case "cancel_sled_to_rider": {
            // Only affect sled contact points
            if (!sled.includes(currentContactPoint)) {
              return { x: 0, y: 0 };
            }

            // Find center of rider (BUTT position)
            const buttPoint = riderData.points[ContactPoints.BUTT];

            // Calculate reverse acceleration
            let targetX, targetY;
            switch (currentContactPoint) {
              case ContactPoints.PEG:
                targetX = buttPoint.pos.x;
                targetY = buttPoint.pos.y;
                break;
              case ContactPoints.TAIL:
                targetX = buttPoint.pos.x - 10;
                targetY = buttPoint.pos.y;
                break;
              case ContactPoints.NOSE:
                targetX = buttPoint.pos.x + 10;
                targetY = buttPoint.pos.y;
                break;
              case ContactPoints.STRING:
                targetX = buttPoint.pos.x;
                targetY = buttPoint.pos.y - 5;
                break;
            }

            const origAccelX = gravity.maintainVelocity
              ? targetX - contactPoint.pos.x + contactPoint.vel.x
              : targetX - contactPoint.pos.x;
            const origAccelY = gravity.maintainVelocity
              ? targetY - contactPoint.pos.y + contactPoint.vel.y
              : targetY - contactPoint.pos.y;
            return { x: -origAccelX, y: -origAccelY };
          }

          case "teleport_rider_to_sled": {
            // Only affect rider body contact points
            if (!rider.includes(currentContactPoint)) {
              return { x: 0, y: 0 };
            }

            // Find center of sled (PEG position)
            const pegPoint = riderData.points[ContactPoints.PEG];

            // Map rider points to sled relative positions
            let targetX, targetY;
            switch (currentContactPoint) {
              case ContactPoints.BUTT:
                // BUTT goes to PEG position
                targetX = pegPoint.pos.x;
                targetY = pegPoint.pos.y;
                break;
              case ContactPoints.SHOULDER:
                // SHOULDER goes above PEG
                targetX = pegPoint.pos.x;
                targetY = pegPoint.pos.y - 10;
                break;
              case ContactPoints.LHAND:
                // Left hand to left of PEG
                targetX = pegPoint.pos.x - 8;
                targetY = pegPoint.pos.y - 5;
                break;
              case ContactPoints.RHAND:
                // Right hand to right of PEG
                targetX = pegPoint.pos.x + 8;
                targetY = pegPoint.pos.y - 5;
                break;
              case ContactPoints.LFOOT:
                // Left foot below and left of PEG
                targetX = pegPoint.pos.x - 5;
                targetY = pegPoint.pos.y + 8;
                break;
              case ContactPoints.RFOOT:
                // Right foot below and right of PEG
                targetX = pegPoint.pos.x + 5;
                targetY = pegPoint.pos.y + 8;
                break;
            }

            if (gravity.maintainVelocity) {
              const accelX = targetX - contactPoint.pos.x - contactPoint.vel.x;
              const accelY = targetY - contactPoint.pos.y - contactPoint.vel.y;
              return { x: accelX, y: accelY };
            } else {
              const accelX = targetX - contactPoint.pos.x;
              const accelY = targetY - contactPoint.pos.y;
              return { x: accelX, y: accelY };
            }
          }

          case "cancel_rider_to_sled": {
            // Only affect rider body contact points
            if (!rider.includes(currentContactPoint)) {
              return { x: 0, y: 0 };
            }

            // Find center of sled (PEG position)
            const pegPoint = riderData.points[ContactPoints.PEG];

            // Calculate reverse acceleration
            let targetX, targetY;
            switch (currentContactPoint) {
              case ContactPoints.BUTT:
                targetX = pegPoint.pos.x;
                targetY = pegPoint.pos.y;
                break;
              case ContactPoints.SHOULDER:
                targetX = pegPoint.pos.x;
                targetY = pegPoint.pos.y - 10;
                break;
              case ContactPoints.LHAND:
                targetX = pegPoint.pos.x - 8;
                targetY = pegPoint.pos.y - 5;
                break;
              case ContactPoints.RHAND:
                targetX = pegPoint.pos.x + 8;
                targetY = pegPoint.pos.y - 5;
                break;
              case ContactPoints.LFOOT:
                targetX = pegPoint.pos.x - 5;
                targetY = pegPoint.pos.y + 8;
                break;
              case ContactPoints.RFOOT:
                targetX = pegPoint.pos.x + 5;
                targetY = pegPoint.pos.y + 8;
                break;
            }

            const origAccelX = gravity.maintainVelocity
              ? targetX - contactPoint.pos.x + contactPoint.vel.x
              : targetX - contactPoint.pos.x;
            const origAccelY = gravity.maintainVelocity
              ? targetY - contactPoint.pos.y + contactPoint.vel.y
              : targetY - contactPoint.pos.y;
            return { x: -origAccelX, y: -origAccelY };
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
    introRiders: generateRiderArray(introRider, 2, {
      startPosition: (pos, i) => ({
        x: pos.x + Math.cos((i * Math.PI) / 4) * 30,
        y: pos.y + Math.sin((i * Math.PI) / 4) * 30,
      }),
    }),
  };

  // ==== PART 12: APPLY GRAVITY EFFECTS ====
  // IMPORTANT: Set initial gravity at frame 0 for all riders
  applyGravity(riders.introRiders, [0, 0, 0], setGravityFn({ x: 0, y: 0.15 }));

  // Apply scarf-specific gravity at frame 0
  applyGravity(
    riders.introRiders,
    [0, 0, 0],
    setGravityFn({ x: 0, y: -50, contactPoints: scarf }),
  );

  // Example: Pop effect with contact-specific gravity
  applyGravity(
    riders.introRiders,
    [0, 1, 0],
    popFn({ x: 2, y: 0, contactPoints: notScarf }),
    (i) => 5 * i,
  );

  // Example: Teleport sled points
  applyGravity(
    riders.introRiders,
    [0, 5, 0],
    teleportTo({ x: 100, y: -100, contactPoints: sled }),
    (i) => 30 * i,
  );

  // Example: Teleport sled to rider position
  applyGravity(
    riders.introRiders,
    [0, 10, 0],
    teleportSledToRider(true), // maintain velocity
    (i) => 40 * i,
  );

  // Example: Teleport rider to sled position
  applyGravity(
    riders.introRiders,
    [0, 15, 0],
    teleportRiderToSled(true), // stop after teleport
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
    teleportToAndStop,
    teleportByAndStop,
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
