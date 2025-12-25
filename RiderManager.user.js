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
                if (modifiers.groups)
                    rider.groups = modifiers.groups(rider.groups, i);

                return rider;
            });
        }

        return {
            getRiders,
            setRiders,
            addRider,
            addToGroup,
            removeFromGroup,
            getGroup,
            allGroups,
            generateRiderArray
        };
    })();

    window.RiderManager = RiderManager;
})();
