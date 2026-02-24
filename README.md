# Spelling Bee Grid Tracker

A Firefox extension that lets you click cells in the NYT Spelling Bee forum hints grid to track which words you've already found.

## How to install (temporary, for development)

1. Open Firefox and go to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on...**
4. Navigate to this folder and select `manifest.json`

The extension is now active. It will stay loaded until you restart Firefox.

## To install permanently

Package it as a `.xpi` and sign it via [addons.mozilla.org](https://addons.mozilla.org/), or use Firefox Developer Edition / Nightly which allow unsigned extensions.

## Usage

1. Open any NYT Spelling Bee forum page, e.g.:
   `https://www.nytimes.com/2026/02/24/crosswords/spelling-bee-forum.html`

2. The hints grid cells become clickable. Click a cell to mark it green with a strikethrough.

3. Click again to unmark it.

4. A **Clear marks** button and a found/total counter appear above the first grid.

5. Your marks are saved per page URL and persist across browser sessions.

## Adjusting the selector

If the grid cells aren't being detected, open the browser console on the forum page
and inspect the table structure. The extension targets all `<td>` elements inside
`<table>` elements on the page, skipping cells that are empty, `0`, or `-`.
