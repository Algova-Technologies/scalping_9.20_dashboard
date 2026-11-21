import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { useProject } from './projects';
import { dbApi, projectTrail } from './shared';
import type { Variant } from './variantForm';
import { projectUrl } from '@/apps';

// Route params → project + its variants. Every manage-variants screen starts here.
export function useVariants() {
  const { id, variantId } = useParams();
  const { project } = useProject(id);
  const query = useQuery({
    queryKey: ['variants', project?.db],
    queryFn: () => dbApi<Variant[]>(project!.db, '/api/varients'),
    enabled: !!project,
  });
  const variant = query.data?.find((v) => String(v.varient_id) === variantId);
  return { project, variantId, variant, ...query };
}

export const variantsUrl = (p: { id: string }) => `${projectUrl(p.id)}/manage-variants`;
export const variantsTrail = (p: { id: string; name: string; database: string }) => [
  ...projectTrail(p),
  { label: 'Manage Variants', to: variantsUrl(p) },
];
export const NOTE = 'Each variant trades in parallel with its own SL/TP (points). Edits and deletes only affect new trades; open trades keep the SL/TP they entered with.';
