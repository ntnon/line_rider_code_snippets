(() => {
  console.log("Initializing workspace...");
  const zero_vector = { x: 0, y: 0 };
  const default_pop_force = { x: 0, y: 0.1 };
  const default_wait = 40;
  const globalStartGravity = { x: 0, y: 0.15 };
  const FRAMES_PER_SECOND = 40;

  const playbackSpeed = 1.04;
  const trueFPB = 40 / playbackSpeed; // playbackSpeed = 1.04

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

  function addTimestamps(a, b) {
    const aFrames = Array.isArray(a) ? timestampToFrames(a) : a;
    const bFrames = Array.isArray(b) ? timestampToFrames(b) : b;
    const totalFrames = aFrames + bFrames;
    return framesToTimestamp(totalFrames);
  }

  class GravityKeyframe {
    constructor(timestamp, acceleration) {
      this.keyframe = [
        Array.isArray(timestamp) ? timestamp : framesToTimestamp(timestamp),
        acceleration,
      ];
    }
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

    sortKeyframes() {
      this.gravityKeyframes.sort((a, b) => a[0] - b[0]);
    }

    addGravityKeyframes(keyframes) {
      if (!Array.isArray(keyframes)) {
        throw new Error("keyframes must be an array");
      }
      if (!keyframes.every((k) => Array.isArray(k) && k.length === 2)) {
        throw new Error(
          "keyframes must be an array of arrays with two elements",
        );
      }
      this.gravityKeyframes.push(...keyframes);
      this.sortKeyframes();
    }

    getGravityKeyframes() {
      return this.gravityKeyframes.map(([frames, accel]) => [
        framesToTimestamp(frames),
        accel,
      ]);
    }

    copy() {
      return new Rider(
        this.id,
        { ...this.startPosition },
        { ...this.startVelocity },
        this.remountable,
        this.startAngle,
        this.defaultGravity,
      );
    }
  }

  function applyGravity(
    riders,
    baseTimestamp = null,
    keyframeFn,
    intervalFn = (i) => 0,
  ) {
    if (!riders) throw new Error("riders is required");
    if (!Array.isArray(riders)) {
      riders = [riders];
    }

    let timeAsFrames = Array.isArray(baseTimestamp)
      ? timestampToFrames(baseTimestamp)
      : baseTimestamp;

    const keyframesPerRider = riders.map((rider, i) => {
      const t = timeAsFrames + intervalFn(i);
      return keyframeFn(t, rider.defaultGravity);
    });

    riders.forEach((rider, i) => {
      rider.addGravityKeyframes(keyframesPerRider[i]);
    });
  }

  function generateRiderArray(originalRider, count, modifiers = {}) {
    if (!originalRider.id) throw new Error("Base rider must have an id");

    const riders = [];

    for (let i = 0; i < count; i++) {
      const newId = originalRider.id + "_" + i;

      let startPosition = { ...originalRider.startPosition };
      let startVelocity = { ...originalRider.startVelocity };
      let startAngle = originalRider.startAngle;
      let defaultGravity = { ...originalRider.defaultGravity };

      if (modifiers.startPosition)
        startPosition = modifiers.startPosition(startPosition, i);
      if (modifiers.startVelocity)
        startVelocity = modifiers.startVelocity(startVelocity, i);
      if (modifiers.startAngle)
        startAngle = modifiers.startAngle(startAngle, i);
      riders.push(
        new Rider(
          newId,
          startPosition,
          startVelocity,
          originalRider.remountable,
          startAngle,
          defaultGravity,
        ),
      );
    }

    return riders;
  }

  // frames per beat

  const intervalFns = {
    full: (i) => trueFPB * i,
    half: (i) => (trueFPB / 2) * i,
    quarter: (i) => (trueFPB / 4) * i,
    eighth: (i) => (trueFPB / 8) * i,
    sixteenth: (i) => (trueFPB / 16) * i,
  };

  const teleportFn = (x, y) => {
    return (t, g) => [
      [t + 0, { x: x, y: y }],
      [t + 1, { x: -x, y: -y }],
      [t + 2, g],
    ];
  };

  const popFn = ({ x, y }, duration = 0) => {
    return (t, g) => [
      [t + 0, { x, y }],
      [t + duration + 1, g],
    ];
  };

  const setGravityFn = ({ x, y }) => {
    return (t, g) => [[t, { x, y }]];
  };

  const defaultGravityFn = (t, g) => [[t, g]];

  const filterFns = {
    even: (i) => i % 2 == 0,
    odd: (i) => i % 2 !== 0,
    all: (i) => true,
    first: (i) => i === 0,
    tail: (i) => i !== 0,
  };

  const kramRider = new Rider();
  kramRider.id = "kramRider";
  kramRider.startAngle = 90;

  const introRider = new Rider();
  introRider.id = "introRider";
  introRider.startPosition = { x: 0, y: 300 };
  introRider.startVelocity = { x: 0, y: 0 };
  introRider.remountable = true;
  introRider.startAngle = 0;
  introRider.defaultGravity = { x: 0, y: 0.15 };

  const secondRider = introRider.copy();
  secondRider.id = "secondRider";
  secondRider.startPosition = { x: 100, y: 800 };

  const riders = {
    //firstRider: introRider.copy(),
    //krams: generateRiderArray(kramRider, 5),
    introRiders: generateRiderArray(introRider, 8),
    secondRiders: generateRiderArray(secondRider, 8),
  };

  /*
  applyGravity(riders.krams, [0, 0, 0], setGravityFn(0, 0));
  applyGravity(riders.krams, [0, 1, 24], popFn(30, 0), (i) => 127 * i);
*/
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

  //SecondRider
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

  if (window.Actions) {
    const allRiders = Object.values(riders).flat();
    let allGravityKeyframes = allRiders.map((r) => r.getGravityKeyframes());
    console.log(allGravityKeyframes);
    window.Actions.setRiders(allRiders);
    setCustomGravity(allGravityKeyframes);
    window.Actions.commitTrackChanges();
  }
})();
