"use client";

/**
 * The guard's line as a cutscene subtitle, not a speech bubble: plain text
 * low in frame, readability carried by a text-shadow stack rather than a
 * background plate, same treatment as GTA or a subtitled film. The "Mode
 * rapide" choice rides along as a second, clickable line rather than a
 * separate boxed button, so it reads as part of the same beat.
 */
export default function DialogueBubble({
  visible,
  onChoose,
  bottomPercent,
}: {
  visible: boolean;
  onChoose: () => void;
  /** On mobile the video is letterboxed, not full-bleed — this re-anchors the
   * subtitle to the video's own bottom edge instead of the screen's, so it
   * never lands in the black bar below the picture. Null on desktop, where
   * the video is cover-cropped full-bleed and the CSS default already works. */
  bottomPercent?: number | null;
}) {
  return (
    <div
      className="entry-subtitle"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        ...(bottomPercent != null ? { bottom: `${bottomPercent}%` } : null),
      }}
    >
      <p className="entry-subtitle-speaker">Le vigile</p>
      <p className="entry-subtitle-line">Prêt à découvrir la collection ?</p>
      <button type="button" onClick={onChoose} className="entry-subtitle-cta">
        Mode rapide
        <span>voir la collection</span>
      </button>
    </div>
  );
}
