import { formatDuration, formatElevation, formatMagnitude } from "@/lib/utils/formatting"
import type {
  AlertDigestEmailPayload,
  AlertDigestPass,
  AlertEmailPayload,
} from "@/lib/alerts/types"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function titleCasePassType(value: AlertEmailPayload["passType"]) {
  return value === "visual" ? "Visual" : "Radio"
}

function detailRows(payload: AlertEmailPayload | AlertDigestPass) {
  const rows: Array<[string, string]> = [
    ["Start", payload.localStart],
    ["Best moment", payload.localMax],
    ["End", payload.localEnd],
    [
      "Max elevation",
      payload.maxElevation === undefined
        ? "Unknown"
        : formatElevation(payload.maxElevation),
    ],
    ["Direction", payload.directionSummary ?? "Direction unavailable"],
    [
      "Duration",
      payload.durationSeconds === undefined
        ? "Unknown"
        : formatDuration(payload.durationSeconds),
    ],
    ["Score", payload.score ?? "Unknown"],
    ["RSVP", payload.rsvpSummary],
  ]

  if (payload.magnitude !== undefined && payload.magnitude !== null) {
    rows.splice(7, 0, ["Magnitude", formatMagnitude(payload.magnitude) ?? "Unknown"])
  }

  return rows
}

export function buildAlertEmailSubject(
  payload: AlertEmailPayload,
  leadMinutes: number
) {
  return `${payload.satelliteName} ${payload.passType} pass in ${leadMinutes} minutes`
}

export function buildAlertDigestEmailSubject(payload: AlertDigestEmailPayload) {
  if (payload.passes.length === 1) {
    const pass = payload.passes[0]
    return `${pass.satelliteName} ${pass.passType} pass in ${payload.leadMinutes} minutes`
  }

  return `${payload.passes.length} SurfPass windows in ${payload.leadMinutes} minutes`
}

export function buildAlertEmailHtml(
  payload: AlertEmailPayload,
  leadMinutes: number
) {
  const heading = `${payload.satelliteName} ${payload.passType} pass in ${leadMinutes} minutes`
  const rows = [
    ["Group", payload.groupName] as [string, string],
    ...detailRows(payload),
  ]
    .map(
      ([label, value]) => `
        <tr>
          <th style="border-bottom:1px solid #e4e4e7;color:#52525b;font-size:12px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;width:150px;">${escapeHtml(label)}</th>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("")

  return `<!doctype html>
<html>
  <body style="background:#f7f6f2;color:#18181b;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
    <main style="margin:0 auto;max-width:640px;padding:32px 20px;">
      <p style="font-size:20px;font-weight:700;letter-spacing:0;margin:0 0 28px;">SurfPass</p>
      <section style="background:#ffffff;border:1px solid #d4d4d8;padding:24px;">
        <p style="color:#71717a;font-size:12px;font-weight:700;letter-spacing:.08em;margin:0 0 12px;text-transform:uppercase;">Pass alert</p>
        <h1 style="font-size:28px;line-height:1.05;margin:0 0 12px;">${escapeHtml(heading)}</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">${escapeHtml(titleCasePassType(payload.passType))} pass for ${escapeHtml(payload.groupName)}.</p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-top:1px solid #e4e4e7;width:100%;">
          ${rows}
        </table>
        <p style="margin:24px 0 0;">
          <a href="${escapeHtml(payload.appUrl)}" style="background:#18181b;color:#ffffff;display:inline-block;font-size:14px;font-weight:700;padding:11px 14px;text-decoration:none;">Open SurfPass</a>
        </p>
      </section>
      <p style="color:#71717a;font-size:12px;line-height:1.6;margin:16px 0 0;">You are receiving this because alerts are enabled for this group. SMS and WhatsApp are out of scope for the MVP.</p>
    </main>
  </body>
</html>`
}

export function buildAlertEmailText(
  payload: AlertEmailPayload,
  leadMinutes: number
) {
  const heading = `${payload.satelliteName} ${payload.passType} pass in ${leadMinutes} minutes`
  const rows = [["Group", payload.groupName] as [string, string], ...detailRows(payload)]
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n")

  return `SurfPass

${heading}

${rows}

Open SurfPass: ${payload.appUrl}

You are receiving this because alerts are enabled for this group.`
}

function digestPassRows(payload: AlertDigestEmailPayload) {
  return payload.passes
    .map((pass) => {
      const duration =
        pass.durationSeconds === undefined
          ? "Unknown"
          : formatDuration(pass.durationSeconds)
      const elevation =
        pass.maxElevation === undefined
          ? "Unknown"
          : formatElevation(pass.maxElevation)

      return `
        <tr>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:700;padding:10px 12px;">${escapeHtml(pass.satelliteName)}</td>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(titleCasePassType(pass.passType))}</td>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(pass.localStart)}</td>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(pass.localMax)}</td>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(elevation)}</td>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(pass.directionSummary ?? "Direction unavailable")}</td>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(duration)}</td>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(pass.score ?? "Unknown")}</td>
          <td style="border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:500;padding:10px 12px;">${escapeHtml(pass.rsvpSummary)}</td>
        </tr>`
    })
    .join("")
}

export function buildAlertDigestEmailHtml(payload: AlertDigestEmailPayload) {
  const subject = buildAlertDigestEmailSubject(payload)
  const passLabel = payload.passes.length === 1 ? "pass" : "passes"

  return `<!doctype html>
<html>
  <body style="background:#f7f6f2;color:#18181b;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
    <main style="margin:0 auto;max-width:760px;padding:32px 20px;">
      <p style="font-size:20px;font-weight:700;letter-spacing:0;margin:0 0 28px;">SurfPass</p>
      <section style="background:#ffffff;border:1px solid #d4d4d8;padding:24px;">
        <p style="color:#71717a;font-size:12px;font-weight:700;letter-spacing:.08em;margin:0 0 12px;text-transform:uppercase;">Pass digest</p>
        <h1 style="font-size:28px;line-height:1.05;margin:0 0 12px;">${escapeHtml(subject)}</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">${escapeHtml(payload.groupName)} has ${payload.passes.length} alertable ${passLabel} inside this ${payload.leadMinutes} minute lead window.</p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-top:1px solid #e4e4e7;width:100%;">
          <thead>
            <tr>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">Satellite</th>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">Type</th>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">Start</th>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">Best</th>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">Elevation</th>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">Direction</th>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">Duration</th>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">Score</th>
              <th style="border-bottom:1px solid #d4d4d8;color:#52525b;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase;">RSVP</th>
            </tr>
          </thead>
          <tbody>
            ${digestPassRows(payload)}
          </tbody>
        </table>
        <p style="margin:24px 0 0;">
          <a href="${escapeHtml(payload.appUrl)}" style="background:#18181b;color:#ffffff;display:inline-block;font-size:14px;font-weight:700;padding:11px 14px;text-decoration:none;">Open SurfPass</a>
        </p>
      </section>
      <p style="color:#71717a;font-size:12px;line-height:1.6;margin:16px 0 0;">You are receiving this because alerts are enabled for this group. SMS and WhatsApp are out of scope for the MVP.</p>
    </main>
  </body>
</html>`
}

export function buildAlertDigestEmailText(payload: AlertDigestEmailPayload) {
  const passes = payload.passes
    .map((pass, index) => {
      const duration =
        pass.durationSeconds === undefined
          ? "Unknown"
          : formatDuration(pass.durationSeconds)
      const elevation =
        pass.maxElevation === undefined
          ? "Unknown"
          : formatElevation(pass.maxElevation)

      return `${index + 1}. ${pass.satelliteName} ${pass.passType}
Start: ${pass.localStart}
Best moment: ${pass.localMax}
End: ${pass.localEnd}
Max elevation: ${elevation}
Direction: ${pass.directionSummary ?? "Direction unavailable"}
Duration: ${duration}
Score: ${pass.score ?? "Unknown"}
RSVP: ${pass.rsvpSummary}`
    })
    .join("\n\n")

  return `SurfPass

${buildAlertDigestEmailSubject(payload)}

Group: ${payload.groupName}
Lead time: ${payload.leadMinutes} minutes

${passes}

Open SurfPass: ${payload.appUrl}

You are receiving this because alerts are enabled for this group.`
}
