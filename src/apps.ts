// Dashboard apps, switched from the header: one per Go project. All six render the same project screens
// (src/pages) from the same backend (/api/projects/{code@db}/..., backend api.py). Multi-variant projects
// trade several variants; a single-variant engine's database is one project (`default@<db>`) with one
// fixed variant (its SL/TP), so its screens hide variant management (Project.single).
//
// engine: the backend's app key (GET /api/databases?app=<engine>) — which databases the dashboard lists.
// db:     the Go project's database (its .env DB_NAME; the backend .env names the same one). Its dry-run copy
//         is <db>_dryrun. Used to find a project's app from its id, for links.
export type ScalpingApp = {
  id: string;
  label: string;
  root: string;
  name: string;
  engine: string;
  db: string;
  broker?: true; // the No Delta engines' broker portal (/broker) is offered in the header
};
export type App = ScalpingApp;

const app = (id: string, label: string, engine: string, db: string, extra: Partial<ScalpingApp> = {}): ScalpingApp => ({
  id, label, root: `/scalping-9-20-${id}`, name: `Scalping 9.20 ${label}`, engine, db, ...extra,
});

export const noDeltaMulti = app('no-delta-multi-variant', 'No Delta Multi Variant', 'multi_variant_no_delta', 'scalping_9.20_multi_variant_no_delta_paper');
export const withDeltaMulti = app('with-delta-multi-variant', 'With Delta Multi Variant', 'multi_variant_with_delta', 'scalping_9.20_multi_variant_with_delta_paper');
export const noDeltaPaper = app('no-delta-paper', 'No Delta Paper', 'no_delta_paper', 'scalping_9.20_no_delta_paper', { broker: true });
export const noDeltaLive = app('no-delta-live', 'No Delta Live', 'no_delta_live', 'scalping_9.20_no_delta_live', { broker: true });
export const withDeltaPaper = app('with-delta-paper', 'With Delta Paper', 'with_delta_paper', 'scalping_9.20_with_delta_paper');
export const withDeltaLive = app('with-delta-live', 'With Delta Live', 'with_delta_live', 'scalping_9.20_with_delta_live');

// Listed in header order: the multi variant apps, then each paper app next to its live one.
export const apps: App[] = [noDeltaMulti, withDeltaMulti, noDeltaPaper, noDeltaLive, withDeltaPaper, withDeltaLive];
export const scalpingApps = apps;

/** The app a pathname belongs to: the one whose root it is under, else the first (the default: '/' redirects to it). */
export const appOf = (pathname: string): App =>
  apps.find((a) => pathname === a.root || pathname.startsWith(`${a.root}/`)) ?? noDeltaMulti;

/** The app that owns a database, or a project id (<code>@<database>): <db> or its <db>_dryrun copy. */
export const scalpingFor = (databaseOrId: string): ScalpingApp => {
  const db = databaseOrId.slice(databaseOrId.indexOf('@') + 1).replace(/_dryrun$/, '');
  return apps.find((a) => a.db === db) ?? noDeltaMulti;
};
/** A project's home under its own app: /scalping-9-20-no-delta-paper/projects/default@scalping_9.20_no_delta_paper. */
export const projectUrl = (id: string) => `${scalpingFor(id).root}/projects/${id}`;
