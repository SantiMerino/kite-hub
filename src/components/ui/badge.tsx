import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
        // Domain variants (dark: neutral surfaces, no low-contrast blue text)
        loan: "border-blue-200 bg-blue-50 text-blue-800 dark:border-border dark:bg-muted dark:text-foreground",
        inventory:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-border dark:bg-muted dark:text-foreground",
        alert:
          "border-purple-200 bg-purple-50 text-purple-800 dark:border-border dark:bg-muted dark:text-foreground",
        admin:
          "border-violet-200 bg-violet-50 text-violet-800 dark:border-border dark:bg-muted dark:text-foreground",
        overdue:
          "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100",
        returned:
          "border-green-200 bg-green-50 text-green-800 dark:border-border dark:bg-muted dark:text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
