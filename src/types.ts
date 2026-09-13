/** Shared application types. */

/** Every URL MultiView accepts resolves to exactly one of these kinds. */
export type VideoKind =
  | 'youtube'
  | 'vimeo'
  | 'twitch'
  | 'dailymotion'
  | 'streamable'
  | 'tiktok'
  | 'file' // direct .mp4/.webm/... played with <video>
  | 'iframe' // unknown host, optimistically embedded
  | 'unembeddable'; // known to refuse framing (X-Frame-Options / CSP)

export interface VideoSource {
  /** Stable unique id, also used as the React key. */
  id: string;
  /** Exactly what the user pasted (after trimming). */
  originalUrl: string;
  kind: VideoKind;
  /** URL loaded by the player. `null` when the host refuses embedding. */
  embedUrl: string | null;
  hostname: string;
  /** Human readable provider name, e.g. "YouTube" or "Direct file". */
  provider: string;
  /** Canonical form used for duplicate detection. */
  key: string;
}

/** Result of parsing a single pasted line. */
export type ParsedVideo =
  | { ok: true; video: Omit<VideoSource, 'id'> }
  | { ok: false; input: string; reason: string };

export type LayoutMode = 'auto' | '1' | '2' | '3' | '4';

export interface Session {
  /** Insertion order — kept stable so reordering never remounts a player. */
  videos: VideoSource[];
  /** Video ids in display order. */
  order: string[];
}

/**
 * Per-player control state owned by the viewer page. Keeping it declarative
 * means "Mute all" and "Reload all" never remount a player — they only change
 * props, so playback of the other cards is untouched.
 */
export interface PlayerControls {
  muted: boolean;
  playbackRate: number;
  /** Bumped to request a reload of this single player. */
  reloadNonce: number;
}
