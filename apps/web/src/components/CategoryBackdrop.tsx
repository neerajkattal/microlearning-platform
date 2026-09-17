import { categoryPhoto } from "../categoryPhotos";

interface CategoryBackdropProps {
  categoryName: string;
  color: string;
}

// A category-themed backdrop for the quiz-setup and mode-select screens,
// so picking "History" vs "Science" actually feels different instead of
// both landing on the same plain page - a real photo (see
// categoryPhotos.ts), not an abstract color. Grayscale + high contrast
// instead of a soft blur - a flat, printed-poster treatment rather than
// the blurred/glowing photo wash that doesn't fit this theme's flat,
// hard-edged look. The category's own accent tints it via a multiply
// blend, not a radial gradient glow.
export function CategoryBackdrop({ categoryName, color }: CategoryBackdropProps) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-paper" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `url("${categoryPhoto(categoryName)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) contrast(1.25)",
        }}
      />
      <div className="absolute inset-0" style={{ backgroundColor: color, opacity: 0.1, mixBlendMode: "multiply" }} />
    </div>
  );
}
