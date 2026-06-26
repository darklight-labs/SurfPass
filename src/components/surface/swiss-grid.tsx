import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type SwissGridProps = ComponentProps<"div"> & {
  columns?: "one" | "two" | "three" | "dashboard"
}

const columnsClass: Record<NonNullable<SwissGridProps["columns"]>, string> = {
  one: "grid-cols-1",
  two: "grid-cols-1 lg:grid-cols-2",
  three: "grid-cols-1 md:grid-cols-3",
  dashboard: "grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]",
}

export function SwissGrid({
  columns = "two",
  className,
  ...props
}: SwissGridProps) {
  return (
    <div
      className={cn("grid gap-4 md:gap-5", columnsClass[columns], className)}
      {...props}
    />
  )
}
