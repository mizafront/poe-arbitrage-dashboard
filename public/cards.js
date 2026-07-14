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

// Stage 2: only deterministic map/fragment rewards with a single named market result.
// Random maps, random fragments, corrupted/special map variants and equipment are excluded.
export const FIXED_MAP_FRAGMENT_CARD_CATALOG = Object.freeze([
  {
    name: "Altered Perception",
    stackSize: 3,
    rewardName: "Simulacrum",
    rewardQuantity: 1,
    rewardMarketCategory: "fragment"
  },
  {
    name: "Boon of Justice",
    stackSize: 6,
    rewardName: "Offering to the Goddess",
    rewardQuantity: 1,
    rewardMarketCategory: "fragment"
  },
  {
    name: "Checkmate",
    stackSize: 8,
    rewardName: "Simulacrum Splinter",
    rewardQuantity: 76,
    rewardMarketCategory: "fragment"
  },
  {
    name: "Last Hope",
    stackSize: 3,
    rewardName: "Mortal Hope",
    rewardQuantity: 1,
    rewardMarketCategory: "fragment"
  },
  {
    name: "Eternal Bonds",
    stackSize: 4,
    rewardName: "Replica Cortex",
    rewardQuantity: 1,
    rewardMarketCategory: "unique-map"
  },
  {
    name: "Scholar of the Seas",
    stackSize: 7,
    rewardName: "Mao Kun",
    rewardQuantity: 1,
    rewardMarketCategory: "unique-map"
  },
  {
    name: "The Professor",
    stackSize: 4,
    rewardName: "The Putrid Cloister",
    rewardQuantity: 1,
    rewardMarketCategory: "unique-map"
  },
  {
    name: "The Wolf's Legacy",
    stackSize: 4,
    rewardName: "Vaults of Atziri",
    rewardQuantity: 1,
    rewardMarketCategory: "unique-map"
  }
]);

// Only scarabs with an exact, named reward are included.
// Generic "Scarab" and "Horned Scarab" rewards are deliberately excluded.
export const FIXED_SCARAB_CARD_CATALOG = Object.freeze([
  {
    name: "Buried Treasure",
    stackSize: 3,
    rewardName: "Sulphite Scarab",
    rewardQuantity: 1,
    rewardMarketCategory: "scarab"
  },
  {
    name: "Man With Bear",
    stackSize: 3,
    rewardName: "Bestiary Scarab",
    rewardQuantity: 1,
    rewardMarketCategory: "scarab"
  },
  {
    name: "The Card Sharp",
    stackSize: 4,
    rewardName: "Divination Scarab",
    rewardQuantity: 1,
    rewardMarketCategory: "scarab"
  },
  {
    name: "The Deal",
    stackSize: 5,
    rewardName: "Cartography Scarab",
    rewardQuantity: 1,
    rewardMarketCategory: "scarab"
  }
]);

// Stage 3: exact named gems only. Generic/random gem rewards are excluded.
// Every entry specifies level, quality and corruption state so a level-1 gem
// cannot be compared with a level-4 or level-21 reward.
export const FIXED_GEM_CARD_CATALOG = Object.freeze([
  {
    name: "A Chilling Wind", stackSize: 4, rewardName: "Vaal Cold Snap",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 21 · качество 20% · осквернён",
    rewardConstraints: { gemLevel: 21, gemQuality: 20, corrupted: true }
  },
  {
    name: "Bound by Flame", stackSize: 2, rewardName: "Flame Link",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 21 · качество 20%",
    rewardConstraints: { gemLevel: 21, gemQuality: 20, corrupted: false }
  },
  {
    name: "Grave Knowledge", stackSize: 6, rewardName: "Summon Raging Spirit",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 1 · качество 20%",
    rewardConstraints: { gemLevel: 1, gemQuality: 20, corrupted: false }
  },
  {
    name: "The Artist", stackSize: 11, rewardName: "Enhance Support",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 4 · осквернён",
    rewardConstraints: { gemLevel: 4, gemQuality: 0, corrupted: true }
  },
  {
    name: "The Bones", stackSize: 6, rewardName: "Vaal Summon Skeletons",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 21 · осквернён",
    rewardConstraints: { gemLevel: 21, gemQuality: 0, corrupted: true }
  },
  {
    name: "The Doppelganger", stackSize: 2, rewardName: "Mirror Arrow",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 1 · качество 20%",
    rewardConstraints: { gemLevel: 1, gemQuality: 20, corrupted: false }
  },
  {
    name: "The Dragon's Heart", stackSize: 11, rewardName: "Empower Support",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 4 · осквернён",
    rewardConstraints: { gemLevel: 4, gemQuality: 0, corrupted: true }
  },
  {
    name: "The Enlightened", stackSize: 6, rewardName: "Enlighten Support",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 3",
    rewardConstraints: { gemLevel: 3, gemQuality: 0, corrupted: false }
  },
  {
    name: "The Magma Crab", stackSize: 6, rewardName: "Vaal Molten Shell",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 21 · осквернён",
    rewardConstraints: { gemLevel: 21, gemQuality: 0, corrupted: true }
  },
  {
    name: "The Skeleton", stackSize: 6, rewardName: "Summon Skeletons",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 1 · качество 23% · осквернён",
    rewardConstraints: { gemLevel: 1, gemQuality: 23, corrupted: true }
  },
  {
    name: "Wealth and Power", stackSize: 11, rewardName: "Enlighten Support",
    rewardMarketCategory: "skill-gem", rewardDescription: "Уровень 4 · осквернён",
    rewardConstraints: { gemLevel: 4, gemQuality: 0, corrupted: true }
  }
]);

// Stage 4: only a named, non-corrupted unique item with no special implicit,
// fixed six-link, item-level or random-item condition. Equipment rolls still
// vary, so these entries receive a medium catalogue confidence penalty.
export const FIXED_UNIQUE_CARD_CATALOG = Object.freeze([
  { name: "The Apothecary", stackSize: 5, rewardName: "Mageblood", rewardMarketCategory: "unique-accessory" },
  { name: "The Doctor", stackSize: 8, rewardName: "Headhunter", rewardMarketCategory: "unique-accessory" },
  { name: "A Dab of Ink", stackSize: 9, rewardName: "The Poet's Pen", rewardMarketCategory: "unique-weapon", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "A Note in the Wind", stackSize: 4, rewardName: "Asenath's Mark", rewardMarketCategory: "unique-armour", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "Alivia's Grace", stackSize: 6, rewardName: "Queen of the Forest", rewardMarketCategory: "unique-armour", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "Hunter's Reward", stackSize: 3, rewardName: "The Taming", rewardMarketCategory: "unique-accessory" },
  { name: "The Beast", stackSize: 6, rewardName: "Belly of the Beast", rewardMarketCategory: "unique-armour", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "The Craving", stackSize: 4, rewardName: "Unending Hunger", rewardMarketCategory: "unique-jewel" },
  { name: "The Deep Ones", stackSize: 5, rewardName: "Tidebreaker", rewardMarketCategory: "unique-weapon", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "The Hunger", stackSize: 9, rewardName: "Taste of Hate", rewardMarketCategory: "unique-flask" },
  { name: "The Incantation", stackSize: 4, rewardName: "The Whispering Ice", rewardMarketCategory: "unique-weapon", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "The King's Heart", stackSize: 8, rewardName: "Kaom's Heart", rewardMarketCategory: "unique-armour", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "The Progeny of Lunaris", stackSize: 2, rewardName: "Dying Sun", rewardMarketCategory: "unique-flask" },
  { name: "The Queen", stackSize: 16, rewardName: "Atziri's Acuity", rewardMarketCategory: "unique-armour", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "The Return of the Rat", stackSize: 3, rewardName: "Tavukai", rewardMarketCategory: "unique-accessory" },
  { name: "The Shieldbearer", stackSize: 8, rewardName: "The Squire", rewardMarketCategory: "unique-armour", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "The Visionary", stackSize: 6, rewardName: "Lioneye's Vision", rewardMarketCategory: "unique-armour", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "The Witch", stackSize: 8, rewardName: "Kiara's Determination", rewardMarketCategory: "unique-flask" },
  { name: "Tranquillity", stackSize: 7, rewardName: "Voltaxic Rift", rewardMarketCategory: "unique-weapon", rewardConstraints: { corrupted: false, links: 0 } },
  { name: "The Life Thief", stackSize: 6, rewardName: "Zerphi's Heart", rewardMarketCategory: "unique-accessory" },
  { name: "The Harvester", stackSize: 11, rewardName: "The Harvest", rewardMarketCategory: "unique-weapon", rewardConstraints: { corrupted: false, links: 0 } }
].map((entry) => ({
  ...entry,
  rewardQuantity: 1,
  rewardConstraints: { corrupted: false, ...(entry.rewardConstraints ?? {}) },
  rewardDescription: "Точный уникальный предмет · обычная неосквернённая версия",
  catalogConfidence: "medium"
})));

export const FIXED_CARD_REWARD_CATALOG = Object.freeze([
  ...FIXED_CURRENCY_CARD_CATALOG.map((entry) => ({
    ...entry,
    cardCategory: "currency",
    rewardMarketCategory: "currency"
  })),
  ...FIXED_MAP_FRAGMENT_CARD_CATALOG.map((entry) => ({
    ...entry,
    cardCategory: "map-fragment"
  })),
  ...FIXED_SCARAB_CARD_CATALOG.map((entry) => ({
    ...entry,
    cardCategory: "scarab"
  })),
  ...FIXED_GEM_CARD_CATALOG.map((entry) => ({
    ...entry,
    cardCategory: "gem"
  })),
  ...FIXED_UNIQUE_CARD_CATALOG.map((entry) => ({
    ...entry,
    cardCategory: "unique"
  }))
]);
