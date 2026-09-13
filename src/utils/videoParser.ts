/**
 * Turns arbitrary pasted text into playable video descriptors.
 *
 * This module is intentionally free of React so the rules can be reasoned about
 * (and reused) on their own.
 */

import type { ParsedVideo, VideoSource } from '../types';
import {
  getHostname,
  isProbablyUrl,
  normalizeUrl,
  parseTimeToSeconds,
  splitUrlList,
  toUrl,
} from './urlHelpers';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
]);

const DIRECT_VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.ogg',
  '.ogv',
  '.mov',
  '.m4v',
  '.mpd',
  '.m3u8',
];

/**
 * Hosts that reliably refuse to be framed (`X-Frame-Options: DENY` or a
 * restrictive `frame-ancestors` CSP). We never pretend these will work; the UI
 * shows an honest fallback card with a link out instead.
 */
const KNOWN_UNEMBEDDABLE_HOSTS = [
  'x.com',
  'twitter.com',
  'instagram.com',
  'facebook.com',
  'fb.watch',
  'netflix.com',
  'hulu.com',
  'disneyplus.com',
  'primevideo.com',
  'amazon.com',
  'max.com',
  'hbomax.com',
  'peacocktv.com',
  'paramountplus.com',
  'apple.com',
  'tv.apple.com',
  'github.com',
  'reddit.com',
  'linkedin.com',
  'pinterest.com',
  'google.com',
  'news.google.com',
];

/** Where this build is running — required by the YouTube and Twitch embeds. */
function currentOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function currentHostname(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname || 'localhost';
}

function matchesHost(hostname: string, candidates: Iterable<string>): boolean {
  for (const candidate of candidates) {
    if (hostname === candidate || hostname.endsWith(`.${candidate}`)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ YouTube */

/**
 * Extracts the 11 character video id from every common YouTube URL shape:
 * `watch?v=`, `youtu.be/`, `/shorts/`, `/live/`, `/embed/` and `/v/`.
 */
export function getYouTubeVideoId(raw: string): string | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!matchesHost(host, YOUTUBE_HOSTS)) return null;

  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    const id = segments[0];
    return id && YOUTUBE_ID.test(id) ? id : null;
  }

  const queryId = url.searchParams.get('v');
  if (queryId && YOUTUBE_ID.test(queryId)) return queryId;

  const [first, second] = segments;
  if (first && ['shorts', 'live', 'embed', 'v', 'e'].includes(first.toLowerCase())) {
    return second && YOUTUBE_ID.test(second) ? second : null;
  }

  return null;
}

/** Playlist id, so `?list=` only links still play as a series. */
function getYouTubePlaylistId(raw: string): string | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!matchesHost(host, YOUTUBE_HOSTS)) return null;
  const list = url.searchParams.get('list');
  return list && /^[A-Za-z0-9_-]{12,}$/.test(list) ? list : null;
}

function buildYouTubeEmbed(videoId: string, source: URL): string {
  const params = new URLSearchParams({
    // Enables the official IFrame Player API postMessage channel, which is how
    // "Mute all" talks to YouTube embeds instead of faking controls.
    enablejsapi: '1',
    rel: '0',
    playsinline: '1',
    modestbranding: '1',
  });
  const origin = currentOrigin();
  if (origin && !origin.startsWith('file:')) params.set('origin', origin);

  const start = parseTimeToSeconds(
    source.searchParams.get('t') ?? source.searchParams.get('start'),
  );
  if (start > 0) params.set('start', String(start));

  const list = source.searchParams.get('list');
  if (list) params.set('list', list);

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/* -------------------------------------------------------------------- Vimeo */

/** Extracts the numeric Vimeo id from public, channel, group and player URLs. */
export function getVimeoVideoId(raw: string): string | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;

  const segments = url.pathname.split('/').filter(Boolean);
  // The id is the first purely numeric segment: /123, /channels/x/123,
  // /groups/x/videos/123, /video/123, /123/privacyhash
  const numeric = segments.find((segment) => /^\d+$/.test(segment));
  return numeric ?? null;
}

/** Unlisted Vimeo videos need their privacy hash (`?h=` or trailing segment). */
function getVimeoHash(raw: string, videoId: string): string | null {
  const url = toUrl(raw);
  if (!url) return null;
  const fromQuery = url.searchParams.get('h');
  if (fromQuery) return fromQuery;
  const segments = url.pathname.split('/').filter(Boolean);
  const index = segments.indexOf(videoId);
  const next = index >= 0 ? segments[index + 1] : undefined;
  return next && /^[A-Za-z0-9]{6,}$/.test(next) ? next : null;
}

/* ------------------------------------------------------------- Direct files */

/** True for links that end in a browser-playable media extension. */
export function isDirectVideo(raw: string): boolean {
  const url = toUrl(raw);
  if (!url) return false;
  const path = url.pathname.toLowerCase();
  return DIRECT_VIDEO_EXTENSIONS.some((extension) => path.endsWith(extension));
}

/* ------------------------------------------------------------ Other hosts */

function parseTwitch(url: URL): { embedUrl: string; key: string } | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!matchesHost(host, ['twitch.tv'])) return null;

  const parent = currentHostname();
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'clips.twitch.tv' && segments[0]) {
    return {
      embedUrl: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(segments[0])}&parent=${parent}`,
      key: `twitch:clip:${segments[0]}`,
    };
  }
  if (segments[0] === 'videos' && segments[1]) {
    return {
      embedUrl: `https://player.twitch.tv/?video=${encodeURIComponent(segments[1])}&parent=${parent}&autoplay=false`,
      key: `twitch:video:${segments[1]}`,
    };
  }
  if (segments[1] === 'clip' && segments[2]) {
    return {
      embedUrl: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(segments[2])}&parent=${parent}`,
      key: `twitch:clip:${segments[2]}`,
    };
  }
  if (segments[0]) {
    return {
      embedUrl: `https://player.twitch.tv/?channel=${encodeURIComponent(segments[0])}&parent=${parent}&autoplay=false`,
      key: `twitch:channel:${segments[0].toLowerCase()}`,
    };
  }
  return null;
}

function parseDailymotion(url: URL): { embedUrl: string; key: string } | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'dai.ly' && segments[0]) {
    return {
      embedUrl: `https://www.dailymotion.com/embed/video/${segments[0]}`,
      key: `dailymotion:${segments[0]}`,
    };
  }
  if (matchesHost(host, ['dailymotion.com']) && segments[0] === 'video' && segments[1]) {
    return {
      embedUrl: `https://www.dailymotion.com/embed/video/${segments[1]}`,
      key: `dailymotion:${segments[1]}`,
    };
  }
  return null;
}

function parseStreamable(url: URL): { embedUrl: string; key: string } | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!matchesHost(host, ['streamable.com'])) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[0] === 'e' || segments[0] === 'o' ? segments[1] : segments[0];
  if (!id) return null;
  return { embedUrl: `https://streamable.com/e/${id}`, key: `streamable:${id}` };
}

function parseTikTok(url: URL): { embedUrl: string; key: string } | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!matchesHost(host, ['tiktok.com'])) return null;
  const match = url.pathname.match(/\/video\/(\d+)/);
  if (!match) return null;
  return {
    embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
    key: `tiktok:${match[1]}`,
  };
}

/** Google Drive shares can be framed through their `/preview` route. */
function parseGoogleDrive(url: URL): { embedUrl: string; key: string } | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'drive.google.com') return null;
  const match = url.pathname.match(/\/file\/d\/([^/]+)/);
  const id = match?.[1] ?? url.searchParams.get('id');
  if (!id) return null;
  return {
    embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    key: `gdrive:${id}`,
  };
}

/* ------------------------------------------------------------------- Public */

/**
 * Parses one candidate string into a video descriptor (without an id, which the
 * store assigns) or an explanation of why it was rejected.
 */
export function parseVideoUrl(input: string): ParsedVideo {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, input, reason: 'Empty line' };

  if (!isProbablyUrl(trimmed)) {
    return { ok: false, input: trimmed, reason: "Doesn't look like a URL" };
  }

  const url = toUrl(trimmed)!;
  const hostname = getHostname(trimmed);

  const youTubeId = getYouTubeVideoId(trimmed);
  if (youTubeId) {
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'youtube',
        embedUrl: buildYouTubeEmbed(youTubeId, url),
        hostname: 'youtube.com',
        provider: 'YouTube',
        key: `youtube:${youTubeId}`,
      },
    };
  }

  const playlistId = getYouTubePlaylistId(trimmed);
  if (playlistId) {
    const params = new URLSearchParams({ enablejsapi: '1', list: playlistId });
    const origin = currentOrigin();
    if (origin && !origin.startsWith('file:')) params.set('origin', origin);
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'youtube',
        embedUrl: `https://www.youtube.com/embed/videoseries?${params.toString()}`,
        hostname: 'youtube.com',
        provider: 'YouTube playlist',
        key: `youtube:list:${playlistId}`,
      },
    };
  }

  const vimeoId = getVimeoVideoId(trimmed);
  if (vimeoId) {
    const hash = getVimeoHash(trimmed, vimeoId);
    const params = new URLSearchParams({ dnt: '1' });
    if (hash) params.set('h', hash);
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`,
        hostname: 'vimeo.com',
        provider: 'Vimeo',
        key: `vimeo:${vimeoId}`,
      },
    };
  }

  if (isDirectVideo(trimmed)) {
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'file',
        embedUrl: url.toString(),
        hostname,
        provider: 'Direct file',
        key: normalizeUrl(trimmed),
      },
    };
  }

  const twitch = parseTwitch(url);
  if (twitch) {
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'twitch',
        embedUrl: twitch.embedUrl,
        hostname,
        provider: 'Twitch',
        key: twitch.key,
      },
    };
  }

  const dailymotion = parseDailymotion(url);
  if (dailymotion) {
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'dailymotion',
        embedUrl: dailymotion.embedUrl,
        hostname,
        provider: 'Dailymotion',
        key: dailymotion.key,
      },
    };
  }

  const streamable = parseStreamable(url);
  if (streamable) {
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'streamable',
        embedUrl: streamable.embedUrl,
        hostname,
        provider: 'Streamable',
        key: streamable.key,
      },
    };
  }

  const tiktok = parseTikTok(url);
  if (tiktok) {
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'tiktok',
        embedUrl: tiktok.embedUrl,
        hostname,
        provider: 'TikTok',
        key: tiktok.key,
      },
    };
  }

  const drive = parseGoogleDrive(url);
  if (drive) {
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'iframe',
        embedUrl: drive.embedUrl,
        hostname,
        provider: 'Google Drive',
        key: drive.key,
      },
    };
  }

  if (matchesHost(hostname, KNOWN_UNEMBEDDABLE_HOSTS)) {
    return {
      ok: true,
      video: {
        originalUrl: trimmed,
        kind: 'unembeddable',
        embedUrl: null,
        hostname,
        provider: hostname,
        key: normalizeUrl(trimmed),
      },
    };
  }

  // Unknown host: optimistically try an iframe. The player shows a fallback if
  // the site turns out to block framing.
  return {
    ok: true,
    video: {
      originalUrl: trimmed,
      kind: 'iframe',
      embedUrl: url.toString(),
      hostname,
      provider: hostname,
      key: normalizeUrl(trimmed),
    },
  };
}

export interface ParseListResult {
  videos: Omit<VideoSource, 'id'>[];
  invalid: { input: string; reason: string }[];
}

/**
 * Parses a whole textarea value: trims, drops blank lines, removes duplicates
 * within the batch, and collects invalid entries instead of throwing.
 */
export function parseVideoList(text: string): ParseListResult {
  const videos: Omit<VideoSource, 'id'>[] = [];
  const invalid: { input: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const candidate of splitUrlList(text)) {
    const parsed = parseVideoUrl(candidate);
    if (!parsed.ok) {
      invalid.push({ input: parsed.input, reason: parsed.reason });
      continue;
    }
    if (seen.has(parsed.video.key)) continue;
    seen.add(parsed.video.key);
    videos.push(parsed.video);
  }

  return { videos, invalid };
}

/** True when a player can be muted through an official provider API. */
export function supportsMuteControl(kind: VideoSource['kind']): boolean {
  return kind === 'file' || kind === 'youtube' || kind === 'vimeo';
}
