import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Kept solid: strong-signal badges (e.g. status) need clear contrast,
        // not softened glass.
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        // Glassmorphism: partial transparency + backdrop blur + subtle bright border
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:[backdrop-filter:blur(12px)] dark:hover:bg-white/[0.14]',
        outline:
          'text-foreground dark:border-white/20 dark:bg-white/[0.05] dark:text-white dark:[backdrop-filter:blur(12px)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };