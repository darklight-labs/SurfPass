export const surface = {
  page: "bg-[#f7f6f2] text-zinc-950",
  panel: "border-zinc-200 bg-white",
  panelMuted: "border-zinc-200 bg-zinc-50",
  divider: "border-zinc-200",
  textMuted: "text-zinc-600",
  textSubtle: "text-zinc-500",
} as const

export const operationalStates = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-950",
  cached: "border-zinc-300 bg-zinc-100 text-zinc-900",
  stale: "border-amber-200 bg-amber-50 text-amber-950",
  unavailable: "border-red-200 bg-red-50 text-red-950",
} as const

export const scoreStates = {
  excellent: "border-zinc-950 bg-zinc-950 text-white",
  good: "border-zinc-300 bg-zinc-100 text-zinc-950",
  low: "border-amber-200 bg-amber-50 text-amber-950",
} as const

export const typeStates = {
  visual: "border-sky-200 bg-sky-50 text-sky-950",
  radio: "border-zinc-300 bg-white text-zinc-950",
} as const
