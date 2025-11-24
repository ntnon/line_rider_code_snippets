// Contact Points Reference for Line Rider
// Mapping of all 17 contact points (0-16) with their names and types

const ContactPoints = {
  // Collision Points (0-9)
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

  // Flutter Points - Scarf (10-16)
  SCARF_0: 10,
  SCARF_1: 11,
  SCARF_2: 12,
  SCARF_3: 13,
  SCARF_4: 14,
  SCARF_5: 15,
  SCARF_6: 16,
};

// Reverse mapping for getting names from indices
const ContactPointNames = {
  0: "PEG",
  1: "TAIL",
  2: "NOSE",
  3: "STRING",
  4: "BUTT",
  5: "SHOULDER",
  6: "RHAND",
  7: "LHAND",
  8: "LFOOT",
  9: "RFOOT",
  10: "SCARF_0",
  11: "SCARF_1",
  12: "SCARF_2",
  13: "SCARF_3",
  14: "SCARF_4",
  15: "SCARF_5",
  16: "SCARF_6",
};

// Point type classification
const ContactPointTypes = {
  COLLISION: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  SLED: [0, 1, 2, 3],
  BODY: [4, 5, 6, 7, 8, 9],
  FLUTTER: [10, 11, 12, 13, 14, 15, 16],
};

// Helper functions
const ContactPointHelpers = {
  isCollisionPoint: (id) => ContactPointTypes.COLLISION.includes(id),
  isFlutterPoint: (id) => ContactPointTypes.FLUTTER.includes(id),
  isScarfPoint: (id) => id >= 10 && id <= 16,
  getName: (id) => ContactPointNames[id] || "UNKNOWN",
  getId: (name) => ContactPoints[name] ?? -1,
  getTotalPoints: () => 17,
};

// Export for use in other scripts
if (typeof window !== "undefined") {
  window.ContactPoints = ContactPoints;
  window.ContactPointNames = ContactPointNames;
  window.ContactPointTypes = ContactPointTypes;
  window.ContactPointHelpers = ContactPointHelpers;
}

// For Node.js/module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ContactPoints,
    ContactPointNames,
    ContactPointTypes,
    ContactPointHelpers,
  };
}
