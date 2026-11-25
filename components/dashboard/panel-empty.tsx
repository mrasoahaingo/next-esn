import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

/**
 * État vide d'un panneau (DESIGN.md § Révision v2) : une icône 20 px dans un
 * disque `bg-muted`, un titre, une phrase, et toujours une action. Tient en
 * 160 px. Un seul helper pour tous les panneaux du tableau de bord et de `/cvs`.
 */
export function PanelEmpty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Un lien (`{ label, href }`) ou un contrôle déjà construit (zone de dépôt, bouton). */
  action: { label: string; href: string } | ReactNode;
  className?: string;
}): React.JSX.Element {
  const isLink = action != null && typeof action === 'object' && 'href' in action && 'label' in action;
  return (
    <Empty className={cn('gap-3 px-4 py-8', className)}>
      <EmptyHeader className="gap-1">
        <EmptyMedia variant="icon" className="mb-1 size-10 rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-sm font-semibold text-foreground">{title}</EmptyTitle>
        <EmptyDescription className="text-xs">{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {isLink ? (
          <Link href={action.href} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {action.label}
          </Link>
        ) : (
          action
        )}
      </EmptyContent>
    </Empty>
  );
}
