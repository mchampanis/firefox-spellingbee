// for https://www.nytimes.com/puzzles/spelling-bee
// reads the found-words list and syncs it to browser.storage.local, keyed by the puzzle's unique letter set.

const DATA_KEY = 'sbf_data';
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// sort the 7 puzzle letters to form a stable unique key, e.g. "cfilnot"
function getPuzzleKey() {
  const selectors = ['.cell-letter', '.hive-cell .cell-letter', 'text.cell-letter']; // all of these should match
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    if (els.length === 7) {
      return [...els]
        .map(el => el.textContent.trim()[0].toLowerCase())
        .sort()
        .join('');
    }
  }
  return null;
}

function extractFoundWords() {
  const items = document.querySelectorAll('.sb-wordlist-items-pag .sb-anagram');
  if (!items.length) return null;
  return [...items].map(el => el.textContent.trim().toLowerCase());
}

function save() {
  const words = extractFoundWords();
  if (words === null) return;
  browser.storage.local.set({
    [DATA_KEY]: { key: getPuzzleKey(), words, savedAt: Date.now() },
  });
}

// remove stale data older than 3 days
function cleanup() {
  browser.storage.local.get(DATA_KEY, result => {
    const data = result[DATA_KEY];
    if (data && data.savedAt && Date.now() - data.savedAt > MAX_AGE_MS) {
      browser.storage.local.remove(DATA_KEY);
    }
  });
}

function attachObserver() {
  const box = document.querySelector('.sb-wordlist-box');
  if (!box) return false;
  new MutationObserver(save).observe(box, { childList: true, subtree: true });
  save();
  return true;
}

function init() {
  cleanup();
  if (attachObserver()) return;
  const observer = new MutationObserver(() => {
    if (attachObserver()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

init();
