import { memo, useEffect, useRef, useState } from 'react';
import type { PlayerControls, VideoSource } from '../../types';
import { reloadIframe, setIframeMuted } from '../../utils/playerCommands';
import { EmbedFallback } from './EmbedFallback';
import './VideoPlayer.css';

/** How long a generic embed may stay blank before we warn about framing. */
const EMBED_TIMEOUT_MS = 7000;

const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';

interface VideoPlayerProps {
  video: VideoSource;
  controls: PlayerControls;
  label: string;
}

/**
 * Renders one video with the right technology for its source and applies the
 * declarative control props through official provider APIs only.
 */
function VideoPlayerImpl({ video, controls, label }: VideoPlayerProps) {
  const { kind, embedUrl, originalUrl } = video;
  const { muted, playbackRate, reloadNonce } = controls;

  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const mountedNonce = useRef(reloadNonce);
  /** True once MultiView has muted this player, so unmuting is safe to send. */
  const muteIntent = useRef(false);

  const isFile = kind === 'file';
  const isFrame = !isFile && kind !== 'unembeddable' && embedUrl !== null;

  /* ---------------------------------------------------------------- muting */

  // `loaded` is a dependency because a freshly (re)loaded provider player starts
  // at its own defaults and ignores commands sent before it was ready.
  useEffect(() => {
    if (isFile) {
      if (videoRef.current) videoRef.current.muted = muted;
      return;
    }
    if (kind !== 'youtube' && kind !== 'vimeo') return;

    if (muted) muteIntent.current = true;
    // Never send an unsolicited `unMute`: the viewer may have muted the video
    // with the provider's own controls, which MultiView cannot see.
    if (!muteIntent.current) return;

    setIframeMuted(frameRef.current, kind, muted);
    const retry = window.setTimeout(() => setIframeMuted(frameRef.current, kind, muted), 800);
    return () => window.clearTimeout(retry);
  }, [muted, isFile, kind, loaded]);

  /* --------------------------------------------------------- playback rate */

  useEffect(() => {
    if (isFile && videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, isFile]);

  /* ------------------------------------------------------------- reloading */

  useEffect(() => {
    if (reloadNonce === mountedNonce.current) return;
    mountedNonce.current = reloadNonce;

    setFailed(false);
    setTimedOut(false);
    setLoaded(false);

    // `load()` already rewinds to the start; touching currentTime before the
    // metadata is ready can throw.
    if (isFile) {
      videoRef.current?.load();
      return;
    }
    reloadIframe(frameRef.current);
  }, [reloadNonce, isFile]);

  /* -------------------------------------- generic embed blocking heuristic */

  // X-Frame-Options rejections are invisible to JavaScript, so the only signal
  // available is "nothing ever loaded". Known providers are never guessed about.
  useEffect(() => {
    if (kind !== 'iframe' || loaded) return;
    const timer = window.setTimeout(() => setTimedOut(true), EMBED_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [kind, loaded, reloadNonce]);

  /* ----------------------------------------------------------------- render */

  if (kind === 'unembeddable') {
    return (
      <div className="player">
        <EmbedFallback
          title="This website may not allow embedded playback"
          message={`${video.hostname} blocks being displayed inside other sites, so it can't be played here.`}
          url={originalUrl}
        />
      </div>
    );
  }

  if (isFile) {
    return (
      <div className="player">
        <video
          ref={videoRef}
          className="player__media"
          src={embedUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            setLoaded(true);
            // Re-apply state that a fresh media element resets.
            if (videoRef.current) {
              videoRef.current.muted = muted;
              videoRef.current.playbackRate = playbackRate;
            }
          }}
          onError={() => setFailed(true)}
        />
        {failed && (
          <EmbedFallback
            title="This file couldn’t be played"
            message="The link may be offline, require a login, or use a format this browser can’t decode."
            url={originalUrl}
            overlay
          />
        )}
      </div>
    );
  }

  if (!isFrame) {
    return (
      <div className="player">
        <EmbedFallback
          title="Nothing to play here"
          message="MultiView couldn’t work out how to embed this link."
          url={originalUrl}
        />
      </div>
    );
  }

  return (
    <div className="player">
      {!loaded && (
        <div className="player__skeleton" aria-hidden="true">
          <span className="player__spinner" />
        </div>
      )}
      <iframe
        ref={frameRef}
        className="player__media"
        src={embedUrl}
        data-src={embedUrl}
        title={label}
        allow={IFRAME_ALLOW}
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
      {timedOut && !loaded && (
        <EmbedFallback
          title="This website may not allow embedded playback"
          message="Sites can refuse to be embedded for security reasons. Opening it in a new tab always works."
          url={originalUrl}
          overlay
          onDismiss={() => setTimedOut(false)}
        />
      )}
    </div>
  );
}

/**
 * Memoised so unrelated state changes on the viewer page (opening a menu,
 * dragging another card) never touch a running player.
 */
export const VideoPlayer = memo(VideoPlayerImpl);
