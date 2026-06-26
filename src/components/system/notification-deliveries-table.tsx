import { Bell } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/feedback/empty-state"
import { cn } from "@/lib/utils"
import type { NotificationDeliveryEvidence } from "@/lib/system/queries"

type NotificationDeliveriesTableProps = {
  deliveries: NotificationDeliveryEvidence[]
}

const statusClass: Record<NotificationDeliveryEvidence["status"], string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-900",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-red-200 bg-red-50 text-red-800",
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not sent"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

function truncateProviderId(value?: string | null) {
  if (!value) {
    return "None"
  }

  if (value.length <= 14) {
    return value
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

export function NotificationDeliveriesTable({
  deliveries,
}: NotificationDeliveriesTableProps) {
  if (deliveries.length === 0) {
    return (
      <EmptyState
        title="No notification deliveries yet"
        description="Send a manual test alert or wait for cron to deliver an eligible cached pass alert."
        icon={<Bell className="size-5" />}
      />
    )
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Satellite</TableHead>
            <TableHead>Pass start</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Provider id</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="font-medium text-zinc-950">
                {delivery.satelliteName}
              </TableCell>
              <TableCell>{formatDateTime(delivery.passStartUtc)}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 rounded-md border px-2 text-xs font-semibold uppercase",
                    statusClass[delivery.status]
                  )}
                >
                  {delivery.status}
                </Badge>
              </TableCell>
              <TableCell>
                {delivery.channel} / {delivery.leadMinutes} min
              </TableCell>
              <TableCell>{formatDateTime(delivery.sentAt)}</TableCell>
              <TableCell className="font-mono text-xs">
                {truncateProviderId(delivery.providerMessageId)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
