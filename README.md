# Spelling Bee Grid Tracker

A Firefox extension that tracks your NYT Spelling Bee words.

## How to install (temporary, for development)

1. Open Firefox and go to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on...**
4. Navigate to this folder and select `manifest.json`

The extension is now active. It will stay loaded until you restart Firefox.

## Usage

1. Open NYT Spelling Bee, i.e.: https://www.nytimes.com/puzzles/spelling-bee

2. Open the hints page in a new browser window, e.g.: https://www.nytimes.com/2026/02/24/crosswords/spelling-bee-forum.html

3. Move and resize the windows so you can see both the puzzle and the hints at the same time.

4. As you find words, the hints grid will update with the counts

Puzzles are stored in local browser storage for three days before being removed.
