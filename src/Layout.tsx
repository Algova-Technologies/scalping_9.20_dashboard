import { useQuery } from '@tanstack/react-query';
import { Activity, Building2 } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router';
import { api } from './api';
import { appOf, apps } from './apps';
import Clock from './Clock';
import ProjectHeader from './ProjectHeader';
import ThemeToggle from './ThemeToggle';
import { useProject } from './projects';

type Health = { status: string; version: string };


export default function Layout() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api<Health>('/api/health'),
  });

  const match = useMatch('/:app/projects/:id/*') // a multi variant app's project screens;
  const { project } = useProject(match?.params.id);
  const app = appOf(useLocation().pathname);
  const navigate = useNavigate();

  const status = isPending ? 'Checking…' : isError ? 'Offline' : `Online · v${data.version}`;
  const dot = isPending ? 'bg-zinc-300' : isError ? 'bg-red-500' : 'bg-emerald-500';

  return (
    <div className="flex min-h-screen flex-col">
      {/* 1800px+: one line, three columns: left | clock | right (six apps + project controls need that width). Equal 1fr sides keep the clock centred;
          if the controls need more room their column grows (clock nudges left) rather than overlapping.
          Smaller screens: everything wraps in a row. */}
      <header className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-200 bg-white px-4 py-2 sm:px-6 min-[1800px]:grid min-[1800px]:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <Activity className="size-5" /> Algova
        </div>
        <nav className="flex gap-1 text-sm">
          <NavLink
            to={app.root}
            end
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 ${isActive ? 'bg-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-900'}`
            }
          >
            Dashboard
          </NavLink>
        </nav>
        {/* Project switcher: each app owns the routes under its root (apps.ts). */}
        {/* Six apps: they wrap onto more lines rather than run off a narrow screen. */}
        <div role="radiogroup" aria-label="Project" className="flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 sm:gap-1 sm:p-1">
          {apps.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={a.id === app.id}
              onClick={() => navigate(a.root)}
              className={`h-7 rounded-md px-2 text-xs whitespace-nowrap transition sm:px-3 sm:text-sm ${
                a.id === app.id ? 'bg-white font-medium text-zinc-900 shadow-xs ring-1 ring-zinc-200' : 'text-zinc-600 hover:bg-white hover:text-zinc-900'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        </div>
        <Clock />
        <div className="ml-auto flex items-center justify-end gap-2">
          {project && <ProjectHeader p={project} />}
          {app.broker && (
            <Link
              to={`${app.root}/broker`}
              title="Broker portal"
              aria-label="Broker portal"
              className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
            >
              <Building2 className="size-4" />
            </Link>
          )}
          <ThemeToggle />
        </div>
      </header>
      {/* flex column so a page can claim the leftover height with flex-1 (project home fits one screen) */}
      <main className="flex flex-1 flex-col bg-zinc-50 p-6">
        <Outlet />
      </main>
      <footer className="flex h-10 bg-white items-center gap-2 border-t border-zinc-200 px-6 text-xs text-zinc-500">
        <span className={`size-2 rounded-full ${dot}`} /> {status}
      </footer>
    </div>
  );
}
