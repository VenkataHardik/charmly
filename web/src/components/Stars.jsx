// Deterministic star field (same on server and client).
export default function Stars({ count = 46 }) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: count }, () => ({
    left: `${rand() * 100}%`,
    top: `${rand() * 70}%`,
    size: 1 + rand() * 2.2,
    delay: `${-rand() * 4}s`,
  }));
  return (
    <div className="stars" aria-hidden="true">
      {stars.map((s, i) => (
        <i key={i} style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }} />
      ))}
    </div>
  );
}
