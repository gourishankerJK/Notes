/*!
 * CVOC Enhancement Script — Fine-Press Edition
 * Robustly transforms LaTeX2HTML pages: strips legacy nav panels &
 * the stray cover block (hoisted out of <HEAD>), rebuilds navigation,
 * and renders all math via MathJax.
 */
(function () {
  'use strict';

  /* Apply saved theme immediately (belt+suspenders; head script is the real anti-FOUC) */
  (function() { var t = localStorage.getItem('cvoc-theme'); if (t) document.documentElement.setAttribute('data-theme', t); })();

  /* ── MathJax config (before load) ───────────────────────────── */
  window.MathJax = {
    tex: {
      inlineMath:  [['\\(', '\\)']],
      displayMath: [['\\[', '\\]']],
      packages:    { '[+]': ['boldsymbol', 'ams'] }
    },
    chtml: { scale: 0.98, mtextInheritFont: true, displayAlign: 'center' },
    options: { menuOptions: { settings: { inTabOrder: false } } },
    startup: { typeset: false }
  };

  var ICON = {
    left:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    home:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>'
  };

  /* ── Theme management ───────────────────────────────────────── */
  var THEME_SVG = {
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="6.64" y2="6.64"/><line x1="17.36" y1="17.36" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="17.36" y2="6.64"/><line x1="6.64" y1="17.36" x2="4.93" y2="19.07"/></svg>',
    dark:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    paper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  };

  function getTheme() { return localStorage.getItem('cvoc-theme') || 'auto'; }

  function setTheme(t) {
    if (t === 'auto') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('cvoc-theme');
    } else {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('cvoc-theme', t);
    }
    var btns = document.querySelectorAll('.tt-btn[data-t]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-t') === t);
    }
  }

  function buildThemeToggle() {
    var current = getTheme();
    var defs = [
      { t: 'light', title: 'Light mode' },
      { t: 'dark',  title: 'Dark mode'  },
      { t: 'paper', title: 'Parchment mode' }
    ];
    var wrap = document.createElement('div');
    wrap.className = 'theme-toggle';
    wrap.setAttribute('aria-label', 'Switch theme');
    var html = '';
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      html += '<button class="tt-btn' + (current === d.t ? ' active' : '') +
              '" data-t="' + d.t + '" title="' + d.title + '">' + THEME_SVG[d.t] + '</button>';
    }
    wrap.innerHTML = html;
    wrap.addEventListener('click', function(e) {
      var btn = e.target.closest ? e.target.closest('.tt-btn') : null;
      if (!btn) return;
      var t = btn.getAttribute('data-t');
      setTheme(getTheme() === t ? 'auto' : t);
    });
    return wrap;
  }

  /* ── TOC section-list links ─────────────────────────────────── */
  function enhanceTocLinks() {
    var pattern = /^(\d+(?:\.\d+)*)\s+(.{2,})/;
    var lis = document.querySelectorAll('#cvoc-content li');
    for (var i = 0; i < lis.length; i++) {
      var li = lis[i];
      var anchors = li.querySelectorAll('a');
      if (anchors.length !== 1) continue;
      var a = anchors[0];
      if (a.children.length > 0) continue;
      var text = (a.textContent || '').trim();
      var m = text.match(pattern);
      if (!m) continue;
      li.classList.add('toc-entry');
      a.innerHTML = '<span class="sec-num">' + esc(m[1]) + '</span>' +
                    '<span class="sec-title">' + esc(m[2].trim()) + '</span>';
    }
  }

  /* ── Capture link targets & titles (before we strip nav) ────── */
  function getMeta() {
    var nexts = document.querySelectorAll('link[rel="next"]');
    var meta = {
      next: nexts.length ? nexts[nexts.length - 1].getAttribute('href') : null, // last = sequential
      prev: getLink('previous'),
      up:   getLink('up'),
      title: { Next: '', Previous: '', Up: '' }
    };
    var bolds = document.querySelectorAll('b, B');
    for (var i = 0; i < bolds.length; i++) {
      var key = (bolds[i].textContent || '').trim().replace(/:$/, '');
      if (key === 'Next' || key === 'Up' || key === 'Previous') {
        var a = bolds[i].nextElementSibling;
        if (a && a.tagName === 'A' && !meta.title[key]) {
          meta.title[key] = a.textContent.replace(/\s+/g, ' ').trim();
        }
      }
    }
    return meta;
  }
  function getLink(rel) {
    var el = document.querySelector('link[rel="' + rel + '"]');
    return el ? el.getAttribute('href') : null;
  }

  /* ── Rescue head elements hoisted into <body> on malformed pages ──
     On the 12 chapter-title pages a stray cover block is emitted inside
     <HEAD>; the browser then bails into <body>, dragging the real
     <link rel=stylesheet>/<style> with it. Move them back to <head> so
     cleanLayout() can safely delete the stray block.                    */
  function rescueHead() {
    var orphans = document.body.querySelectorAll('link[rel="stylesheet"], style');
    for (var i = 0; i < orphans.length; i++) document.head.appendChild(orphans[i]);
  }

  /* ── Strip legacy layout, wrap real content in <article> ────── */
  function cleanLayout() {
    var body  = document.body;
    var nodes = [].slice.call(body.childNodes);
    var firstStart = -1, inNav = false, navStart = -1;
    var remove = {};

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.nodeType === 8) {                       // comment node
        var v = n.nodeValue || '';
        if (/End of Navigation Panel/.test(v)) {
          if (inNav) { for (var j = navStart; j <= i; j++) remove[j] = 1; inNav = false; }
        } else if (/Navigation Panel/.test(v)) {
          if (firstStart < 0) firstStart = i;
          if (!inNav) { inNav = true; navStart = i; }
        }
      }
    }
    /* Everything before the first nav panel = stray cover block hoisted from <HEAD> */
    if (firstStart > 0) { for (var k = 0; k < firstStart; k++) remove[k] = 1; }

    var keep = [];
    for (var m = 0; m < nodes.length; m++) {
      if (remove[m]) continue;
      var nn = nodes[m];
      if (nn.nodeType === 1 && nn.tagName === 'SCRIPT') continue; // drop our own + others
      keep.push(nn);
    }

    /* Trim leading empty text / <br> / <hr> noise */
    while (keep.length && isNoise(keep[0])) keep.shift();
    while (keep.length && isNoise(keep[keep.length - 1])) keep.pop();

    while (body.firstChild) body.removeChild(body.firstChild);

    var article = document.createElement('article');
    article.id = 'cvoc-content';
    for (var p = 0; p < keep.length; p++) article.appendChild(keep[p]);
    body.appendChild(article);
    return article;
  }
  function isNoise(node) {
    if (node.nodeType === 3) return !node.nodeValue.trim();
    if (node.nodeType === 1) {
      var t = node.tagName;
      if (t === 'BR' || t === 'HR') return true;
      if (t === 'P' && !node.textContent.trim() && !node.querySelector('img')) return true;
    }
    return false;
  }

  /* ── Top navigation bar ─────────────────────────────────────── */
  function buildNav(meta) {
    function arrow(href, dir, label, title) {
      var dead = href ? '' : ' dead';
      var inner = dir === 'left'
        ? ICON.left + textBlock(label, title)
        : textBlock(label, title) + ICON.right;
      if (href) return '<a href="' + href + '" class="nav-arrow ' + dir + dead + '">' + inner + '</a>';
      return '<span class="nav-arrow ' + dir + dead + '">' + inner + '</span>';
    }
    function textBlock(label, title) {
      return '<span class="nav-arrow-text"><span class="lbl-main">' + label + '</span>' +
             (title ? '<span class="lbl-sub">' + esc(title) + '</span>' : '') + '</span>';
    }

    var nav = document.createElement('div');
    nav.id = 'cvoc-nav';
    nav.innerHTML =
      '<div class="nav-inner">' +
        '<div class="nav-side">' + arrow(meta.prev, 'left', 'Previous', meta.title.Previous) + '</div>' +
        '<div class="nav-center">' +
          '<a href="../index.html" class="nav-home" title="Home">' + ICON.home + '</a>' +
          '<span class="nav-dot">·</span>' +
          '<a href="node1.html" class="nav-link">Contents</a>' +
          (meta.up ? '<span class="nav-dot">·</span><a href="' + meta.up + '" class="nav-link">Up</a>' : '') +
          '<span class="nav-dot">·</span>' +
          '<a href="node136.html" class="nav-link">Index</a>' +
        '</div>' +
        '<div class="nav-side right">' + arrow(meta.next, 'right', 'Next', meta.title.Next) + '</div>' +
      '</div>' +
      '<div id="cvoc-progress"><div id="cvoc-progress-fill"></div></div>';
    document.body.insertBefore(nav, document.body.firstChild);

    var center = nav.querySelector('.nav-center');
    if (center) {
      var sep = document.createElement('span');
      sep.className = 'nav-dot';
      sep.textContent = '·';
      center.appendChild(sep);
      center.appendChild(buildThemeToggle());
    }

    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'ArrowLeft'  || e.key === '[') && meta.prev) location.href = meta.prev;
      if ((e.key === 'ArrowRight' || e.key === ']') && meta.next) location.href = meta.next;
    });

    var fill = document.getElementById('cvoc-progress-fill');
    window.addEventListener('scroll', function () {
      var el = document.documentElement;
      var max = el.scrollHeight - el.clientHeight;
      fill.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
    }, { passive: true });
  }

  /* ── Large previous/next cards at the foot of the page ──────── */
  function buildPageEndNav(meta) {
    var wrap = document.createElement('nav');
    wrap.className = 'page-end-nav';
    function card(href, dir, title) {
      var cls = 'pe-' + dir + (href ? '' : ' dead');
      var label = dir === 'next' ? 'Next' : 'Previous';
      var body = '<span class="pe-dir">' + label + '</span><span class="pe-title">' + esc(title || '—') + '</span>';
      return href ? '<a href="' + href + '" class="' + cls + '">' + body + '</a>'
                  : '<a class="' + cls + '">' + body + '</a>';
    }
    wrap.innerHTML = card(meta.prev, 'prev', meta.title.Previous) + card(meta.next, 'next', meta.title.Next);
    document.body.appendChild(wrap);
  }

  /* ── Math: replace alt-LaTeX GIFs with MathJax ──────────────── */
  function processMath() {
    var divs = document.querySelectorAll('div[align="CENTER"], div[align="center"]');

    /* Pass A: numbered display equations (DIV > TABLE) */
    [].forEach.call(divs, function (div) {
      var table = div.querySelector('table');
      if (!table) return;
      var img = table.querySelector('img');
      if (!img) return;
      var latex = altLatex(img);
      if (latex === null) return;

      var eqNum = '';
      [].forEach.call(table.querySelectorAll('td'), function (td) {
        var t = td.textContent.trim();
        if (/^\(\d[\d.]*\)$/.test(t)) eqNum = t;
      });
      var anchor = div.querySelector('a[name]');

      var block = document.createElement('div');
      block.className = 'eq-block' + (eqNum ? '' : ' unnumbered');
      if (anchor) block.id = anchor.getAttribute('name');
      var m = document.createElement('div');
      m.className = 'eq-math';
      m.textContent = '\\[' + latex + '\\]';
      block.appendChild(m);
      if (eqNum) {
        var num = document.createElement('span');
        num.className = 'eq-num';
        num.textContent = eqNum;
        block.appendChild(num);
      }
      div.parentNode.replaceChild(block, div);
    });

    /* Pass B: unnumbered display equations (DIV > IMG) */
    [].forEach.call(document.querySelectorAll('div[align="CENTER"], div[align="center"]'), function (div) {
      var img = div.querySelector('img');
      if (!img) return;
      var latex = altLatex(img);
      if (latex === null) return;
      var block = document.createElement('div');
      block.className = 'eq-block unnumbered';
      block.textContent = '\\[' + latex + '\\]';
      div.parentNode.replaceChild(block, div);
    });

    /* Pass C: every remaining image */
    [].forEach.call(document.querySelectorAll('img'), function (img) {
      var rawAlt = (img.getAttribute('alt') || '').trim();

      /* C1: inline / display $…$ math */
      var latex = altLatex(img);
      if (latex !== null) {
        var w = parseInt(img.getAttribute('width') || '0', 10);
        var isDisplay = /^\\displaystyle/.test(rawAlt.replace(/^\$\s*/, '')) || w > 320;
        latex = latex.replace(/^\\displaystyle\s*/, '');
        if (isDisplay) {
          var b = document.createElement('div');
          b.className = 'eq-block unnumbered';
          b.textContent = '\\[' + latex + '\\]';
          img.parentNode.replaceChild(b, img);
        } else {
          var span = document.createElement('span');
          span.className = 'math-inline';
          span.textContent = '\\(' + latex + '\\)';
          img.parentNode.replaceChild(span, img);
        }
        return;
      }

      /* C2: real figures (\includegraphics) — keep image, give it a light card */
      if (/^\\includegraphics/.test(rawAlt)) { figureCard(img, null); return; }

      /* C3: rasterized LaTeX environments (\begin{…}) */
      var mb = rawAlt.match(/^\\begin\{([A-Za-z]+\*?)\}/);
      if (mb) {
        var env  = mb[1];
        var base = env.replace(/\*$/, '');
        var truncated = rawAlt.indexOf('...') >= 0;     // LaTeX2HTML abbreviated long alts

        if (MATH_ENVS[env] && !truncated) {
          replaceWithMath(img, mathEnvToTex(rawAlt, env));
          return;
        }
        if (THM_ENVS[base] && !truncated) {
          replaceWithCallout(img, base, renderLatexBody(stripEnv(rawAlt, env)));
          return;
        }
        if (THM_ENVS[base]) { figureCard(img, base); return; }   // truncated theorem → labelled card
        figureCard(img, null);                                    // other env → plain card
        return;
      }

      /* C4: anything else with non-math alt → neutral card so it stays readable */
      if (rawAlt && !/^(next|up|previous|contents|index)$/i.test(rawAlt)) figureCard(img, null);
    });
  }

  var MATH_ENVS = { displaymath:1, equation:1, 'equation*':1, align:1, 'align*':1,
                    multline:1, 'multline*':1, gather:1, 'gather*':1, eqnarray:1, 'eqnarray*':1, split:1 };
  var THM_ENVS  = { Example:1, Exercise:1, Theorem:1, Lemma:1, Proposition:1,
                    Corollary:1, Definition:1, Remark:1, Claim:1, Proof:1, Problem:1, Note:1 };

  /* Wrap an image in a light "figure card" (black-on-transparent GIFs stay
     legible in dark mode) with an optional type label. */
  function figureCard(img, label) {
    if (img.closest && img.closest('.lx-card')) return;
    var card = document.createElement('figure');
    card.className = 'lx-card' + (label ? ' lx-block' : ' lx-figure');
    if (label) {
      var lab = document.createElement('figcaption');
      lab.className = 'lx-label';
      lab.textContent = label;
      card.appendChild(lab);
    }
    var holder = document.createElement('div');
    holder.className = 'lx-scroll';
    img.parentNode.replaceChild(card, img);
    holder.appendChild(img);
    card.appendChild(holder);
  }

  function replaceWithMath(img, tex) {
    var b = document.createElement('div');
    b.className = 'eq-block unnumbered';
    b.textContent = tex;
    img.parentNode.replaceChild(b, img);
  }

  function replaceWithCallout(img, kind, bodyHtml) {
    var box = document.createElement('div');
    box.className = 'callout callout-' + kind.toLowerCase();
    var head = document.createElement('div');
    head.className = 'callout-head';
    head.textContent = kind;
    var body = document.createElement('div');
    body.className = 'callout-body';
    body.innerHTML = bodyHtml;
    box.appendChild(head);
    box.appendChild(body);
    img.parentNode.replaceChild(box, img);
  }

  /* ── Tiny LaTeX→HTML for short theorem bodies (math kept for MathJax) ── */
  function stripEnv(src, env) {
    var s = src.replace(new RegExp('^\\\\begin\\{' + env.replace('*', '\\*') + '\\}'), '');
    s = s.replace(new RegExp('\\\\end\\{' + env.replace('*', '\\*') + '\\}\\s*$'), '');
    return s;
  }
  function mathEnvToTex(src, env) {
    if (env === 'displaymath' || env === 'equation' || env === 'equation*') {
      return '\\[' + stripEnv(src, env) + '\\]';
    }
    if (env === 'split') return '\\[\\begin{split}' + stripEnv(src, 'split') + '\\end{split}\\]';
    return src; // align*, multline*, gather*, eqnarray* are handled by MathJax directly
  }
  function renderLatexBody(src) {
    var s = src;
    s = s.replace(/%\s*latex2html id marker\s*\d+/gi, '').replace(/%[^\n]*/g, '');
    s = s.replace(/^\s*\[([^\]]*)\]/, '');                       // drop optional [Title] right after \begin
    /* tokenize math so text rules don't touch it */
    var math = [];
    function tok(str) { math.push(str); return ' ' + (math.length - 1) + ' '; }
    s = s.replace(/\\\[([\s\S]*?)\\\]/g, function (_, m) { return tok('\\[' + m + '\\]'); });
    s = s.replace(/\$([^$]+)\$/g, function (_, m) { return tok('\\(' + m + '\\)'); });
    /* remove bookkeeping macros (with brace arg) */
    s = stripMacro(s, 'index');
    s = stripMacro(s, 'label');
    s = s.replace(/~?\\(?:eqref|ref)\{[^}]*\}/g, ' <span class="lx-ref">[ref]</span>');
    /* text emphasis */
    s = s.replace(/\\(?:emph|textit|textsl)\{([^}]*)\}/g, '<em>$1</em>');
    s = s.replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>');
    s = s.replace(/\\(?:textrm|text|mbox)\{([^}]*)\}/g, '$1');
    /* quotes, spaces, qed */
    s = s.replace(/\\lq\\lq|``/g, '“').replace(/''|\\rq\\rq/g, '”')
         .replace(/\\lq|`/g, '‘').replace(/\\rq/g, '’');
    s = s.replace(/~?\\qed/g, ' □');
    s = s.replace(/\\[,!;: ]/g, ' ').replace(/~/g, ' ');
    s = s.replace(/\\&/g, '&amp;').replace(/\\([%#_])/g, '$1');
    s = s.replace(/\\\\/g, '<br>');
    s = s.replace(/\n\s*\n/g, '</p><p>');
    s = s.replace(/\\[a-zA-Z]+\s?/g, '');                    // leftover bare macros
    s = s.replace(/[{}]/g, '');                              // leftover grouping braces
    s = s.replace(/ (\d+) /g, function (_, i) { return math[+i]; });
    return '<p>' + s.trim() + '</p>';
  }
  function stripMacro(s, name) {
    var needle = '\\' + name + '{';
    var i;
    while ((i = s.indexOf(needle)) !== -1) {
      var depth = 0, j = i + needle.length - 1;
      for (; j < s.length; j++) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') { depth--; if (depth === 0) { j++; break; } }
      }
      s = s.slice(0, i) + s.slice(j);
    }
    return s;
  }
  function altLatex(img) {
    var raw = (img.getAttribute('alt') || '').trim();
    if (raw.charAt(0) !== '$') return null;
    var s = raw;
    if (s.charAt(s.length - 1) === '$') s = s.slice(1, -1);
    else s = s.slice(1);
    return s.replace(/^\\displaystyle\s*/, '').trim();
  }

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── MathJax loader ─────────────────────────────────────────── */
  function loadMathJax() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';
    s.id = 'MathJax-script';
    s.async = true;
    s.onload = function () {
      if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise();
    };
    document.head.appendChild(s);
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    var meta = getMeta();
    rescueHead();
    cleanLayout();
    buildNav(meta);
    processMath();
    enhanceTocLinks();
    buildPageEndNav(meta);
    document.body.classList.add('cvoc-ready');
    loadMathJax();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
