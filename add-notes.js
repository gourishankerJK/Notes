#!/usr/bin/env node
/**
 * add-notes.js
 *
 * Registers a new notes folder into the GitHub Pages site.
 *
 * Usage:
 *   node add-notes.js "Folder Name"   — process a specific folder
 *   node add-notes.js                 — scan for any unregistered folders
 *
 * Expects the folder to follow the OML pattern:
 *   - main.tex  with \title{}, \author{}, and \clearpage\input{modules/...}
 *   - OR        with \setmetadata{author}{course}{instructor}
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT       = __dirname;
const TEMPLATE   = path.join(ROOT, 'notes-template.html');
const ROOT_INDEX = path.join(ROOT, 'index.html');

// ── Utilities ─────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Pandoc-style heading anchor: lowercase, spaces → hyphens, strip punctuation */
function toAnchor(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ── Parse main.tex ────────────────────────────────────────────────────

function parseMainTex(folder) {
  const mainTex = path.join(ROOT, folder, 'main.tex');
  if (!fs.existsSync(mainTex)) throw new Error(`No main.tex found in "${folder}"`);

  const src = fs.readFileSync(mainTex, 'utf8');

  let title = folder, author = 'Gouri Shanker', instructor = null;

  // \setmetadata{author}{course}{instructor}  (kafkanotes pattern)
  const meta = src.match(/\\setmetadata\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}/);
  if (meta) {
    author     = meta[1].trim();
    title      = meta[2].trim();
    instructor = meta[3].trim();
  } else {
    const t = src.match(/\\title\{([^}]+)\}/);
    if (t) title = t[1].trim();
    const a = src.match(/\\author\{([^}]+)\}/);
    if (a) author = a[1].trim();
  }

  // Collect uncommented \input{...} files that exist on disk
  const inputFiles = [];
  for (const line of src.split('\n')) {
    if (line.trim().startsWith('%')) continue;
    const m = line.match(/\\input\{([^}]+)\}/);
    if (!m) continue;
    let rel = m[1].trim();
    if (!rel.endsWith('.tex')) rel += '.tex';
    if (fs.existsSync(path.join(ROOT, folder, rel))) inputFiles.push(rel);
  }

  return { title, author, instructor, inputFiles };
}

// ── Extract \section headings ─────────────────────────────────────────

function extractSections(folder, inputFiles) {
  const sections = [];
  for (const file of inputFiles) {
    const src = fs.readFileSync(path.join(ROOT, folder, file), 'utf8');
    for (const line of src.split('\n')) {
      const m = line.match(/^\\section\*?\{([^}]+)\}/);
      if (m) sections.push(m[1].trim());
    }
  }
  return sections;
}

// ── Run pandoc ────────────────────────────────────────────────────────

function buildBook(folder, info) {
  const { title, inputFiles } = info;
  const bookPath = path.join(ROOT, folder, 'book.html');
  const files    = inputFiles.map(f => `"${f}"`).join(' ');

  const cmd = [
    `pandoc ${files}`,
    '--from=latex --to=html5',
    `--template="${TEMPLATE}"`,
    '--toc --toc-depth=2 --standalone --mathjax',
    `--metadata title="${title}"`,
    `-o "${bookPath}"`,
  ].join(' ');

  console.log('  Running pandoc…');
  execSync(cmd, { cwd: path.join(ROOT, folder), stdio: 'pipe' });
  fixPdfEmbeds(bookPath, folder);
  console.log(`  ✓ book.html generated`);
}

// ── Convert PDF figures → PNG, patch embed → img ─────────────────────

function fixPdfEmbeds(htmlPath, folder) {
  let html   = fs.readFileSync(htmlPath, 'utf8');
  const dir  = path.dirname(htmlPath);
  let changed = false;

  html = html.replace(/<embed src="([^"]+\.pdf)"\s*\/?>/g, (match, pdfRel) => {
    const pngRel = pdfRel.replace(/\.pdf$/, '.png');
    const pdfAbs = path.join(dir, pdfRel);
    const pngAbs = path.join(dir, pngRel);

    if (!fs.existsSync(pngAbs) && fs.existsSync(pdfAbs)) {
      // Try magick (IMv7) first, fall back to convert
      const tool = 'magick';
      try {
        execSync(`${tool} -density 150 "${pdfAbs}" "${pngAbs}"`, { stdio: 'pipe' });
        console.log(`  Converted ${pdfRel} → ${pngRel}`);
      } catch {
        try {
          execSync(`convert -density 150 "${pdfAbs}" "${pngAbs}"`, { stdio: 'pipe' });
          console.log(`  Converted ${pdfRel} → ${pngRel}`);
        } catch (e) {
          console.warn(`  ⚠ Could not convert ${pdfRel}: ${e.message}`);
          return match; // leave embed unchanged
        }
      }
    }

    changed = true;
    return `<img src="${pngRel}" style="max-width:100%;border-radius:4px;" alt="figure" />`;
  });

  if (changed) fs.writeFileSync(htmlPath, html);
}

// ── Generate landing page ─────────────────────────────────────────────

function generateLandingPage(folder, info, sections) {
  const { title, author, instructor } = info;

  const affiliHtml = instructor
    ? `\n      <div class="by-affil">Instructor: ${esc(instructor)}</div>` : '';

  const n = sections.length;
  const countLabel = n === 0 ? '' : n === 1 ? 'One Section' : `${n} Sections`;

  const tocItems = sections.map((sec, i) => `
      <li><a class="toc-item" href="book.html#${toAnchor(sec)}">
        <span class="toc-num">${i + 1}</span>
        <span class="toc-body">
          <span class="toc-title">${esc(sec)}</span>
        </span>
        <span class="toc-right"><span class="toc-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span></span>
      </a></li>`).join('');

  const contentsSection = sections.length ? `
  <section class="contents">
    <div class="contents-head">
      <h2>Contents</h2>
      <span class="ch-count">${esc(countLabel)}</span>
      <span class="rule-grow"></span>
    </div>
    <ol class="toc">${tocItems}
    </ol>
  </section>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <script>(function(){var t=localStorage.getItem('notes-theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Notes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../optimal_control/assets/index.css">
  <style>
    .back-link{display:inline-flex;align-items:center;gap:7px;font-family:"Inter",sans-serif;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#9a7b4f;text-decoration:none;}
    .back-link svg{width:13px;height:13px;}
    .back-link:hover{color:#161310;}
  </style>
</head>
<body>
  <div class="grain"></div>
  <header class="masthead">
    <a class="back-link" href="../index.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      All Notes
    </a>
    <div class="mast-right-wrap">
      <span class="mast-right">Course Notes</span>
      <div class="theme-toggle" id="landing-theme-toggle" aria-label="Switch theme">
        <button class="tt-btn" data-t="light" title="Light mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="6.64" y2="6.64"/><line x1="17.36" y1="17.36" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="17.36" y2="6.64"/><line x1="6.64" y1="17.36" x2="4.93" y2="19.07"/></svg></button>
        <button class="tt-btn" data-t="dark" title="Dark mode"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
        <button class="tt-btn" data-t="paper" title="Parchment mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></button>
      </div>
    </div>
  </header>
  <section class="hero">
    <div class="hero-kicker">Course Notes</div>
    <h1 class="hero-title">${esc(title)}</h1>
    <div class="hero-byline">
      <div class="by-name">${esc(author)}</div>${affiliHtml}
    </div>
    <div class="hero-actions">
      <a href="book.html" class="btn btn-primary">
        Read Notes
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
    </div>
  </section>
  ${contentsSection}
  <footer class="site-footer">
    <p>Thank you to the respective authors and professors for these notes.</p>
  </footer>
  <script>
  (function() {
    var html = document.documentElement, toggle = document.getElementById('landing-theme-toggle');
    if (!toggle) return;
    function getTheme() { return localStorage.getItem('notes-theme') || 'auto'; }
    function setTheme(t) {
      if (t === 'auto') { html.removeAttribute('data-theme'); localStorage.removeItem('notes-theme'); }
      else { html.setAttribute('data-theme', t); localStorage.setItem('notes-theme', t); }
      sync();
    }
    function sync() {
      var cur = getTheme();
      toggle.querySelectorAll('.tt-btn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-t') === cur);
      });
    }
    toggle.addEventListener('click', function(e) {
      var btn = e.target.closest ? e.target.closest('.tt-btn') : null;
      if (!btn) return;
      setTheme(getTheme() === btn.getAttribute('data-t') ? 'auto' : btn.getAttribute('data-t'));
    });
    sync();
  })();
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(ROOT, folder, 'index.html'), html);
  console.log('  ✓ index.html generated');
}

// ── Add card to root index.html ───────────────────────────────────────

function addRootCard(folder, info, sections) {
  let html = fs.readFileSync(ROOT_INDEX, 'utf8');

  // Skip if card already exists
  if (html.includes(`href="${folder}/index.html"`)) {
    console.log('  Card already present in root index.html — skipping');
    return;
  }

  const { title } = info;

  // Build a short description from section titles
  const desc = sections.length
    ? sections.slice(0, 3).join(', ') + (sections.length > 3 ? ', and more.' : '.')
    : `Course notes on ${title}.`;

  const card = `
    <a class="note-card" href="${folder}/index.html">
      <div class="note-tag">Course Notes</div>
      <div class="note-title">${esc(title)}</div>
      <div class="note-desc">${esc(desc)}</div>
      <div class="note-go">
        Read
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    </a>

  </div>`;

  // Insert before the closing </div> of .note-grid
  html = html.replace(/\n  <\/div>\n\n  <!-- Footer/, card + '\n\n  <!-- Footer');
  fs.writeFileSync(ROOT_INDEX, html);
  console.log('  ✓ Card added to root index.html');
}

// ── Scan for unregistered folders ─────────────────────────────────────

const SKIP = new Set(['optimal_control', 'latex_files', '.git', 'node_modules']);

function scanForNewFolders() {
  const rootHtml = fs.readFileSync(ROOT_INDEX, 'utf8');
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.'))
    .map(e => e.name)
    .filter(name =>
      fs.existsSync(path.join(ROOT, name, 'main.tex')) &&
      !rootHtml.includes(`href="${name}/index.html"`)
    );
}

// ── Entry point ───────────────────────────────────────────────────────

function processFolder(folder) {
  console.log(`\n── ${folder} ──`);
  const info     = parseMainTex(folder);
  console.log(`   Title:  ${info.title}`);
  console.log(`   Author: ${info.author}${info.instructor ? ' · Instructor: ' + info.instructor : ''}`);
  console.log(`   Files:  ${info.inputFiles.join(', ') || '(none found)'}`);

  if (info.inputFiles.length === 0) {
    console.error('  ✗ No \\ input files found — check that lines are not commented out');
    return;
  }

  buildBook(folder, info);
  const sections = extractSections(folder, info.inputFiles);
  generateLandingPage(folder, info, sections);
  addRootCard(folder, info, sections);
}

const target = process.argv[2];
if (target) {
  processFolder(target);
} else {
  const found = scanForNewFolders();
  if (found.length === 0) {
    console.log('All note folders are already registered. Pass a folder name to force re-processing.');
  } else {
    found.forEach(processFolder);
  }
}
