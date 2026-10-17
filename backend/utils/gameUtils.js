import { wordLists, GAME_CONFIG } from '../config/gameConfig.js';

// Get random words for choices (non-mutating Fisher-Yates shuffle with difficulty & custom words)
export function getRandomWords(difficulty = 'medium', count = 3, customWords = []) {
  let pool = [];
  if (difficulty === 'mixed') {
    pool = [...wordLists.easy, ...wordLists.medium, ...wordLists.hard];
  } else {
    pool = [...(wordLists[difficulty] || wordLists.medium)];
  }

  if (Array.isArray(customWords) && customWords.length > 0) {
    pool.push(...customWords);
  }

  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// Calculate points based on guess timing
export function calculatePoints(guessOrder, totalPlayers) {
  switch(guessOrder) {
    case 1: return GAME_CONFIG.POINTS.FIRST_GUESS;
    case 2: return GAME_CONFIG.POINTS.SECOND_GUESS;
    case 3: return GAME_CONFIG.POINTS.THIRD_GUESS;
    default: return GAME_CONFIG.POINTS.LATE_GUESS;
  }
}

// Check if word matches (EXACT match only)
export function checkWordMatch(guess, word) {
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedWord = word.toLowerCase().trim();
  
  // Only exact match - no partial matching
  return normalizedGuess === normalizedWord;
}

// Check if guess is close (Levenshtein distance <= 1 or 2 for longer words)
export function isCloseGuess(guess, word) {
  if (!guess || !word) return false;
  const g = guess.toLowerCase().trim();
  const w = word.toLowerCase().trim();
  if (g === w) return false;
  if (Math.abs(g.length - w.length) > 2) return false;

  const dp = Array.from({ length: g.length + 1 }, () => 
    new Array(w.length + 1).fill(0)
  );

  for (let i = 0; i <= g.length; i++) dp[i][0] = i;
  for (let j = 0; j <= w.length; j++) dp[0][j] = j;

  for (let i = 1; i <= g.length; i++) {
    for (let j = 1; j <= w.length; j++) {
      if (g[i - 1] === w[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const distance = dp[g.length][w.length];
  return distance === 1 || (w.length >= 6 && distance === 2);
}

// Generate progressive word hint with FIXED positions (like Scribbl.io)
export function generateWordHint(word, timeElapsed, totalTime, revealedPositions = null) {
  if (!word) return { hint: '', revealedPositions: new Set() };
  
  const progress = Math.min(timeElapsed / totalTime, 1); // 0 to 1
  const wordLength = word.length;
  
  // Use existing revealed positions or create new ones
  let currentRevealedPositions = revealedPositions || new Set();
  
  // Determine how many letters should be revealed based on time
  let targetRevealCount = 0;
  
  if (progress >= 0.25) targetRevealCount = 1; // First letter after 25% time
  if (progress >= 0.45) targetRevealCount = 2; // Second letter after 45% time  
  if (progress >= 0.65) targetRevealCount = Math.ceil(wordLength * 0.35); // 35% of letters after 65% time
  if (progress >= 0.85) targetRevealCount = Math.ceil(wordLength * 0.55); // 55% of letters after 85% time
  
  // If we need to reveal more letters, add them strategically
  if (currentRevealedPositions.size < targetRevealCount) {
    const lettersToReveal = targetRevealCount - currentRevealedPositions.size;
    
    // Priority order for revealing letters
    const priorityPositions = [];
    
    // 1. First letter (highest priority)
    if (!currentRevealedPositions.has(0)) {
      priorityPositions.push(0);
    }
    
    // 2. Last letter (if word length > 1)
    if (wordLength > 1 && !currentRevealedPositions.has(wordLength - 1)) {
      priorityPositions.push(wordLength - 1);
    }
    
    // 3. Middle positions (avoid consecutive positions when possible)
    const remainingPositions = [];
    for (let i = 1; i < wordLength - 1; i++) {
      if (!currentRevealedPositions.has(i)) {
        remainingPositions.push(i);
      }
    }
    
    // Add remaining positions in a strategic order (prefer non-consecutive)
    remainingPositions.sort((a, b) => {
      // Prefer positions that are not adjacent to already revealed positions
      const aHasAdjacentRevealed = currentRevealedPositions.has(a - 1) || currentRevealedPositions.has(a + 1);
      const bHasAdjacentRevealed = currentRevealedPositions.has(b - 1) || currentRevealedPositions.has(b + 1);
      
      if (aHasAdjacentRevealed !== bHasAdjacentRevealed) {
        return aHasAdjacentRevealed ? 1 : -1; // Prefer non-adjacent
      }
      
      return Math.random() - 0.5; // Random for equal priority
    });
    
    priorityPositions.push(...remainingPositions);
    
    // Reveal the required number of letters
    for (let i = 0; i < lettersToReveal && i < priorityPositions.length; i++) {
      currentRevealedPositions.add(priorityPositions[i]);
    }
  }
  
  // Build the hint string with FIXED positions
  const hintString = word
    .split('')
    .map((char, index) => {
      if (char === ' ') return ' '; // Keep spaces
      return currentRevealedPositions.has(index) ? char : '_';
    })
    .join('');
  
  return {
    hint: hintString,
    revealedPositions: currentRevealedPositions
  };
}

// Simple hint for initial display (all underscores)
export function generateSimpleWordHint(word) {
  return word.replace(/[a-zA-Z]/g, '_');
}