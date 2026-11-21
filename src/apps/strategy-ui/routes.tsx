import { Outlet, type RouteObject } from 'react-router';
import type { NoDeltaApp } from '@/apps';
import { AppProvider } from './api';

// Every screen of one No Delta app, under its root, mounted under the app Layout by main.tsx.
// Pages export `Component`, load lazily and read the app from context (useApp).
export const routes = (app: NoDeltaApp): RouteObject[] => [
  {
    path: app.root.slice(1),
    element: <AppProvider value={app}><Outlet /></AppProvider>,
    children: [
      { index: true, lazy: () => import('./pages/Dashboard') },
      { path: 'logs/:type', lazy: () => import('./pages/Logs') },
      { path: 'pnl/weekly', lazy: () => import('./pages/WeeklyPnL') },
      { path: 'pnl/daily', lazy: () => import('./pages/DailyPnL') },
      { path: 'pnl/trades', lazy: () => import('./pages/Trades') },
      { path: 'users', lazy: () => import('./pages/Users') },
      { path: 'settings', lazy: () => import('./pages/Settings') },
      { path: 'broker', lazy: () => import('./pages/broker/Select') },
      { path: 'broker/:broker/login', lazy: () => import('./pages/broker/Login') },
      { path: 'broker/:broker/results', lazy: () => import('./pages/broker/Results') },
    ],
  },
];
