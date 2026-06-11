#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { renderBoard } = require('./board.render.js');

const dir = __dirname;
const files = ['spanish-coach', 'apex', 'hims'].map(n =>
  JSON.parse(fs.readFileSync(path.join(dir, 'data', n + '.json'), 'utf8')));
const attention = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'attention.json'), 'utf8'));

const rendered = renderBoard(files, attention);
let out = fs.readFileSync(path.join(dir, 'board.html'), 'utf8');
// Prerender into #root so the offline file is fully static (works without JS / fetch).
out = out.replace('<div id="root"><p class="sub">Loading…</p></div>',
  '<div id="root">' + rendered + '</div>');
// Also inline the data for the live script path (idempotent re-render on open).
out = out.replace('<script src="board.render.js"></script>',
  '<script src="board.render.js"></script>\n<script>window.__BOARD__=' +
    JSON.stringify({ projects: files, attention }) + ';</script>');
fs.writeFileSync(path.join(dir, 'board.local.html'), out);
console.log('board.local.html written; rendered ' + rendered.length + ' chars');
