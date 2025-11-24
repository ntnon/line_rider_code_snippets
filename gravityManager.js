(() => {
  console.log("Initializing workspace...");
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

  // Interval functions for timing
  const intervalFns = {
    full: (i) => trueFPB * i,
    half: (i) => (trueFPB / 2) * i,
    quarter: (i) => (trueFPB / 4) * i,
    eighth: (i) => (trueFPB / 8) * i,
    sixteenth: (i) => (trueFPB / 16) * i,
  };

  // Gravity effect functions
  const teleportFn = (x, y, contactPoints) => {
    return (t, g) => [
      [t + 0, { x: x, y: y, contactPoints }],
      [t + 1, { x: -x, y: -y, contactPoints }],
      [t + 2, g],
    ];
  };

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

  // Filter functions for selective operations
  const filterFns = {
    even: (i) => i % 2 == 0,
    odd: (i) => i % 2 !== 0,
    all: (i) => true,
    first: (i) => i === 0,
    tail: (i) => i !== 0,
  };

  // Create riders
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

  const secondRider = introRider.copy();
  secondRider.id = "secondRider";
  secondRider.startPosition = { x: 100, y: 800 };

  const riders = {
    introRiders: generateRiderArray(introRider, 8),
    secondRiders: generateRiderArray(secondRider, 8),
  };

  // Apply gravity effects to riders
  // FirstRider
  applyGravity(riders.introRiders, [0, 0, 0], setGravityFn({ x: 0, y: 0 }));
  applyGravity(
    riders.introRiders,
    [0, 2, 0],
    popFn({ x: 2, y: 0 }),
    (i) => 128 * i,
  );
  applyGravity(
    riders.introRiders,
    [0, 35, 2],
    popFn({ x: -0.001, y: 0 }),
    (i) => 128 * i,
  );

  // SecondRider
  applyGravity(riders.secondRiders, [0, 0, 0], setGravityFn({ x: 0, y: 0 }));
  applyGravity(
    riders.secondRiders,
    [0, 35, 0],
    setGravityFn(introRider.defaultGravity),
    (i) => 128 * i,
  );

  // IntroRider + SecondRider
  applyGravity(
    riders.secondRiders.concat(riders.introRiders),
    [1, 1, 0],
    popFn({ x: 0, y: -0.00000001 }),
    (i) => 32 * i,
  );

  // Commit changes to the track
  if (window.Actions) {
    const allRiders = Object.values(riders).flat();
    const allGravityKeyframes = allRiders.map((r) => r.getGravityKeyframes());
    console.log(allGravityKeyframes);
    window.Actions.setRiders(allRiders);
    setCustomGravity(allGravityKeyframes);
    window.Actions.commitTrackChanges();
  }
})();
