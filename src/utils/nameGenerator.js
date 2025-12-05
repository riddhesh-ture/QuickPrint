// src/utils/nameGenerator.js

const adjectives = [
  'Cute', 'Funky', 'Happy', 'Silly', 'Cozy', 'Fuzzy', 'Sunny', 'Lucky', 
  'Jolly', 'Snappy', 'Sparkly', 'Fluffy', 'Bouncy', 'Cheerful', 'Zippy',
  'Bubbly', 'Perky', 'Jazzy', 'Peppy', 'Zesty', 'Breezy', 'Dreamy',
  'Groovy', 'Mellow', 'Quirky', 'Spunky', 'Witty', 'Nifty', 'Dandy',
  'Swift', 'Bright', 'Golden', 'Silver', 'Cosmic', 'Magic', 'Royal'
];

const nouns = [
  // Fruits
  'Mango', 'Apple', 'Banana', 'Cherry', 'Grape', 'Lemon', 'Orange', 
  'Peach', 'Pear', 'Plum', 'Berry', 'Melon', 'Kiwi', 'Papaya', 'Guava',
  // Flowers
  'Rose', 'Lily', 'Tulip', 'Daisy', 'Orchid', 'Lotus', 'Iris', 'Violet',
  'Jasmine', 'Poppy', 'Dahlia', 'Peony', 'Sunflower', 'Lavender',
  // Animals
  'Panda', 'Koala', 'Bunny', 'Kitten', 'Puppy', 'Penguin', 'Dolphin',
  'Otter', 'Fox', 'Owl', 'Robin', 'Sparrow', 'Finch', 'Parrot',
  // Nature
  'Cloud', 'Star', 'Moon', 'Rainbow', 'Breeze', 'River', 'Meadow',
  'Pebble', 'Leaf', 'Willow', 'Maple', 'Cedar', 'Pine', 'Birch'
];

/**
 * Generates a cute random name like "Cute Mango" or "Funky Apple"
 */
export const generateCuteName = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
};

/**
 * Generates a unique session ID
 */
export const generateSessionId = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `user_${timestamp}_${randomPart}`;
};

/**
 * Gets or creates a user identity stored in localStorage
 */
export const getOrCreateUserIdentity = () => {
  const STORAGE_KEY = 'quickprint_user_identity';
  
  // Try to get existing identity
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const identity = JSON.parse(stored);
      // Validate stored identity has required fields
      if (identity.id && identity.name) {
        return identity;
      }
    } catch (e) {
      // Invalid stored data, will create new
    }
  }
  
  // Create new identity
  const newIdentity = {
    id: generateSessionId(),
    name: generateCuteName(),
    createdAt: new Date().toISOString()
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdentity));
  return newIdentity;
};

/**
 * Regenerate a new cute name (keeps same ID)
 */
export const regenerateUserName = () => {
  const STORAGE_KEY = 'quickprint_user_identity';
  const stored = localStorage.getItem(STORAGE_KEY);
  
  let identity;
  if (stored) {
    try {
      identity = JSON.parse(stored);
      identity.name = generateCuteName();
    } catch (e) {
      identity = {
        id: generateSessionId(),
        name: generateCuteName(),
        createdAt: new Date().toISOString()
      };
    }
  } else {
    identity = {
      id: generateSessionId(),
      name: generateCuteName(),
      createdAt: new Date().toISOString()
    };
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
};
