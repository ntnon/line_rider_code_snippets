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
        window.getContactPoints = getContactPointsForGroup;
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
