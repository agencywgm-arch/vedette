"use client";

/**
 * Two separate beats, not one paragraph: the guard's line reads low in frame
 * near him, like a game's character subtitle, while the choice it's building
 * to sits on its own in the middle of the screen, like a game's prompt —
 * distinct enough that no one mistakes the second for a continuation of the
 * first. Both are plain text with a text-shadow/outline stack for
 * readability, not a speech-bubble box.
 */
export default function DialogueBubble({
  visible,
  onChoose,
  bottomPercent,
}: {
  visible: boolean;
  onChoose: () => void;
  /** On mobile the video is letterboxed, not full-bleed — this re-anchors the
   * line to the video's own bottom edge instead of the screen's, so it stays
   * near the guard rather than landing in the black bar below the picture.
   * Null on desktop, where the video is cover-cropped full-bleed and the CSS
   * default already works. */
  bottomPercent?: number | null;
}) {
  const style = {
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? ("auto" as const) : ("none" as const),
  };
  return (
    <>
      <div
        className="entry-line"
        style={{
          ...style,
          ...(bottomPercent != null ? { bottom: `${bottomPercent}%` } : null),
        }}
      >
        <p className="entry-subtitle-speaker">Le vigile</p>
        <p className="entry-subtitle-line">Prêt à découvrir la collection ?</p>
      </div>
      <button type="button" onClick={onChoose} className="entry-subtitle-cta" style={style}>
        Mode rapide
        <span>voir la collection</span>
      </button>
    </>
  );
}
