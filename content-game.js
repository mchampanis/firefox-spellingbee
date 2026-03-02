// for https://www.nytimes.com/puzzles/spelling-bee
// reads the found-words list and syncs it to browser.storage.local, keyed by the puzzle's unique letter set

const DATA_KEY = 'sbf_data';
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// sort the 7 puzzle letters to form a stable unique key, e.g. "cfilnot"
function getPuzzleKey() {
  const selectors = ['.cell-letter', '.hive-cell .cell-letter', 'text.cell-letter']; // any/all of these should match
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
  const key = getPuzzleKey();
  const storageKey = key ? `${DATA_KEY}_${key}` : DATA_KEY;
  console.log('[sbf game] saving', storageKey, 'words:', words.length);
  browser.storage.local.set({
    [storageKey]: { key, words, savedAt: Date.now() },
  });
}

// remove stale data older than 3 days
function cleanup() {
  browser.storage.local.get(null, result => {
    const stale = Object.entries(result)
      .filter(([k, v]) => k.startsWith(DATA_KEY) && v && v.savedAt && Date.now() - v.savedAt > MAX_AGE_MS)
      .map(([k]) => k);
    if (stale.length) browser.storage.local.remove(stale);
  });
}

function attachObserver() {
  const box = document.querySelector('.sb-wordlist-box');
  if (!box) return false;
  new MutationObserver(save).observe(box, { childList: true, subtree: true });
  save();
  return true;
}

function attachHintsLinkPatch() {
  const link = document.querySelector('.pz-toolbar-button__hints');
  if (!link) return false;
  link.addEventListener('click', e => {
    e.preventDefault();
    window.open(link.href, 'spelling-bee-hints', 'noopener,noreferrer,width=600');
  });
  return true;
}

function init() {
  cleanup();
  let wordlistDone = attachObserver();
  let hintsDone = attachHintsLinkPatch();
  if (wordlistDone && hintsDone) return;
  const observer = new MutationObserver(() => {
    if (!wordlistDone) wordlistDone = attachObserver();
    if (!hintsDone) hintsDone = attachHintsLinkPatch();
    if (wordlistDone && hintsDone) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

init();
