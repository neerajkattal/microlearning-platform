import { categoryPhoto } from "../categoryPhotos";

interface CategoryBackdropProps {
  categoryName: string;
  color: string;
}

// A category-themed backdrop for the quiz-setup and mode-select screens,
// so picking "History" vs "Science" actually feels different instead of
// both landing on the same plain dark page - a real photo (see
// categoryPhotos.ts) instead of an abstract color, dimmed heavily and
// blurred so foreground text stays legible over any photo.
export function CategoryBackdrop({ categoryName, color }: CategoryBackdropProps) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-25 motion-safe:animate-drift"
        style={{
          backgroundImage: `url("${categoryPhoto(categoryName)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(2px) saturate(0.9)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(2,6,23,0.65), rgba(2,6,23,0.92)),
            radial-gradient(46rem 32rem at 12% 0%, ${color}22, transparent 62%)`,
        }}
      />
    </div>
  );
}
