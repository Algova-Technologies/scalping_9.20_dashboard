import { useEffect, useState } from 'react';

// Pune is on IST. Pinned to Asia/Kolkata so it shows Pune time even if the machine's zone is wrong.
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
}).format;

// Own component so only this text re-renders each second. Each tick is scheduled for the
// start of the next real second, so the display flips with the wall clock instead of drifting.
export default function Clock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      t = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    t = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(t);
  }, []);
  return (
    <time
      dateTime={now.toISOString()}
      title="Pune (IST)"
      className={`text-xl font-bold tracking-tight whitespace-nowrap text-zinc-900 tabular-nums ${className}`}
    >
      {fmt(now)
        .split(':')
        .flatMap((part, i) => (i ? [<span key={i} className="mx-1">:</span>, part] : [part]))}
    </time>
  );
}
