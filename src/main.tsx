import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, redirect, RouterProvider } from 'react-router';
import { isClientError, LIVE_MS } from './api';
import { apps, scalpingApps, scalpingFor } from './apps';
import Layout from './Layout';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Live data on every page of every project: each query refetches every second (pausing
      // while the tab is hidden, never overlapping its own request), so nothing needs a reload.
      // A 4xx stops it: the server's answer is final, polling it again would only repeat the error.
      refetchInterval: (q) => (isClientError(q.state.error) ? false : LIVE_MS),
      staleTime: LIVE_MS, // reopening a screen refetches at once instead of showing minutes-old data
      refetchOnWindowFocus: false,
      // Retry once, but never a 4xx: the server has given its final answer, so a second
      // identical request only doubles the failed calls behind a mistyped URL.
      retry: (count, error) => count < 1 && !isClientError(error),
    },
  },
});

// /projects/<code>@<db>/rest or /scalping-9-20-multi-variant-paper[/projects/<code>@<db>/rest][?db=<db>] →
// the same screen under the app that owns <db> (the dashboard of the ?db= family when there is no project).
const oldLink = ({ request }: { request: Request }) => {
  const u = new URL(request.url);
  const rest = u.pathname.replace(/^\/scalping-9-20-multi-variant-paper/, '');
  const owner = scalpingFor(decodeURIComponent(rest.match(/^\/projects\/([^/]+)/)?.[1] ?? u.searchParams.get('db') ?? ''));
  return redirect(`${owner.root}${rest}${u.search}`);
};

// Each page is lazy-loaded: its code downloads only when visited. Pages export `Component`.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate replace to={apps[0].root} /> }, // the first app in the header
      // Older addresses of the project screens (/projects/..., /scalping-9-20-multi-variant-paper/...) go to the
      // project's own multi variant app, picked from the database in its id.
      { path: 'projects/*', loader: oldLink, Component: () => null },
      { path: 'scalping-9-20-multi-variant-paper/*', loader: oldLink, Component: () => null },
      ...scalpingApps.map((app) => ({
        path: app.root.slice(1), // every app (apps.ts): /scalping-9-20-no-delta-multi-variant/..., /scalping-9-20-no-delta-paper/..., ...
        children: [
          { index: true, lazy: () => import('./pages/Dashboard') },
          { path: 'projects/:id', lazy: () => import('./pages/Project') },
          { path: 'projects/:id/variants', lazy: () => import('./pages/Variants') },
          { path: 'projects/:id/positions', lazy: () => import('./pages/Positions') },
          { path: 'projects/:id/users', lazy: () => import('./pages/users/List') },
          { path: 'projects/:id/users/new', lazy: () => import('./pages/users/Form') },
          { path: 'projects/:id/users/:userId', lazy: () => import('./pages/users/View') },
          { path: 'projects/:id/users/:userId/edit', lazy: () => import('./pages/users/Form') },
          { path: 'projects/:id/settings', lazy: () => import('./pages/Settings') },
          { path: 'projects/:id/settings/edit', lazy: () => import('./pages/Settings') },
          { path: 'projects/:id/manage-variants', lazy: () => import('./pages/manage-variants/List') },
          { path: 'projects/:id/manage-variants/new', lazy: () => import('./pages/manage-variants/Form') },
          { path: 'projects/:id/manage-variants/:variantId', lazy: () => import('./pages/manage-variants/View') },
          { path: 'projects/:id/manage-variants/:variantId/edit', lazy: () => import('./pages/manage-variants/Form') },
          { path: 'projects/:id/logs/:scope', lazy: () => import('./pages/Logs') },
          { path: 'projects/:id/compare', lazy: () => import('./pages/Compare') },
          ...(app.broker
            ? [
                { path: 'broker', lazy: () => import('./broker/Select') },
                { path: 'broker/:broker/login', lazy: () => import('./broker/Login') },
                { path: 'broker/:broker/results', lazy: () => import('./broker/Results') },
              ]
            : []),
          // Older single-variant screens (/users, /pnl/weekly, /logs/...): their dashboard now lists the project.
          { path: '*', element: <Navigate replace to={app.root} /> },
        ],
      })),
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
