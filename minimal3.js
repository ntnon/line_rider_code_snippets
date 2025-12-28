(() => {

    const RiderManager = (() => {

        function getRiders() {
            return Selectors.getRiders();
        }

        function setRiders(newRiders) {
            const ridersArr = Array.isArray(newRiders) ? newRiders : [newRiders];
            Actions.setRiders(ridersArr);
            Actions.commitTrackChanges();
        }

        function addRider(riderOrArray) {
            const toAdd = Array.isArray(riderOrArray) ? riderOrArray : [riderOrArray];
            const current = RiderManager.getRiders();
            RiderManager.setRiders([...current, ...toAdd]);
        }

        function clearRiders() {
            RiderManager.setRiders([]);
        }

        function getContactPoints(groupName = null) {
            const allRiders = RiderManager.getRiders();
            const groupSize = 17;
            const contactPoints = [];

            allRiders.forEach((rider, i) => {
                if (groupName === null || RiderManager.getGroup(groupName).includes(rider)) {
                    for (let j = 0; j < groupSize; j++) {
                        contactPoints.push(i * groupSize + j);
                    }
                }
            });

            return contactPoints;
        }


        function makeRider(groups, props = {}) {
            if (!groups) throw new Error("Rider must have a group. Either 'group' or ['group1', 'group2']");
            const groupSet = groups instanceof Set ? new Set(groups) : new Set(Array.isArray(groups) ? groups : [groups]);
            return {
                groups: groupSet,
                startPosition: props.startPosition || {x: 0, y: 0},
                startVelocity: props.startVelocity || {x: 0, y: 0},
                startAngle: props.startAngle || 0,
                copy() {
                    return RiderManager.makeRider(new Set(this.groups), {
                        startPosition: {...this.startPosition},
                        startVelocity: {...this.startVelocity},
                        startAngle: this.startAngle,
                        ...props
                    });
                },
                ...props
            };
        }

        function repeatRider(rider, count, groups, modifiers = {}) {
            if (!groups) throw new Error("Rider must have a group (string or array)");
            const groupSet = groups instanceof Set ? new Set(groups) : new Set(Array.isArray(groups) ? groups : [groups]);
            const result = [];
            for (let i = 0; i < count; i++) {
                const props = {
                    startPosition: modifiers.startPosition
                        ? modifiers.startPosition(rider.startPosition, i)
                        : { ...rider.startPosition },
                    startVelocity: modifiers.startVelocity
                        ? modifiers.startVelocity(rider.startVelocity, i)
                        : { ...rider.startVelocity },
                    startAngle: modifiers.startAngle
                        ? modifiers.startAngle(rider.startAngle, i)
                        : rider.startAngle,
                    ...Object.fromEntries(
                        Object.entries(rider)
                            .filter(([k]) => !["groups", "startPosition", "startVelocity", "startAngle", "copy"].includes(k))
                    )
                };
                let thisGroups = new Set(groupSet);
                if (modifiers.groups) {
                    thisGroups = modifiers.groups(new Set(thisGroups), i);
                }
                result.push(RiderManager.makeRider(thisGroups, props));
            }
            return result;
        }

        function addToGroup(groupName, ridersToAdd) {
            const toAdd = Array.isArray(ridersToAdd) ? ridersToAdd : [ridersToAdd];
            toAdd.forEach(rider => {
                rider.groups = rider.groups instanceof Set ? rider.groups : new Set(rider.groups ? rider.groups : []);
                rider.groups.add(groupName);
            });
        }

        function removeFromGroup(groupName, ridersToRemove) {
            const toRemove = Array.isArray(ridersToRemove) ? ridersToRemove : [ridersToRemove];
            toRemove.forEach(rider => {
                if (rider.groups instanceof Set) {
                    rider.groups.delete(groupName);
                }
            });
        }

        function getGroup(groupName) {
            return RiderManager.getRiders().filter(rider => rider.groups instanceof Set && rider.groups.has(groupName));
        }

        function allGroups() {
            const groupMap = {};
            RiderManager.getRiders().forEach(rider => {
                if (rider.groups instanceof Set) {
                    for (const group of rider.groups) {
                        if (!groupMap[group]) groupMap[group] = [];
                        groupMap[group].push(rider);
                    }
                }
            });
            return groupMap;
        }

        window.makeRider = makeRider;
        window.repeatRider = repeatRider;
        window.getRiders = getRiders;
        window.setRiders = setRiders;
        window.addRider = addRider;
        window.addToGroup = addToGroup;
        window.removeFromGroup = removeFromGroup;
        window.getGroup = getGroup;
        window.allGroups = allGroups;
        window.getContactPoints = getContactPoints;
        window.clearRiders = clearRiders;


        return {
            getRiders,
            setRiders,
            addRider,
            addToGroup,
            removeFromGroup,
            getGroup,
            allGroups,
            makeRider,
            repeatRider,
            getContactPoints,
            clearRiders
        };
    })();
    clearRiders();
    addRider(makeRider("default", {startPosition: {x: 0, y: 15}}));
    addRider(
        repeatRider(
            makeRider("default"),
            5,
            "group1",
            { startPosition: (pos, i) => ({ x: -i * 20, y: -i * 20 }) }
        )
    );
    console.log(getRiders());
    addRider(makeRider("default", {startPosition: {x: -10, y: 15}}));
    console.log(getRiders());
    console.log("Group 1: ", getGroup("group1"));
    console.log("Default: ", getGroup("default"));

})();


(() => {
    window.store.getState().camera.playbackFollower._frames.length = 0;
    window.store.getState().simulator.engine.engine._computed._frames.length = 1;
    const currentIndex = store.getState().player.index;
    store.dispatch({ type: "SET_PLAYER_INDEX", payload: 0 });
    requestAnimationFrame(() =>
        store.dispatch({ type: "SET_PLAYER_INDEX", payload: currentIndex }),
    );

    const FRAMES_PER_SECOND = 40;
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

    function timestampToFrames([minutes, seconds, remainingFrames]) {
        return (
            minutes * FRAMES_PER_SECOND * 60 +
            seconds * FRAMES_PER_SECOND +
            remainingFrames
        );
    }

    /**
     * Helper function to calculate target position for a contact point
     */
    function calculateTargetPosition({
                                         contactPoint,
                                         anchorPoint = null,
                                         targetPosition,
                                         isAbsolute,
                                         shape,
                                         rotation = 0,
                                         riderData,
                                     }) {
        // Determine anchor (default to PEG)
        let anchor;
        if (anchorPoint !== null && anchorPoint !== undefined) {
            anchor = anchorPoint;
        } else {
            const keys = Object.keys(riderData.points);
            if (keys.length === 0) throw new Error("No points in riderData");
            anchor = keys[0];
        }

        // Use provided shape or fallback to current
        const shapeToUse = resolveShape(shape, riderData, anchor);

        // Get offsets in the shape
        const anchorOffset = shapeToUse[anchor];
        const contactPointOffset = shapeToUse[contactPoint];

        // Calculate relative offset from anchor to contact point
        let relativeOffset = {
            x: contactPointOffset.x - anchorOffset.x,
            y: contactPointOffset.y - anchorOffset.y,
        };

        // Apply rotation if needed
        if (rotation !== 0) {
            relativeOffset = rotateOffset(relativeOffset, rotation);
        }

        if (isAbsolute && targetPosition !== null) {
            // Place anchor at absolute position, maintain shape for other points
            return {
                x: targetPosition.x + relativeOffset.x,
                y: targetPosition.y + relativeOffset.y,
            };
        }

        // Relative mode: anchor is at current position, add offset if provided
        const anchorData = riderData.points[anchor];
        const anchorPosition = {
            x: anchorData.pos.x + anchorData.vel.x,
            y: anchorData.pos.y + anchorData.vel.y,
        };
        const positionOffset = targetPosition && !isAbsolute ? targetPosition : { x: 0, y: 0 };
        console.log("anchor:", anchor, "anchorData:", anchorData, "targetPosition:", targetPosition, "relativeOffset:", relativeOffset);

        return {
            x: anchorPosition.x + relativeOffset.x + positionOffset.x,
            y: anchorPosition.y + relativeOffset.y + positionOffset.y,
        };
    }

    function resolveShape(shape, riderData, anchor) {
        return shape || buildCurrentShape(riderData, anchor);
    }

    function rotateOffset(offset, angleDegrees) {
        const angleRadians = angleDegrees * (Math.PI / 180);
        const cos = Math.cos(angleRadians);
        const sin = Math.sin(angleRadians);

        return {
            x: offset.x * cos - offset.y * sin,
            y: offset.x * sin + offset.y * cos,
        };
    }

    // Helper to build current shape from riderData
    function buildCurrentShape(riderData, anchor) {
        const anchorPos = riderData.points[anchor].pos;
        const shape = {};
        for (const cp in riderData.points) {
            const p = riderData.points[cp].pos;
            shape[cp] = { x: p.x - anchorPos.x, y: p.y - anchorPos.y };
        }
        return shape;
    }

    function applyGravity(
        baseTimestamp,
        contactPoints,
        keyframeFn,
        intervalFn = () => 0
    ) {
        if (!Array.isArray(contactPoints)) throw new Error("contactPoints must be an array");
        if (!Array.isArray(baseTimestamp)) throw new Error("baseTimestamp must be an array [minutes, seconds, frames]");

        const timeAsFrames = timestampToFrames(baseTimestamp);
        const groupSize = 17;
        const numGroups = Math.ceil(contactPoints.length / groupSize);

        const validate = keyframes =>
            Array.isArray(keyframes) &&
            keyframes.every(
                kf => Array.isArray(kf) && (kf.length === 3 || kf.length === 4)
            );

        const needsGrouping = Array.from({ length: numGroups }, (_, i) => intervalFn(i)).some(Boolean);

        if (!needsGrouping) {
            const keyframes = keyframeFn(timeAsFrames, contactPoints);
            if (!validate(keyframes)) throw new Error("Keyframe must be [time, contactPoints, effect]");
            return keyframes;
        }

        return Array.from({ length: numGroups }, (_, i) => {
            const group = contactPoints.slice(i * groupSize, (i + 1) * groupSize);
            const t = timeAsFrames + intervalFn(i);
            const keyframes = keyframeFn(t, group);
            if (!validate(keyframes)) throw new Error("Keyframe must be [time, contactPoints, effect]");
            return keyframes;
        }).flat();
    }

    // const keyframeContext = {
    //         contactPoint,
    //         riderData,
    //         contactPointData,
    //         lastGravity
    // }


    const setGravity = ({x, y}) =>
        (t, cp = all) => [[t, cp, (_keyframeContext) => ({x, y})]];

    const pulseGravity = ({x, y}, duration = 0) =>
        (t, cp = all) => [
            [t, cp, (_keyframeContext) => ({x, y}), true],
            [t + duration + 1, cp, (keyframeContext) => keyframeContext.lastGravity, true],
        ];

    const teleport = ({
                          anchorPoint = null,
                          position = null,
                          isAbsolute = false,
                          shape = null,
                          rotation = 0,
                          exitVelocity = null,
                      }) =>
        (t, cp = all) => [
            [
                t,
                cp,
                (keyframeContext) => {

                    const anchor = anchorPoint !== null ? anchorPoint : ContactPoints.PEG;
                    const shapeToUse = shape || buildCurrentShape(keyframeContext.riderData, anchor);

                    const targetPos = calculateTargetPosition({
                        contactPoint: keyframeContext.contactPoint,
                        anchorPoint: anchorPoint,
                        targetPosition: position,
                        isAbsolute: isAbsolute,
                        shape: shapeToUse,
                        rotation: rotation,
                    });

                    return {
                        x: targetPos.x - keyframeContext.contactPointData.pos.x - keyframeContext.contactPointData.vel.x,
                        y: targetPos.y - keyframeContext.contactPointData.pos.y - keyframeContext.contactPointData.vel.y,
                    };
                },
                true
            ],

            [
                t + 1,
                cp,
                (keyframeContext) => {

                    let velocityChange = {
                        x: -keyframeContext.contactPointData.vel.x,
                        y: -keyframeContext.contactPointData.vel.y,
                    };
                    if (exitVelocity) {
                        velocityChange.x += exitVelocity.x;
                        velocityChange.y += exitVelocity.y;
                    }
                    return velocityChange;
                },
                true
            ],

            [
                t + 2,
                cp,
                (keyframeContext) => keyframeContext.lastGravity,
                true
            ],
        ];


    const Intervals = {
        simultaneous: () => 0,
        stagger: (frames) => (i) => i * frames,
        exponential:
            (base, scale = 1) =>
                (i) =>
                    Math.pow(base, i) * scale,
        sine: (period, amplitude) => (i) => Math.sin(i * period) * amplitude,
    };

    function getLastKnownGravity(keyframes, frameIndex, globalCpIndex, context = {}) {
        let lastGravity = null;
        for (const [timestamp, cps, gravityFn, computed] of keyframes) {
            if (computed === true) continue;
            const frame = Array.isArray(timestamp) ? timestampToFrames(timestamp) : timestamp;
            if (frame > frameIndex) break; // changed from >= to >
            if (cps.includes(globalCpIndex)) {
                lastGravity = gravityFn({ ...context, frameIndex, globalCpIndex, lastGravity });
            }
        }
        return lastGravity;
    }

    function getGravityForContactPoint({ keyframes, frameIndex, globalCpIndex, context }) {
        let lastGravity = null;
        for (const [timestamp, cps, gravityFn, computed] of keyframes) {
            const frame = Array.isArray(timestamp) ? timestampToFrames(timestamp) : timestamp;
            if (frame > frameIndex) break;
            if (!cps.includes(globalCpIndex)) continue;

            // For computed keyframes, use the last non-computed gravity as fallback
            if (computed) {
                lastGravity = gravityFn({ ...context, frameIndex, globalCpIndex, lastGravity: getLastKnownGravity(keyframes, frame, globalCpIndex, context) });
            } else {
                lastGravity = gravityFn({ ...context, frameIndex, globalCpIndex, lastGravity });
            }
        }
        if (!lastGravity) {
            console.error("No gravity found for contact point", { globalCpIndex, frameIndex, keyframes });
            throw new Error("No gravity found for contact point");
        }
        return lastGravity;
    }


    Object.defineProperty(window.$ENGINE_PARAMS, "gravity", {
        get() {
            const frameIndex =
                store.getState().simulator.engine.engine._computed._frames.length;

            const riders =
                store.getState().simulator.engine.engine.state.riders || [];
            const numRiders = riders.length;
            if (numRiders === 0) {
                console.log("No riders found, returning default gravity");
                return { x: 0, y: 0.175 };
            }

            const iterationsPerRider = 17;
            const globalIteration = (window.__gravityIterationCounter =
                (window.__gravityIterationCounter || 0) + 1);

            const currentRiderIndex =
                Math.floor((globalIteration - 1) / iterationsPerRider) % numRiders;
            const currentContactPoint = (globalIteration - 1) % iterationsPerRider;

            const globalCpIndex = currentRiderIndex * 17 + currentContactPoint;

            const allKeyframes = window.allGravityKeyframes || [];

            
            return getGravityForContactPoint({
                keyframes: allKeyframes,
                frameIndex,
                globalCpIndex,
                context: {
                    // Add any additional context needed by gravity functions here
                }
            });
        }
    });


    const f = applyGravity(
        [0, 0, 0],
        getContactPoints("default"),
        pulseGravity({ x: 0, y: -3}),
        //Intervals.stagger(16)
    );

    const e = applyGravity(
        [0, 0, 0],
        getContactPoints("group1"),
        teleport({position: { x: 0, y: -20}}),
        Intervals.exponential(10, 10)
    );


    window.allGravityKeyframes = [
        applyGravity(
            [0, 0, 0],
            getContactPoints(),
            setGravity({ x: 0, y: -0.1 }),
            //Intervals.stagger(16)
        ),
        applyGravity(
            [0, 2, 0],
            getContactPoints(),
            pulseGravity({ x: 0.5, y: 10 }),
            //Intervals.stagger(16)
        ),
        applyGravity(
            [0, 2, 0],
            getContactPoints(),
            setGravity({ x: -0.05, y: 0.05 }),
            Intervals.stagger(16)
        ),

    ].flat();
console.log("all keyframes: ", window.allGravityKeyframes)

})();