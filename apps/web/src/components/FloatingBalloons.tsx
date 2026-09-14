// Purely decorative, ambient motion behind the landing page hero - not
// the real Balloon Pop game (that's Phaser-rendered and needs a live
// quiz session). Plain CSS circles drifting upward, in the same palette
// as the real game's balloons, so it reads as "this app has balloon
// games" at a glance rather than as generic floating shapes.
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

interface Balloon {
  left: string;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

const BALLOONS: Balloon[] = Array.from({ length: 9 }, (_, i) => ({
  left: `${(i * 97 + 13) % 100}%`,
  size: 22 + ((i * 37) % 26),
  color: COLORS[i % COLORS.length],
  duration: 14 + ((i * 11) % 10),
  delay: -((i * 7) % 18),
}));

export function FloatingBalloons() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {BALLOONS.map((balloon, i) => (
        <span
          key={i}
          className="absolute bottom-[-80px] rounded-full opacity-20 motion-safe:animate-float-up"
          style={{
            left: balloon.left,
            width: balloon.size,
            height: balloon.size * 1.2,
            backgroundColor: balloon.color,
            animationDuration: `${balloon.duration}s`,
            animationDelay: `${balloon.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
