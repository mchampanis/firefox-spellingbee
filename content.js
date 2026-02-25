// for: https://www.nytimes.com/*/crosswords/spelling-bee-forum.html
// reads found words from storage (written by content-game.js) and overlays "found / total"
// counts on the hints grid and two-letter list.

const DATA_KEY = 'sbf_data';
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// Returns { grid, puzzleKey } where:
//   grid:      { letter → { length → { cell, total } } }
//   puzzleKey: all 7 puzzle letters sorted, e.g. "adkorwy"
function parseGrid() {
  const table = document.querySelector('table.table');
  if (!table) return null;

  const rows = [...table.querySelectorAll('tr.row')];
  if (rows.length < 2) return null;

  // header row -> column index to word length
  const colToLength = {};
  [...rows[0].querySelectorAll('td.cell')].forEach((cell, i) => {
    const n = parseInt(cell.textContent.trim());
    if (!isNaN(n)) colToLength[i] = n;
  });

  const grid = {};
  const letters = [];

  rows.slice(1).forEach(row => {
    const cells = [...row.querySelectorAll('td.cell')];
    if (!cells.length) return;

    // first cell holds the letter; the Σ totals row has no [a-z] match
    const letterMatch = cells[0].textContent.match(/([a-z])/i);
    if (!letterMatch) return;

    const letter = letterMatch[1].toLowerCase();
    letters.push(letter);
    grid[letter] = {};

    cells.forEach((cell, colIdx) => {
      if (colIdx === 0) return;             // letter label column
      if (!(colIdx in colToLength)) return; // Σ total column

      const total = parseInt(cell.textContent.trim());
      if (isNaN(total) || total === 0) return;

      grid[letter][colToLength[colIdx]] = { cell, total };
    });
  });

  // Derive puzzleKey from the embedded letter display (always has all 7 letters),
  // falling back to grid row headers (may be incomplete if some letters start no words).
  let puzzleKey = null;
  const interactive = document.querySelector('.sb-forum-embedded-interactive');
  if (interactive) {
    const letterPara = [...interactive.querySelectorAll('p.content')]
      .find(p => /[a-z]/i.test(p.textContent) && !/center/i.test(p.textContent));
    if (letterPara) {
      const all = [...letterPara.textContent.matchAll(/[a-z]/gi)].map(m => m[0].toLowerCase());
      if (all.length === 7) puzzleKey = all.sort().join('');
    }
  }
  if (!puzzleKey) puzzleKey = letters.sort().join('');

  return { grid, puzzleKey };
}

function parseTwoLetterList() {
  const items = {};

  let dataPara = null;
  for (const p of document.querySelectorAll('p.content')) {
    if (/two.?letter.?list/i.test(p.textContent)) {
      dataPara = p.nextElementSibling;
      break;
    }
  }
  if (!dataPara) return items;

  dataPara.querySelectorAll('span').forEach(span => {
    const rawText = [...span.childNodes]
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent)
      .join('')
      .trim();
    if (!rawText) return;

    const hasBr = !!span.querySelector('br');

    span.textContent = '';
    rawText.split(/\s+/).filter(Boolean).forEach((token, i) => {
      if (i > 0) span.appendChild(document.createTextNode(' '));
      const m = token.match(/^([a-z]{2})-(\d+)$/i);
      if (!m) {
        span.appendChild(document.createTextNode(token));
      } else {
        const tlEl = document.createElement('span');
        tlEl.className = 'sbf-tl';
        tlEl.dataset.prefix = m[1].toLowerCase();
        tlEl.dataset.total = String(parseInt(m[2]));
        tlEl.textContent = token;
        span.appendChild(tlEl);
      }
    });
    if (hasBr) span.appendChild(document.createElement('br'));

    span.querySelectorAll('.sbf-tl').forEach(el => {
      items[el.dataset.prefix] = { el, total: parseInt(el.dataset.total) };
    });
  });

  return items;
}

function countWords(words) {
  const byLetterLength = {};
  const byPrefix = {};

  for (const word of words) {
    if (!word || word.length < 4) continue;
    const letter = word[0];
    const len = word.length;
    const prefix = word.slice(0, 2);

    if (!byLetterLength[letter]) byLetterLength[letter] = {};
    byLetterLength[letter][len] = (byLetterLength[letter][len] || 0) + 1;
    byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
  }
  return { byLetterLength, byPrefix };
}

function updateCell(cell, found, total) {
  cell.classList.remove('sbf-none', 'sbf-partial', 'sbf-complete');

  if (found === 0) {
    cell.textContent = String(total);
    cell.classList.add('sbf-none');
  } else if (found >= total) {
    cell.textContent = '';
    const s = document.createElement('s');
    s.textContent = String(total);
    cell.appendChild(s);
    cell.classList.add('sbf-complete');
  } else {
    cell.textContent = '';
    const nSpan = document.createElement('span');
    nSpan.className = 'sbf-n';
    nSpan.textContent = String(found);
    const sepSpan = document.createElement('span');
    sepSpan.className = 'sbf-sep';
    sepSpan.textContent = '/';
    cell.appendChild(nSpan);
    cell.appendChild(sepSpan);
    cell.appendChild(document.createTextNode(String(total)));
    cell.classList.add('sbf-partial');
  }
}

function updateTLItem(el, prefix, found, total) {
  el.classList.remove('sbf-tl-none', 'sbf-tl-partial', 'sbf-tl-complete');

  if (found === 0) {
    el.textContent = `${prefix}-${total}`;
    el.classList.add('sbf-tl-none');
  } else if (found >= total) {
    el.textContent = '';
    const s = document.createElement('s');
    s.textContent = `${prefix}-${total}`;
    el.appendChild(s);
    el.classList.add('sbf-tl-complete');
  } else {
    el.textContent = '';
    el.appendChild(document.createTextNode(`${prefix}-`));
    const nSpan = document.createElement('span');
    nSpan.className = 'sbf-n';
    nSpan.textContent = String(found);
    el.appendChild(nSpan);
    el.appendChild(document.createTextNode('/'));
    const dimSpan = document.createElement('span');
    dimSpan.className = 'sbf-dim';
    dimSpan.textContent = String(total);
    el.appendChild(dimSpan);
    el.classList.add('sbf-tl-partial');
  }
}

function applyFoundWords(foundWords, grid, tlItems) {
  const { byLetterLength, byPrefix } = countWords(foundWords);

  for (const [letter, lengths] of Object.entries(grid)) {
    for (const [len, { cell, total }] of Object.entries(lengths)) {
      const found = (byLetterLength[letter] || {})[Number(len)] || 0;
      updateCell(cell, found, total);
    }
  }

  for (const [prefix, { el, total }] of Object.entries(tlItems)) {
    updateTLItem(el, prefix, byPrefix[prefix] || 0, total);
  }

  updateBanner('ok', foundWords.length);
}

let banner = null;

function injectBanner(table) {
  if (banner) return;
  banner = document.createElement('div');
  banner.id = 'sbf-banner';
  table.parentNode.insertBefore(banner, table);
}

function updateBanner(state, wordCount) {
  if (!banner) return;
  banner.dataset.state = state;

  if (state === 'ok') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    banner.textContent = `${wordCount} word${wordCount === 1 ? '' : 's'} found · synced at ${time}`;
  } else {
    banner.textContent = "No data for today's puzzle yet - open the Spelling Bee and start solving to sync.";
  }
}

let grid = null;
let puzzleKey = null;
let tlItems = null;

function loadAndApply() {
  const storageKey = puzzleKey ? `${DATA_KEY}_${puzzleKey}` : DATA_KEY;
  console.log('[sbf forum] loading from', storageKey);
  browser.storage.local.get(storageKey, result => {
    const data = result[storageKey];

    // expired data - clean up and treat as empty
    if (data && data.savedAt && Date.now() - data.savedAt > MAX_AGE_MS) {
      browser.storage.local.remove(storageKey);
      updateBanner('empty', 0);
      return;
    }

    if (!data || !data.words || !data.words.length) {
      updateBanner('empty', 0);
      return;
    }

    applyFoundWords(data.words, grid, tlItems);
  });
}

function addTermDefinitions() {
  const definitions = {
    'PANGRAM':  'A word that uses all 7 letters of the puzzle at least once.',
    'SPANGRAM': 'A pangram that uses each of the 7 letters exactly once (a perfect pangram).',
    'BINGO':    'The puzzle has at least one word starting with each of the 7 letters.',
    'PERFECT':  'A pangram that uses each of the 7 letters exactly once.',
  };

  for (const p of document.querySelectorAll('p.content')) {
    if (!/\b(SPANGRAMS?|PANGRAMS?|BINGO|PERFECT)\b/i.test(p.textContent)) continue;

    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    for (const textNode of textNodes) {
      const text = textNode.textContent;
      const pattern = /\b(SPANGRAMS?|PANGRAMS?|BINGO|PERFECT)\b/gi;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const term = match[1].toUpperCase();
        const span = document.createElement('span');
        span.className = 'sbf-term';
        span.dataset.def = definitions[term] || definitions[term.replace(/S$/, '')] || '';
        span.textContent = match[1];
        parts.push(span);
        lastIndex = pattern.lastIndex;
      }

      if (parts.length > 0) {
        if (lastIndex < text.length) {
          parts.push(document.createTextNode(text.slice(lastIndex)));
        }
        const parent = textNode.parentNode;
        parts.forEach(part => parent.insertBefore(part, textNode));
        parent.removeChild(textNode);
      }
    }
    break;
  }
}

function init() {
  const table = document.querySelector('table.table');
  if (!table) return false;

  const parsed = parseGrid();
  if (!parsed) return false;

  grid = parsed.grid;
  puzzleKey = parsed.puzzleKey;
  tlItems = parseTwoLetterList();
  addTermDefinitions();
  injectBanner(table);

  loadAndApply();

  // live updates when the game tab writes new data
  const storageKey = puzzleKey ? `${DATA_KEY}_${puzzleKey}` : DATA_KEY;
  console.log('[sbf forum] puzzleKey:', puzzleKey, '- listening on', storageKey);
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && storageKey in changes) {
      const data = changes[storageKey].newValue;
      if (!data) { updateBanner('empty', 0); return; }
      applyFoundWords(data.words || [], grid, tlItems);
    }
  });

  return true;
}

function waitForTable() {
  if (init()) return;
  const observer = new MutationObserver(() => {
    if (init()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

waitForTable();
