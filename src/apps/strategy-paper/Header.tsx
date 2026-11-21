import { Settings, UserCog } from 'lucide-react';
import { Link } from 'react-router';
import { useApp } from './api';

const iconBtn =
  'inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900';

// With Delta (paper or live) controls on the right of the app header: Users / Settings.
export default function Header() {
  const app = useApp();
  const { root: ROOT } = app;
  return (
    <div className="ml-auto flex items-center justify-end gap-2">
      <Link to={`${ROOT}/users`} title="Users" aria-label="Users" className={iconBtn}>
        <UserCog className="size-4" />
      </Link>
      <Link to={`${ROOT}/settings`} title="Settings" aria-label="Settings" className={iconBtn}>
        <Settings className="size-4" />
      </Link>
    </div>
  );
}
