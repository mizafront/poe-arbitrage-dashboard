"use strict";

// Curated from @navali/poe1-divination-cards 3.28.2 (PoE Wiki data).
// Stage 1 intentionally contains only deterministic, named currency rewards.
export const FIXED_CURRENCY_CARD_CATALOG = Object.freeze(
[
  {
    "name": "A Sea of Blue",
    "stackSize": 3,
    "rewardName": "Orb of Alteration",
    "rewardQuantity": 13
  },
  {
    "name": "Abandoned Wealth",
    "stackSize": 5,
    "rewardName": "Exalted Orb",
    "rewardQuantity": 3
  },
  {
    "name": "Acclimatisation",
    "stackSize": 2,
    "rewardName": "Orb of Alteration",
    "rewardQuantity": 20
  },
  {
    "name": "Alluring Bounty",
    "stackSize": 7,
    "rewardName": "Exalted Orb",
    "rewardQuantity": 10
  },
  {
    "name": "Brother's Gift",
    "stackSize": 1,
    "rewardName": "Divine Orb",
    "rewardQuantity": 5
  },
  {
    "name": "Brother's Stash",
    "stackSize": 1,
    "rewardName": "Exalted Orb",
    "rewardQuantity": 5
  },
  {
    "name": "Chaotic Disposition",
    "stackSize": 1,
    "rewardName": "Chaos Orb",
    "rewardQuantity": 5
  },
  {
    "name": "Coveted Possession",
    "stackSize": 9,
    "rewardName": "Regal Orb",
    "rewardQuantity": 5
  },
  {
    "name": "Darker Half",
    "stackSize": 3,
    "rewardName": "Eldritch Chaos Orb",
    "rewardQuantity": 5
  },
  {
    "name": "Demigod's Wager",
    "stackSize": 7,
    "rewardName": "Orb of Annulment",
    "rewardQuantity": 1
  },
  {
    "name": "Divine Beauty",
    "stackSize": 12,
    "rewardName": "Divine Orb",
    "rewardQuantity": 7
  },
  {
    "name": "Ever-Changing",
    "stackSize": 3,
    "rewardName": "Orb of Unmaking",
    "rewardQuantity": 10
  },
  {
    "name": "House of Mirrors",
    "stackSize": 9,
    "rewardName": "Mirror of Kalandra",
    "rewardQuantity": 1
  },
  {
    "name": "I See Brothers",
    "stackSize": 2,
    "rewardName": "Fracturing Orb",
    "rewardQuantity": 2
  },
  {
    "name": "Loyalty",
    "stackSize": 5,
    "rewardName": "Orb of Fusing",
    "rewardQuantity": 3
  },
  {
    "name": "Lucky Connections",
    "stackSize": 7,
    "rewardName": "Orb of Fusing",
    "rewardQuantity": 20
  },
  {
    "name": "Lucky Deck",
    "stackSize": 9,
    "rewardName": "Stacked Deck",
    "rewardQuantity": 10
  },
  {
    "name": "No Traces",
    "stackSize": 9,
    "rewardName": "Orb of Scouring",
    "rewardQuantity": 30
  },
  {
    "name": "Outfoxed",
    "stackSize": 2,
    "rewardName": "Veiled Exalted Orb",
    "rewardQuantity": 1
  },
  {
    "name": "Rain of Chaos",
    "stackSize": 8,
    "rewardName": "Chaos Orb",
    "rewardQuantity": 1
  },
  {
    "name": "Seven Years Bad Luck",
    "stackSize": 13,
    "rewardName": "Mirror Shard",
    "rewardQuantity": 1
  },
  {
    "name": "Society's Remorse",
    "stackSize": 1,
    "rewardName": "Orb of Alteration",
    "rewardQuantity": 10
  },
  {
    "name": "The Catalyst",
    "stackSize": 3,
    "rewardName": "Vaal Orb",
    "rewardQuantity": 1
  },
  {
    "name": "The Fool",
    "stackSize": 4,
    "rewardName": "Orb of Chance",
    "rewardQuantity": 20
  },
  {
    "name": "The Fortunate",
    "stackSize": 12,
    "rewardName": "Divine Orb",
    "rewardQuantity": 2
  },
  {
    "name": "The Gemcutter",
    "stackSize": 3,
    "rewardName": "Gemcutter's Prism",
    "rewardQuantity": 1
  },
  {
    "name": "The Heroic Shot",
    "stackSize": 1,
    "rewardName": "Chromatic Orb",
    "rewardQuantity": 17
  },
  {
    "name": "The Hoarder",
    "stackSize": 12,
    "rewardName": "Exalted Orb",
    "rewardQuantity": 1
  },
  {
    "name": "The Innocent",
    "stackSize": 10,
    "rewardName": "Orb of Regret",
    "rewardQuantity": 40
  },
  {
    "name": "The Inventor",
    "stackSize": 6,
    "rewardName": "Vaal Orb",
    "rewardQuantity": 10
  },
  {
    "name": "The Rusted Bard",
    "stackSize": 9,
    "rewardName": "Tainted Mythic Orb",
    "rewardQuantity": 4
  },
  {
    "name": "The Saint's Treasure",
    "stackSize": 10,
    "rewardName": "Exalted Orb",
    "rewardQuantity": 2
  },
  {
    "name": "The Scholar",
    "stackSize": 3,
    "rewardName": "Scroll of Wisdom",
    "rewardQuantity": 40
  },
  {
    "name": "The Scout",
    "stackSize": 8,
    "rewardName": "Exalted Orb",
    "rewardQuantity": 7
  },
  {
    "name": "The Seeker",
    "stackSize": 9,
    "rewardName": "Orb of Annulment",
    "rewardQuantity": 3
  },
  {
    "name": "The Sephirot",
    "stackSize": 11,
    "rewardName": "Divine Orb",
    "rewardQuantity": 10
  },
  {
    "name": "The Survivalist",
    "stackSize": 3,
    "rewardName": "Orb of Alchemy",
    "rewardQuantity": 7
  },
  {
    "name": "The Transformation",
    "stackSize": 5,
    "rewardName": "Tainted Mythic Orb",
    "rewardQuantity": 1
  },
  {
    "name": "The Union",
    "stackSize": 7,
    "rewardName": "Gemcutter's Prism",
    "rewardQuantity": 10
  },
  {
    "name": "The Wrath",
    "stackSize": 8,
    "rewardName": "Chaos Orb",
    "rewardQuantity": 10
  },
  {
    "name": "Three Faces in the Dark",
    "stackSize": 7,
    "rewardName": "Chaos Orb",
    "rewardQuantity": 3
  },
  {
    "name": "Unrequited Love",
    "stackSize": 16,
    "rewardName": "Mirror Shard",
    "rewardQuantity": 19
  },
  {
    "name": "Vinia's Token",
    "stackSize": 5,
    "rewardName": "Orb of Regret",
    "rewardQuantity": 10
  }
]
);
