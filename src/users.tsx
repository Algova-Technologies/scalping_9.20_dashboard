import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { useProject } from './projects';
import { dbApi, projectTrail } from './shared';
import { brokers } from './userForm';
import { projectUrl } from '@/apps';

export * from './shared';
export * from './userForm';

export type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  mobile: string;
  role: string;
  broker: string;
  client_id: string;
  password: string;
  api_key: string;
  qr_totp_token: string;
  buying_power: string | null;
  is_active: number;
  account_status: number;
  trade_status: number;
};
export type Status = 'is_active' | 'account_status' | 'trade_status';

// Route params → project + its users list. Every users screen starts here.
export function useUsers() {
  const { id, userId } = useParams();
  const { project } = useProject(id);
  const query = useQuery({
    queryKey: ['users', project?.db],
    queryFn: () => dbApi<User[]>(project!.db, '/api/get_users'),
    enabled: !!project,
  });
  const user = query.data?.find((u) => String(u.user_id) === userId);
  return { project, userId, user, ...query };
}

export const brokerLabel = (b: string) => brokers.find((x) => x.value === b.toLowerCase())?.label ?? b;
export const isAdmin = (u: Pick<User, 'role'>) => u.role.toLowerCase() === 'admin';

// Breadcrumb trail every users screen starts with.
export const usersTrail = (p: { id: string; name: string; database: string }) => [
  ...projectTrail(p),
  { label: 'Users', to: `${projectUrl(p.id)}/users` },
];

