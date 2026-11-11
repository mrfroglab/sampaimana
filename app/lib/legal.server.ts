/**
 * Legal pages (/privasi, /ketentuan) are rendered from the Markdown in docs/legal, so the page and the
 * document in the repo can never disagree. Edit the Markdown, not the route.
 *
 * Runs on the server only: the HTML is produced in the loader and `marked` never ships to the browser.
 * The Markdown is our own trusted content from the repo, not user input.
 */
import { Marked } from 'marked';
import privacy from '../../docs/legal/PRIVACY.md?raw';
import terms from '../../docs/legal/TERMS.md?raw';

const SOURCES = { privacy, terms } as const;
export type LegalDoc = keyof typeof SOURCES;

const marked = new Marked({ gfm: true });

export interface LegalPage {
  title: string;
  html: string;
}

const cache = new Map<LegalDoc, LegalPage>();

export function legalPage(doc: LegalDoc): LegalPage {
  const hit = cache.get(doc);
  if (hit) return hit;
  const md = SOURCES[doc];
  // The first "# Title" becomes the page header; the rest is the body.
  const title = /^#\s+(.+)$/m.exec(md)?.[1].trim() ?? '';
  const body = md.replace(/^#\s+.+\n/m, '');
  const html = (marked.parse(body) as string)
    // Tables scroll sideways on phones instead of widening the page.
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, '</table></div>')
    // External links open in a new tab.
    .replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
  const page = { title, html };
  cache.set(doc, page);
  return page;
}
