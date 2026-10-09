"use client";

/**
 * Two beats: the guard's line reads low in frame near him as a subtitle (plain
 * text with a text-shadow/outline stack, no box), while the choice it leads to
 * sits mid-screen inside a comic speech bubble — white balloon, thick outline,
 * hard shadow and a tail aimed down-left toward the guard.
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
      <div className="entry-bubble" style={style}>
        <div className={`comic-bubble ${visible ? "comic-bubble-in" : ""}`}>
          <button
            type="button"
            onClick={onChoose}
            className="entry-subtitle-cta comic-bubble-btn comic-bubble-btn-accent"
          >
            Mode rapide
            <span>voir la collection</span>
          </button>
          <div className="comic-bubble-tail" />
        </div>
      </div>
    </>
  );
}
