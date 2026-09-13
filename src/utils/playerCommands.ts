/**
 * Provider control channels.
 *
 * YouTube and Vimeo both expose an official `postMessage` protocol for their
 * iframe players (YouTube needs `enablejsapi=1`, which `videoParser` adds). Those
 * are the only embeds MultiView claims to control — every other provider keeps
 * its own native controls and no fake buttons are offered for it.
 */

const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const VIMEO_ORIGIN = 'https://player.vimeo.com';

function post(frame: HTMLIFrameElement | null, payload: unknown, origin: string): void {
  try {
    frame?.contentWindow?.postMessage(JSON.stringify(payload), origin);
  } catch {
    // Cross-origin frames can refuse the call; controls simply stay native.
  }
}

/** Sends an IFrame Player API command, e.g. `mute`, `unMute`, `pauseVideo`. */
function youtubeCommand(frame: HTMLIFrameElement | null, func: string, args: unknown[] = []): void {
  post(frame, { event: 'command', func, args }, YOUTUBE_ORIGIN);
}

/** Sends a Vimeo player method, e.g. `setMuted`, `pause`. */
function vimeoCommand(frame: HTMLIFrameElement | null, method: string, value?: unknown): void {
  post(frame, value === undefined ? { method } : { method, value }, VIMEO_ORIGIN);
}

export function setIframeMuted(
  frame: HTMLIFrameElement | null,
  kind: 'youtube' | 'vimeo',
  muted: boolean,
): void {
  if (kind === 'youtube') {
    youtubeCommand(frame, muted ? 'mute' : 'unMute');
    return;
  }
  vimeoCommand(frame, 'setMuted', muted);
  vimeoCommand(frame, 'setVolume', muted ? 0 : 1);
}

/**
 * Forces a frame to reload. Bouncing through `about:blank` is used instead of
 * re-assigning the same URL because some browsers treat that as a no-op.
 */
export function reloadIframe(frame: HTMLIFrameElement | null): void {
  if (!frame) return;
  const source = frame.dataset.src ?? frame.src;
  if (!source || source === 'about:blank') return;
  frame.src = 'about:blank';
  window.setTimeout(() => {
    frame.src = source;
  }, 60);
}
