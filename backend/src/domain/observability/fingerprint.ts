import { createHash } from 'node:crypto';
import type { ErrorSource } from '@shared/domain';

/** First line only, with anything that varies between occurrences of the same
 * bug (numbers, ids, uuids, hex/base64-ish tokens) collapsed to a placeholder. */
function normalizeTitle(title: string): string {
  return title
    .split('\n')[0]
    .trim()
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '#')
    .replace(/\b[a-z0-9_-]{20,}\b/g, '#')
    .replace(/\d+/g, '#');
}

/**
 * The first frames of a stack are the fingerprint of a bug — where it broke,
 * not which request triggered it. Keeps file/function, drops the exact
 * line:column (shifts across deploys) and any path prefix before the project.
 */
function normalizeFrames(stack: string, frameCount = 3): string {
  return stack
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at ') || /^[\w.]+@/.test(l)) // node/V8 or browser "fn@file" style
    .slice(0, frameCount)
    .map((l) =>
      l
        .replace(/:\d+:\d+\)?$/, '')
        .replace(/^.*[/\\](src|dist)[/\\]/, '')
        .replace(/^.*[/\\]node_modules[/\\]/, 'node_modules/'),
    )
    .join('\n');
}

/** Groups occurrences of the same bug into one issue, regardless of the exact
 * dynamic values in the message or shifting line numbers across deploys. */
export function computeFingerprint(source: ErrorSource, title: string, stack: string): string {
  const payload = [source, normalizeTitle(title), normalizeFrames(stack)].join('::');
  return createHash('sha256').update(payload).digest('hex');
}

/** The short title shown in the issues list — never the full message. */
export function summarizeTitle(title: string, max = 140): string {
  const firstLine = title.split('\n')[0].trim();
  return firstLine.length > max ? `${firstLine.slice(0, max - 1)}…` : firstLine;
}
