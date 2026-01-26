const STORAGE_KEY = 'gist-visits';

/**
 * Get all visit timestamps from localStorage
 * @returns {Object} - Map of gistId to visit timestamp
 */
function getVisits() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to parse gist visits:', error);
    return {};
  }
}

/**
 * Save visits to localStorage
 * @param {Object} visits - Map of gistId to visit timestamp
 */
function saveVisits(visits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch (error) {
    console.warn('Failed to save gist visits:', error);
  }
}

/**
 * Get the last visit timestamp for a gist
 * @param {string} gistId - The gist ID
 * @returns {number|null} - The timestamp of last visit or null if never visited
 */
export function getLastVisit(gistId) {
  if (!gistId) return null;
  const visits = getVisits();
  return visits[gistId] || null;
}

/**
 * Mark a gist as visited (update visit timestamp)
 * @param {string} gistId - The gist ID
 */
export function markVisited(gistId) {
  if (!gistId) return;
  const visits = getVisits();
  visits[gistId] = Date.now();
  saveVisits(visits);
}

/**
 * Check if content is new (created after last visit)
 * @param {number} timestamp - The content timestamp
 * @param {string} gistId - The gist ID
 * @returns {boolean} - True if content is newer than last visit
 */
export function isNew(timestamp, gistId) {
  if (!timestamp || !gistId) return false;
  const lastVisit = getLastVisit(gistId);
  if (!lastVisit) return true; // First visit, everything is new
  return timestamp > lastVisit;
}

/**
 * Get count of new items since last visit
 * @param {Array} items - Array of items with timestamps
 * @param {string} gistId - The gist ID
 * @param {string} timestampKey - The key to use for timestamp (default: 'timestamp')
 * @returns {number} - Count of new items
 */
export function getNewCount(items, gistId, timestampKey = 'timestamp') {
  if (!items || !gistId) return 0;
  const lastVisit = getLastVisit(gistId);
  if (!lastVisit) return items.length; // First visit, all are new
  return items.filter(item => item[timestampKey] > lastVisit).length;
}

/**
 * Clear visit history for a specific gist
 * @param {string} gistId - The gist ID
 */
export function clearVisit(gistId) {
  if (!gistId) return;
  const visits = getVisits();
  delete visits[gistId];
  saveVisits(visits);
}

/**
 * Clear all visit history
 */
export function clearAllVisits() {
  localStorage.removeItem(STORAGE_KEY);
}
