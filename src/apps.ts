// Dashboard apps, switched from the header. Each owns every route under its root.
// kind = whose code renders it:
//   scalping       src/pages (project dashboards), per engine family   backend: backend/api.py
//   no-delta       src/apps/strategy-ui, per database        backend: backend/apps/strategy_ui (/api/strategy-ui/db/<db>/...)
//   with-delta     src/apps/strategy-paper, per instance     backend: backend/apps/strategy_paper (`api` prefix)
// Add one of an existing kind: an entry here (its routes come from the kind's routes(app) in main.tsx).

// Multi variant apps (the project dashboards: src/pages, src/*.ts). One per engine family: each shows the
// databases whose name contains its `family` (live + dry run), and owns those projects' screens.
export type ScalpingApp = { id: string; kind: 'scalping'; label: string; root: string; name: string; family: string };
export type NoDeltaApp = { id: string; kind: 'no-delta'; label: string; root: string; name: string; db: string };
export type WithDeltaApp = {
  id: string; kind: 'with-delta'; label: string; root: string; name: string; db: string;
  api: string; // backend prefix: the With Delta backend has one router per database
  mode: 'paper' | 'live'; // which engine columns the backend uses (paper_trade_* / live_trade_*)
  word: 'Paper' | 'Live'; // how screens name that mode ("Live Trade Status")
};
export type App = ScalpingApp | NoDeltaApp | WithDeltaApp;

export const noDeltaPaper: NoDeltaApp = {
  id: 'no-delta-paper', kind: 'no-delta', label: 'No Delta Paper', root: '/scalping-9-20-no-delta-paper',
  name: 'Scalping 9.20 No Delta Paper', db: 'scalping_9.20_no_delta_paper',
};
export const noDeltaLive: NoDeltaApp = {
  id: 'no-delta-live', kind: 'no-delta', label: 'No Delta Live', root: '/scalping-9-20-no-delta-live',
  name: 'Scalping 9.20 No Delta Live', db: 'scalping_9.20_no_delta_live',
};
export const withDeltaPaper: WithDeltaApp = {
  id: 'with-delta-paper', kind: 'with-delta', label: 'With Delta Paper', root: '/scalping-9-20-with-delta-paper',
  name: 'Scalping 9.20 With Delta Paper', db: 'scalping_9.20_with_delta_paper', api: '/api/strategy-paper', mode: 'paper', word: 'Paper',
};
export const withDeltaLive: WithDeltaApp = {
  id: 'with-delta-live', kind: 'with-delta', label: 'With Delta Live', root: '/scalping-9-20-with-delta-live',
  name: 'Scalping 9.20 With Delta Live', db: 'scalping_9.20_with_delta_live', api: '/api/strategy-live', mode: 'live', word: 'Live',
};
export const noDeltaMulti: ScalpingApp = {
  id: 'no-delta-multi-variant', kind: 'scalping', label: 'No Delta Multi Variant', root: '/scalping-9-20-no-delta-multi-variant',
  name: 'Scalping 9.20 No Delta Multi Variant', family: 'no_delta_multi_variant',
};
export const withDeltaMulti: ScalpingApp = {
  id: 'with-delta-multi-variant', kind: 'scalping', label: 'With Delta Multi Variant', root: '/scalping-9-20-with-delta-multi-variant',
  name: 'Scalping 9.20 With Delta Multi Variant', family: 'with_delta_multi_variant',
};
export const scalpingApps = [noDeltaMulti, withDeltaMulti];

// Listed in header order: the multi variant apps, then each paper app next to its live one.
export const apps: App[] = [noDeltaMulti, withDeltaMulti, noDeltaPaper, noDeltaLive, withDeltaPaper, withDeltaLive];

/** The app a pathname belongs to: the one whose root it is under, else the first (the default: '/' redirects to it). */
export const appOf = (pathname: string): App =>
  apps.find((a) => pathname === a.root || pathname.startsWith(`${a.root}/`)) ?? noDeltaMulti;

/** The multi variant app that owns a database, or a project id (<code>@<database>): its family is in the name. */
export const scalpingFor = (databaseOrId: string): ScalpingApp =>
  scalpingApps.find((a) => databaseOrId.includes(a.family)) ?? noDeltaMulti;
/** A project's home under its own app: /scalping-9-20-with-delta-multi-variant/projects/<code>@<database>. */
export const projectUrl = (id: string) => `${scalpingFor(id).root}/projects/${id}`;
