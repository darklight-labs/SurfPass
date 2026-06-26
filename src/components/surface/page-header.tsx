import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "grid gap-5 border-b border-zinc-200 pb-6 md:grid-cols-[1fr_auto] md:items-end",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-4xl text-4xl font-semibold leading-none text-zinc-950 md:text-6xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-4">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
