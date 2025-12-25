// ==UserScript==

// @name         RiderManager API
// @namespace    https://www.linerider.com/
// @author       Anton Nydal
// @description  Exposes RiderManager API
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  _
// @updateURL    _
// @homepageURL  _
// @supportURL   _
// @grant        none

// ==/UserScript==

(function() {
    'use strict';

    const RiderManager = (() => {
        let riders = [];

        function getRiders() {
            return riders;
        }

        function setRiders(newRiders) {
            riders = newRiders;
            if (window.Actions && typeof window.Actions.setRiders === "function") {
                window.Actions.setRiders(riders);
            }
        }

        function addRider(rider) {
            riders.push(rider);
            if (window.Actions && typeof window.Actions.addRider === "function") {
                window.Actions.addRider(rider);
            }
        }

        function makeRider(group, props = {}) {
            if (!group) throw new Error("Rider must have a group. Either 'grup' or ['group1', 'group2']");
            const groupArray = Array.isArray(groups) ? groups : [groups];
            return {
                groups: groupArray,
                startPosition: props.startPosition || { x: 0, y: 0 },
                startVelocity: props.startVelocity || { x: 0, y: 0.4 },
                startAngle: props.startAngle || 0,
                copy() {
                    return makeRider([...this.groups], {
                        startPosition: { ...this.startPosition },
                        startVelocity: { ...this.startVelocity },
                        startAngle: this.startAngle,
                        ...props
                    });
                },
                ...props
            };
        }

        function repeatRider(rider, count, group, modifiers = {}) {
            if (!groups) throw new Error("Rider must have a group (string or array)");
            const groupArray = Array.isArray(groups) ? groups : [groups];
            return Array.from({ length: count }, (_, i) => {
                const newRider = { ...rider, groups: groupArray };
                if (modifiers.startPosition)
                    newRider.startPosition = modifiers.startPosition(rider.startPosition, i);
                if (modifiers.startVelocity)
                    newRider.startVelocity = modifiers.startVelocity(rider.startVelocity, i);
                if (modifiers.startAngle)
                    newRider.startAngle = modifiers.startAngle(rider.startAngle, i);
                if (modifiers.groups)
                    newRider.groups = modifiers.groups(newRider.groups, i);
                return newRider;
            });
        }

        function addToGroup(groupName, ridersToAdd) {
            const toAdd = Array.isArray(ridersToAdd) ? ridersToAdd : [ridersToAdd];
            toAdd.forEach(rider => {
                if (!rider.groups) rider.groups = [];
                if (!rider.groups.includes(groupName)) {
                    rider.groups.push(groupName);
                }
            });
        }

        function removeFromGroup(groupName, ridersToRemove) {
            const toRemove = Array.isArray(ridersToRemove) ? ridersToRemove : [ridersToRemove];
            toRemove.forEach(rider => {
                if (rider.groups) {
                    rider.groups = rider.groups.filter(g => g !== groupName);
                }
            });
        }

        function getGroup(groupName) {
            return riders.filter(rider => rider.groups && rider.groups.includes(groupName));
        }

        function allGroups() {
            const groupMap = {};
            riders.forEach(rider => {
                if (Array.isArray(rider.groups)) {
                    rider.groups.forEach(group => {
                        if (!groupMap[group]) groupMap[group] = [];
                        groupMap[group].push(rider);
                    });
                }
            });
            return groupMap;
        }

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
        };
    })();

    window.RiderManager = RiderManager;
})();
