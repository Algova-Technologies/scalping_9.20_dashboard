import { Outlet, type RouteObject } from 'react-router';
import type { WithDeltaApp } from '@/apps';
import { AppProvider } from './api';

// Every screen of one With Delta app (paper or live), under its root, mounted under the app Layout by main.tsx.
// Pages export `Component`, load lazily and read the app from context (useApp).
export const routes = (app: WithDeltaApp): RouteObject[] => [
  {
    path: app.root.slice(1),
    element: <AppProvider value={app}><Outlet /></AppProvider>,
    children: [
      { index: true, lazy: () => import('./pages/Dashboard') },
      { path: 'logs/:category', lazy: () => import('./pages/Logs') },
      { path: 'pnl/weekly', lazy: () => import('./pages/WeeklyPnL') },
      { path: 'pnl/daily', lazy: () => import('./pages/DailyPnL') },
      { path: 'pnl/trades', lazy: () => import('./pages/Trades') },
      { path: 'pnl/open-positions', lazy: () => import('./pages/OpenPositions') },
      { path: 'users', lazy: () => import('./pages/Users') },
      { path: 'users/new', lazy: () => import('./pages/UserForm') },
      { path: 'users/:userId', lazy: () => import('./pages/UserView') },
      { path: 'users/:userId/edit', lazy: () => import('./pages/UserForm') },
      { path: 'settings', lazy: () => import('./pages/Settings') },
    ],
  },
];
