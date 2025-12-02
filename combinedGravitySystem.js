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

  // ==== PART 2: CACHE RESET ====
  window.store.getState().camera.playbackFollower._frames.length = 0;
  window.store.getState().simulator.engine.engine._computed._frames.length = 1;
  const currentIndex = store.getState().player.index;
  store.dispatch({ type: "SET_PLAYER_INDEX", payload: 0 });
  requestAnimationFrame(() =>
    store.dispatch({ type: "SET_PLAYER_INDEX", payload: currentIndex }),
  );

  // ==== PART 3: GRAVITY SYSTEM WITH CONTACT POINTS ====
  const GRAVITY_SYSTEM = {
    iterationCounter: 0,
    keyframesByRider: [],
    FRAMES_PER_SECOND: 40,
    contactPointStates: {},
    lastFrameIndex: -1,

    timestampToFrames([minutes, seconds, frames]) {
      return (
        minutes * this.FRAMES_PER_SECOND * 60 +
        seconds * this.FRAMES_PER_SECOND +
        frames
      );
    },

    initRiderStates(riderIndex) {
      if (!this.contactPointStates[riderIndex]) {
        this.contactPointStates[riderIndex] = {};
        for (let i = 0; i < 17; i++) {
          this.contactPointStates[riderIndex][i] = { x: 0, y: 0.175 };
        }
      }
    },

    updateStatesAtFrame(frameIndex) {
      if (frameIndex === this.lastFrameIndex) return;
      this.lastFrameIndex = frameIndex;

      for (
        let riderIndex = 0;
        riderIndex < this.keyframesByRider.length;
        riderIndex++
      ) {
        this.initRiderStates(riderIndex);
        const riderKeyframes = this.keyframesByRider[riderIndex];
        if (!riderKeyframes) continue;

        for (const [timestamp, gravity] of riderKeyframes) {
          const keyframeFrame = this.timestampToFrames(timestamp);

          if (keyframeFrame === frameIndex) {
            // Check if this is a computed gravity
            if (gravity.type === "computed") {
              // Store the computed gravity config for later evaluation
              for (let cp = 0; cp < 17; cp++) {
                this.contactPointStates[riderIndex][cp] = gravity;
              }
            } else if (
              !gravity.contactPoints ||
              gravity.contactPoints.length === 0
            ) {
              for (let cp = 0; cp < 17; cp++) {
                this.contactPointStates[riderIndex][cp] = {
                  x: gravity.x,
                  y: gravity.y,
                };
              }
            } else {
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

    getGravityForContact(riderIndex, contactPoint, frameIndex) {
      this.updateStatesAtFrame(frameIndex);
      this.initRiderStates(riderIndex);
      return (
        this.contactPointStates[riderIndex][contactPoint] || { x: 0, y: 0.175 }
      );
    },
  };

  // ==== PART 4: GRAVITY MANAGER CONSTANTS AND UTILITIES ====
  console.log("Initializing gravity system...");
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

  // Absolute eleportation function, maintain existing velocity
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
      [t + 1, { x: x, y: y, contactPoints: contactPoints }],
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

  // ==== PART 9: ENHANCED CUSTOM GRAVITY FUNCTION ====
  window.setCustomGravityWithContactPoints = function (keyframes) {
    GRAVITY_SYSTEM.contactPointStates = {};
    GRAVITY_SYSTEM.lastFrameIndex = -1;

    GRAVITY_SYSTEM.keyframesByRider = keyframes.map((riderKeyframes) => {
      return riderKeyframes.sort((a, b) => {
        const frameA = GRAVITY_SYSTEM.timestampToFrames(a[0]);
        const frameB = GRAVITY_SYSTEM.timestampToFrames(b[0]);
        return frameA - frameB;
      });
    });

    for (let frame = 0; frame <= 0; frame++) {
      GRAVITY_SYSTEM.updateStatesAtFrame(frame);
    }

    console.log(
      "Custom gravity with contact points initialized for",
      keyframes.length,
      "riders",
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
      if (numRiders === 0) return { x: 0, y: 0.175 };

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
      if (gravity.type === "computed") {
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
          return { x: 0, y: 0.175 };
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

            // Use first specified contact point as reference, or all points if none specified
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
              if (gravity.contactPoints.includes(currentContactPoint)) {
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

          case "cancelVelocity":
            // Check if this contact point should be affected
            if (
              gravity.contactPoints &&
              gravity.contactPoints.length > 0 &&
              !gravity.contactPoints.includes(currentContactPoint)
            ) {
              return { x: 0, y: 0 }; // No change for unspecified points
            }
            return { x: -contactPoint.vel.x, y: -contactPoint.vel.y };
          default:
            return { x: 0, y: 0.175 };
        }
      }

      return gravity;
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
    introRiders: generateRiderArray(introRider, 10, {
      startPosition: (pos, i) => ({
        x: pos.x + Math.cos((i * Math.PI) / 4) * 30,
        y: pos.y + Math.sin((i * Math.PI) / 4) * 30,
      }),
    }),
  };

  // ==== PART 12: APPLY GRAVITY EFFECTS ====
  // FirstRider
  applyGravity(riders.introRiders, [0, 0, 0], setGravityFn({ x: 0, y: 0 }));
  applyGravity(
    riders.introRiders,
    [0, 0, 0],
    setGravityFn({ x: 0, y: -50, contactPoints: scarf }),
  );

  applyGravity(
    riders.introRiders,
    [0, 1, 0],
    popFn({ x: 2, y: 0, contactPoints: notScarf }),
    (i) => 5 * i,
  );

  applyGravity(
    riders.introRiders,
    [0, 5, 0],
    teleportTo({ x: 100, y: -100, contactPoints: sled }),
    (i) => 30 * i,
  );

  // Teleport and stop (like landing on a platform)
  // applyGravity(
  //   riders.secondRiders,
  //   [0, 5, 0],
  //   teleportToAndStop({ x: 500, y: -200 }),
  //   (i) => 40 * i,
  // );

  // ==== PART 13: COMMIT CHANGES ====
  if (window.Actions) {
    const allRiders = Object.values(riders).flat();
    const allGravityKeyframes = allRiders.map((r) => r.getGravityKeyframes());
    console.log(allGravityKeyframes);
    window.Actions.setRiders(allRiders);
    setCustomGravity(allGravityKeyframes);
    window.Actions.commitTrackChanges();
  }

  // ==== PART 14: EXPORT USEFUL FUNCTIONS TO GLOBAL SCOPE ====
  window.GravitySystem = {
    Rider,
    applyGravity,
    generateRiderArray,
    setGravityFn,
    popFn,
    teleportTo,
    teleportBy,
    teleportToAndStop,
    teleportByAndStop,
    intervalFns,
    filterFns,
    ContactPoints,
    debugStates: () =>
      console.log(
        JSON.parse(JSON.stringify(GRAVITY_SYSTEM.contactPointStates)),
      ),
  };
})();
