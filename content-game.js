// for https://www.nytimes.com/puzzles/spelling-bee
// parses the found-words list and syncs it to browser.storage.local, keyed by the puzzle's unique letter set

// local storage key
const DATA_KEY = 'sbf_data';
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// word definition tooltips
const DICT_API = 'https://api.datamuse.com/words?md=dp&max=1&sp=';
const POS_NAMES = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };
const defCache = new Map(); // word -> [{pos, text}] pairs, or null if not found

async function fetchDefinition(word) {
  if (defCache.has(word)) return defCache.get(word);
  try {
    const res = await fetch(DICT_API + encodeURIComponent(word));
    if (!res.ok) { defCache.set(word, null); return null; }
    const data = await res.json();
    // defs come as "pos\tdefinition text" strings, e.g. "n\tA sharp point"
    const defs = (data?.[0]?.word === word && data[0].defs) || [];
    const meanings = defs.map(d => {
      const [pos, text] = d.split('\t');
      return { pos: POS_NAMES[pos] ?? pos, text: (text ?? '').trim() };
    }).filter(m => m.text);
    // prefer noun then verb, then fill remaining slot from whatever's left;
    // one def per part-of-speech unless there's nothing else to show
    const preferred = ['noun', 'verb'];
    const picked = [];
    for (const pos of preferred) {
      if (picked.length >= 2) break;
      const m = meanings.find(m => m.pos === pos);
      if (m) picked.push(m);
    }
    for (const m of meanings) {
      if (picked.length >= 2) break;
      if (!picked.some(p => p.pos === m.pos)) picked.push(m);
    }
    if (picked.length < 2) {
      const second = meanings.find(m => !picked.includes(m));
      if (second) picked.push(second);
    }
    const def = picked.length ? picked : null;
    defCache.set(word, def);
    return def;
  } catch {
    defCache.set(word, null);
    return null;
  }
}

function injectTooltipStyles() {
  if (document.getElementById('sbf-word-tip-style')) return;

  const style = document.createElement('style');

  style.id = 'sbf-word-tip-style';
  style.textContent = `
    #sbf-word-tip {
      display: none;
      position: fixed;
      background: #333;
      color: #fff;
      padding: 5px 9px;
      border-radius: 4px;
      font-size: 12px;
      width: 200px;
      text-align: center;
      z-index: 99999;
      pointer-events: none;
      line-height: 1.4;
      white-space: normal;
    }
  `;

  document.head.appendChild(style);
}

let wordTip = null;

function getWordDef() {
  if (!wordTip) {
    injectTooltipStyles();
    wordTip = document.createElement('div');
    wordTip.id = 'sbf-word-tip';
    document.body.appendChild(wordTip);
  }
  return wordTip;
}

function showWordDef(anchor, def) {
  const tip = getWordDef();
  tip.textContent = '';
  if (typeof def === 'string') {
    tip.textContent = def;
  } else if (Array.isArray(def)) {
    def.forEach((d, i) => {
      if (i > 0) tip.appendChild(document.createElement('br'));
      const label = document.createElement('em');
      label.textContent = d.pos + ': ';
      tip.appendChild(label);
      tip.appendChild(document.createTextNode(d.text));
    });
  }
  tip.style.display = 'block';
  const a = anchor.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  let left = a.left + a.width / 2 - t.width / 2;
  let top = a.top - t.height - 8;

  // clamp horizontally; flip below if too close to top
  left = Math.max(4, Math.min(left, window.innerWidth - t.width - 4));

  if (top < 4) top = a.bottom + 8;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function hideWordTip() {
  if (wordTip) wordTip.style.display = 'none';
}

function attachWordTooltip(el) {
  if (el.dataset.sbfTip) return; // already attached

  el.dataset.sbfTip = '1';
  let activeWord = null;

  el.addEventListener('mouseenter', async () => {
    const word = el.textContent.trim().toLowerCase();
    activeWord = word;
    showWordDef(el, 'Fetching definition...');
    const def = await fetchDefinition(word);
    if (activeWord !== word) return; // mouse moved away before fetch completed
    showWordDef(el, def ?? 'No definition found.');
  });

  el.addEventListener('mouseleave', () => {
    activeWord = null;
    hideWordTip();
  });
}

function attachAllWordTooltips() {
  document.querySelectorAll('.sb-wordlist-items-pag .sb-anagram').forEach(attachWordTooltip);
}

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
  new MutationObserver(() => { save(); attachAllWordTooltips(); }).observe(box, { childList: true, subtree: true });
  save();
  attachAllWordTooltips();
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
