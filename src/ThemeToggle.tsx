import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

// index.html applies the saved theme before first paint; this only flips and saves it.
export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.theme = next ? 'dark' : 'light';
    } catch {}
    setDark(next);
  };
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
