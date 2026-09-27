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
}: {
  visible: boolean;
  onChoose: () => void;
}) {
  return (
    <div
      className="entry-subtitle"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
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
