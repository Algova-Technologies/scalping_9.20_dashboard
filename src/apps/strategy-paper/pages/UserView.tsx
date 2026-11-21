import { Pencil, UserRound } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { btn, card, Crumbs, Notice } from '@/shared';
import { isMaster, trail, useApp, useScope } from '../api';

// Read-only user details in three groups: switches, person, broker (secrets shown only as set / not set).
export function Component() {
  const app = useApp();
  const { root: ROOT } = app;
  const { userId } = useParams();
  const { users, usersQuery, qs } = useScope();
  const u = users.find((x) => String(x.user_id) === userId);
  const crumbs = <Crumbs items={[...trail(app, qs()), { label: 'Users', to: `${ROOT}/users` }, { label: u?.full_name ?? 'User' }]} />;
  if (usersQuery.isPending) return <>{crumbs}<Notice>Loading user details…</Notice></>;
  if (usersQuery.error) return <>{crumbs}<Notice>{usersQuery.error.message}</Notice></>;
  if (!u) return <>{crumbs}<Notice>User not found.</Notice></>;
  const onOff = (n: number) => <span className={n ? 'text-emerald-600' : 'text-red-600'}>{n ? 'On' : 'Off'}</span>;
  const secret = u.has_credentials ? '••••••••' : 'Not set';
  const groups: [string, ReactNode][][] = [
    [
      ['Account Status', onOff(u.account_status)],
      ...(isMaster(u) ? [] : [[`${app.word} Trade Status`, onOff(u.trade_status)] as [string, ReactNode]]),
      ['Broker Connection Status', onOff(u.broker_connection_status)],
    ],
    [
      ['User ID', u.user_id], ['First Name', u.first_name], ['Last Name', u.last_name], ['Email', u.email],
      ['Mobile', u.mobile], [`${app.word} Trade Role`, isMaster(u) ? 'Master' : 'User'], ['Buying Power', u.buying_power || '—'],
    ],
    [['Broker', u.broker_name], ['Client ID', u.client_id || '—'], ['Password', secret], ['API Key', secret], ['TOTP Token', secret]],
  ];
  return (
    <>
      {crumbs}
      <section className={card}>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-lg font-semibold"><UserRound className="size-5" /> View User</h1>
          <Link to={`${ROOT}/users/${u.user_id}/edit`} className={`${btn.secondary} ml-auto`}><Pencil className="size-4" /> Edit</Link>
        </div>
        {groups.map((items, i) => (
          <Fragment key={i}>
            {i > 0 && <hr className="my-5 border-zinc-200" />}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-4 2xl:grid-cols-7">
              {items.map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="mt-1 text-xs text-zinc-500">{label}</dt>
                  <dd className="text-sm font-medium break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </Fragment>
        ))}
      </section>
    </>
  );
}
