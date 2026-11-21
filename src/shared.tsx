import { ArrowLeft, ChevronRight, Eye, Pencil, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { dbShort, isDryrun, useProject } from './projects';
import { api } from './api';
import { projectUrl, scalpingFor } from '@/apps';

// Project-scoped call: dbApi(db, '/api/get_users') → /api/projects/<db>/get_users.
// The project travels in the URL, so there's no server session to connect or lose.
export const dbApi = <T,>(db: string, path: string, init?: RequestInit) =>
  api<T>(`/api/projects/${encodeURIComponent(db)}/${path.replace(/^\/api\//, '')}`, init);

// Every project screen's root: Dashboard › <DB kind · name> (dashboard filtered to it) › project.
export const projectTrail = (p: { id: string; name: string; database: string }, current = false) => [
  { label: scalpingFor(p.database).name, to: scalpingFor(p.database).root },
  { label: `${isDryrun(p.database) ? 'Dry run' : 'Live'} · ${dbShort(p.database)}`, to: `${scalpingFor(p.database).root}?db=${encodeURIComponent(p.database)}` },
  current ? { label: p.name } : { label: p.name, to: `${projectUrl(p.id)}` },
];

// `right` sits on the same line, pushed to the far end (e.g. a LiveReload).
export function Crumbs({ items, right }: { items: { label: string; to?: string }[]; right?: ReactNode }) {
  const nav = (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm ${right ? 'min-w-0' : 'mb-4'}`}>
      {items.map((c, i) => (
        <Fragment key={c.label}>
          {i > 0 && <ChevronRight className="size-4 shrink-0 text-zinc-300" />}
          {c.to ? (
            <Link to={c.to} className="truncate text-zinc-500 hover:text-zinc-900">
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="truncate font-medium text-zinc-900">
              {c.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
  if (!right) return nav;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {nav}
      <div className="ml-auto">{right}</div>
    </div>
  );
}


export const Notice = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">{children}</p>
);
export const card = 'rounded-xl border border-zinc-200 bg-white p-5 shadow-sm';
export const btn = {
  primary:
    'inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400',
  secondary:
    'inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-zinc-500',
  success:
    'inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-400',
  danger:
    'inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:bg-zinc-400',
};

// Card title row: small back button far left, title centred, optional actions far right.
export function CardHeader({ back, title, children }: { back: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <Link to={back} className="inline-flex h-8 items-center gap-1.5 justify-self-start rounded-md border border-zinc-300 bg-transparent px-3 text-sm font-medium text-zinc-400 hover:border-zinc-400 hover:text-zinc-600">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h2 className="text-center text-base font-semibold">{title}</h2>
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}

// List-row actions: solid blue view (optional), orange edit, red delete, white icons, 36px targets.
const act = 'inline-flex size-9 items-center justify-center rounded-md text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1';
// Icon-only action buttons, same colours everywhere: view blue, edit orange, delete red.
export const actionBtn = {
  view: `${act} bg-blue-600 hover:bg-blue-700 focus:ring-blue-300`,
  edit: `${act} bg-orange-500 hover:bg-orange-600 focus:ring-orange-300`,
  delete: `${act} bg-red-600 hover:bg-red-700 focus:ring-red-300`,
};
export function RowActions({ name, view, edit, onDelete }: { name: string; view?: string; edit: string; onDelete?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2">
      {view && (
        <Link to={view} title="View" aria-label={`View ${name}`} className={actionBtn.view}>
          <Eye className="size-4" />
        </Link>
      )}
      <Link to={edit} title="Edit" aria-label={`Edit ${name}`} className={actionBtn.edit}>
        <Pencil className="size-4" />
      </Link>
      {onDelete && (
        <button onClick={onDelete} title="Delete" aria-label={`Delete ${name}`} className={actionBtn.delete}>
          <Trash2 className="size-4" />
        </button>
      )}
    </span>
  );
}

// Delete confirmation. Open while `name` is set. Native <dialog>: backdrop, focus trap, Esc-to-close.
export function ConfirmDelete(props: { noun: string; name: string | null; pending: boolean; error?: Error | null; onConfirm: () => void; onCancel: () => void }) {
  const { noun, name, pending, error, onConfirm, onCancel } = props;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (name) ref.current?.showModal();
    else ref.current?.close();
  }, [name]);
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="del-title"
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl p-6 shadow-xl backdrop:bg-black/40"
    >
      <div className="flex gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert className="size-5" />
        </span>
        <div>
          <h3 id="del-title" className="text-base font-semibold">
            Delete {noun}?
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            <span className="font-medium text-zinc-900">{name}</span> will be permanently deleted. This cannot be undone.
          </p>
        </div>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button autoFocus onClick={onCancel} className={btn.secondary}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={pending} className={btn.danger}>
          <Trash2 className="size-4" /> {pending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </dialog>
  );
}

// On/off switch. Green = on.
export function Toggle({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-zinc-300'}`}
    >
      <span className={`size-4 rounded-full bg-white shadow transition ${on ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// Live-data control: green dot blinks once per refresh, icon turns once per refresh
// (and spins while a fetch is slow). Both replay by re-keying on dataUpdatedAt.
export function LiveReload({ isFetching, dataUpdatedAt, onReload, className = '' }: { isFetching: boolean; dataUpdatedAt: number; onReload: () => void; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span key={dataUpdatedAt} title="Live" className="size-2 animate-blink rounded-full bg-emerald-500" />
      <button
        onClick={onReload}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:border-zinc-400"
      >
        <RefreshCw key={dataUpdatedAt} className={`size-4 ${isFetching ? 'animate-spin' : 'animate-turn'}`} />
        Reload
      </button>
    </div>
  );
}

// Shown while the project list loads, or when the URL names a project that doesn't exist.
export function MissingProject() {
  const { id } = useParams();
  const { isPending, notFound } = useProject(id);
  return <Notice>{notFound || !isPending ? 'Project not found.' : 'Loading…'}</Notice>;
}
