import { SITE_URL } from '~/lib/seo';

/**
 * GET /embed.js — the loader for the "Sampai mana kasus X?" widget.
 *
 * Plain ES5, no dependencies. Every element carrying `data-sampaimana-case="<slug>"` becomes an
 * iframe pointing at /embed/kasus/<slug> on the origin this script was loaded from, and the
 * iframe is resized from the `sampaimana:height` messages the widget posts. Attributes are only
 * ever read as plain strings and applied through DOM APIs (never as HTML).
 */
const script = (fallbackOrigin: string) => `(function () {
  'use strict';
  var FALLBACK_ORIGIN = ${JSON.stringify(fallbackOrigin)};
  var SLUG_RE = /^[a-z0-9-]{1,120}$/;
  var THEMES = { light: 1, dark: 1, auto: 1 };
  var MARK = 'data-sampaimana-ready';
  var MIN_HEIGHT = 60;
  var MAX_HEIGHT = 4000;

  // Re-including the script just re-scans the page.
  if (window.SampaiMana && typeof window.SampaiMana.init === 'function') {
    window.SampaiMana.init();
    return;
  }

  function originOf(src) {
    try {
      var a = document.createElement('a');
      a.href = src;
      if (a.protocol === 'http:' || a.protocol === 'https:') {
        var host = a.host;
        // old IE keeps the default port in .host
        if (a.protocol === 'http:') host = host.replace(/:80$/, '');
        if (a.protocol === 'https:') host = host.replace(/:443$/, '');
        return a.protocol + '//' + host;
      }
    } catch (e) {}
    return '';
  }

  var current = document.currentScript;
  if (!current) {
    var found = document.querySelectorAll('script[src*="embed.js"]');
    current = found.length ? found[found.length - 1] : null;
  }
  var ORIGIN = (current && current.src && originOf(current.src)) || FALLBACK_ORIGIN;

  var frames = [];

  function build(node) {
    var slug = (node.getAttribute('data-sampaimana-case') || '').replace(/^\\s+|\\s+$/g, '');
    if (!SLUG_RE.test(slug)) {
      if (window.console && console.warn) console.warn('[SampaiMana] data-sampaimana-case tidak valid:', slug);
      node.setAttribute(MARK, 'invalid');
      return;
    }
    var theme = (node.getAttribute('data-theme') || 'auto').toLowerCase();
    if (!THEMES.hasOwnProperty(theme)) theme = 'auto';

    var iframe = document.createElement('iframe');
    iframe.src = ORIGIN + '/embed/kasus/' + encodeURIComponent(slug) + '?theme=' + theme;
    iframe.title = 'Status kasus: ' + slug;
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    iframe.style.cssText = 'display:block;width:100%;max-width:100%;height:300px;border:0;color-scheme:normal;';

    // Fill the container (any fallback content inside it is replaced).
    while (node.firstChild) node.removeChild(node.firstChild);
    node.appendChild(iframe);
    node.setAttribute(MARK, '1');
    frames.push({ iframe: iframe, slug: slug });
  }

  function init() {
    var nodes = document.querySelectorAll('[data-sampaimana-case]');
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].hasAttribute(MARK)) build(nodes[i]);
    }
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== ORIGIN) return;
    var msg = event.data;
    if (!msg || typeof msg !== 'object' || msg.type !== 'sampaimana:height') return;
    var height = Number(msg.height);
    if (!isFinite(height)) return;
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].iframe.contentWindow === event.source) {
        frames[i].iframe.style.height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(height))) + 'px';
        return;
      }
    }
  });

  window.SampaiMana = { init: init, version: 1 };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

export function loader() {
  return new Response(script(SITE_URL), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}
