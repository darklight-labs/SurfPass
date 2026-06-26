import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SectionBlockProps = {
  label?: string
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function SectionBlock({
  label,
  title,
  description,
  action,
  children,
  className,
}: SectionBlockProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(label || title || description || action) ? (
        <div className="grid gap-3 border-b border-zinc-200 pb-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            {label ? (
              <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                {label}
              </p>
            ) : null}
            {title ? (
              <h2 className="text-xl font-semibold leading-tight text-zinc-950">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
