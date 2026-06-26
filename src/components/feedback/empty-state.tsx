import type { ReactNode } from "react"
import { Satellite } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <Empty
      className={cn(
        "items-start rounded-md border border-dashed border-zinc-300 bg-white p-8 text-left",
        className
      )}
    >
      <EmptyHeader className="items-start text-left">
        <EmptyMedia
          variant="icon"
          className="rounded-md bg-zinc-100 text-zinc-700"
        >
          {icon ?? <Satellite className="size-5" />}
        </EmptyMedia>
        <EmptyTitle className="text-base font-semibold tracking-normal text-zinc-950">
          {title}
        </EmptyTitle>
        <EmptyDescription className="text-sm leading-6 text-zinc-600">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent className="items-start">{action}</EmptyContent>
      ) : null}
    </Empty>
  )
}
