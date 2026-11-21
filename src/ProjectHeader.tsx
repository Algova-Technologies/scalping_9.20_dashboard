import { GitCompareArrows, Layers, ScrollText, Settings, UserCog } from 'lucide-react';
import { Link, useMatch } from 'react-router';
import { setUserFilter, useUserFilter } from './userFilter';
import type { Project } from './projects';
import { projectUrl } from '@/apps';


const select =
  'h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700 hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200';
const iconBtn =
  'inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900';

// Project controls, rendered on the right of the app header (Layout) on /projects/:id.
export default function ProjectHeader({ p }: { p: Project }) {
  const onLogs = !!useMatch('/:app/projects/:id/logs/*');
  const { user, users } = useUserFilter(p.id);
  return (
    <>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 xl:flex-nowrap">
        <Link to={`${projectUrl(p.id)}/positions`} className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium whitespace-nowrap text-zinc-700 hover:border-zinc-500">
          Open positions
          <span
            className={`rounded px-1.5 text-xs font-semibold tabular-nums ${
              p.open_positions ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-400'
            }`}
          >
            {p.open_positions}
          </span>
        </Link>

        <Link to={`${projectUrl(p.id)}/logs/live`} className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium ${onLogs ? 'border-zinc-500 bg-zinc-100 text-zinc-900' : 'border-zinc-300 text-zinc-700 hover:border-zinc-500'}`}>
          <ScrollText className="size-4" /> Logs
        </Link>

        {/* One user is always selected: admin by default, this session's pick after a change.
            Filters every performance number and positions in this project. */}
        <select
          aria-label="User"
          value={user ?? ''}
          disabled={!users.length}
          onChange={(e) => setUserFilter(p.id, Number(e.target.value))}
          className={select}
        >
          {!users.length && <option value="">No users</option>}
          {users.map((u) => (
            <option key={u.user_id} value={u.user_id} title={u.full_name}>
              {u.first_name}
            </option>
          ))}
        </select>

        <Link to={`${projectUrl(p.id)}/users`} title="Manage users" aria-label="Manage users" className={iconBtn}>
          <UserCog className="size-4" />
        </Link>
        <Link to={`${projectUrl(p.id)}/settings`} title="Settings" aria-label="Settings" className={iconBtn}>
          <Settings className="size-4" />
        </Link>
        <Link to={`${projectUrl(p.id)}/compare`} title="Compare variants" aria-label="Compare variants" className={iconBtn}>
          <GitCompareArrows className="size-4" />
        </Link>
        <Link to={`${projectUrl(p.id)}/manage-variants`} title="Manage variants" aria-label="Manage variants" className={iconBtn}>
          <Layers className="size-4" />
        </Link>
      </div>
    </>
  );
}
