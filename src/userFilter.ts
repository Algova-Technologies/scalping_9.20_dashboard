import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api, isNotFound } from './api';
import { pickUser } from './userForm';

// Header user filter, per project (user ids only mean something inside one project DB).
// Default is the project's admin. A change is kept for this browser session (sessionStorage)
// and applies on every page until the next change; a new session starts from admin again.
const KEY = 'algova.userFilter';
let state: Record<string, number> = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
})();
const listeners = new Set<() => void>();

export function setUserFilter(project: string, user: number) {
  state = { ...state, [project]: user };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: keep it in memory for this tab */
  }
  listeners.forEach((l) => l());
}

type Person = { user_id: number; role: string; first_name: string; full_name: string };

// ready=false until the project's users have loaded, so screens never flash all-users numbers first.
// Shares the ['users', db] cache with the Manage Users screens.
// This is the first request a project page makes, so a 404 here is the earliest proof the
// project doesn't exist; `notFound` lets the dependent queries stay unsent rather than each
// discovering the same 404 for itself.
export function useUserFilter(project: string | undefined) {
  const stored = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => (project ? state[project] : undefined),
  );
  const users = useQuery({
    queryKey: ['users', project],
    queryFn: () => api<Person[]>(`/api/projects/${encodeURIComponent(project!)}/get_users`),
    enabled: !!project,
  });
  const ready = !project || users.isSuccess || users.isError; // on other errors, fall back to every user
  return {
    user: users.data ? pickUser(stored, users.data) : undefined,
    ready,
    users: users.data ?? [],
    notFound: isNotFound(users.error),
  };
}

// Query-string suffix for project endpoints: '' or '?user=3'.
export const userQs = (user: number | undefined) => (user === undefined ? '' : `?user=${user}`);
