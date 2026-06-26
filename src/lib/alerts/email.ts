import "server-only"

import { Resend } from "resend"

import { getAlertEnv } from "@/lib/env"
import {
  buildAlertDigestEmailHtml,
  buildAlertDigestEmailSubject,
  buildAlertDigestEmailText,
  buildAlertEmailHtml,
  buildAlertEmailSubject,
  buildAlertEmailText,
} from "@/lib/alerts/templates"
import type {
  AlertDigestEmailSendInput,
  AlertEmailSendInput,
  AlertEmailSendResult,
} from "@/lib/alerts/types"

export class AlertEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AlertEmailError"
  }
}

export async function sendAlertEmail({
  payload,
  leadMinutes,
  idempotencyKey,
}: AlertEmailSendInput): Promise<AlertEmailSendResult> {
  const { resendApiKey, fromEmail } = getAlertEnv()
  const resend = new Resend(resendApiKey)
  const subject = buildAlertEmailSubject(payload, leadMinutes)
  const result = await resend.emails.send(
    {
      from: fromEmail,
      to: payload.to,
      subject,
      html: buildAlertEmailHtml(payload, leadMinutes),
      text: buildAlertEmailText(payload, leadMinutes),
    },
    idempotencyKey ? { idempotencyKey } : undefined
  )

  if (result.error) {
    throw new AlertEmailError(result.error.message)
  }

  if (!result.data?.id) {
    throw new AlertEmailError("Resend accepted no message id.")
  }

  return {
    providerMessageId: result.data.id,
  }
}

export async function sendAlertDigestEmail({
  payload,
  idempotencyKey,
}: AlertDigestEmailSendInput): Promise<AlertEmailSendResult> {
  const { resendApiKey, fromEmail } = getAlertEnv()
  const resend = new Resend(resendApiKey)
  const result = await resend.emails.send(
    {
      from: fromEmail,
      to: payload.to,
      subject: buildAlertDigestEmailSubject(payload),
      html: buildAlertDigestEmailHtml(payload),
      text: buildAlertDigestEmailText(payload),
    },
    idempotencyKey ? { idempotencyKey } : undefined
  )

  if (result.error) {
    throw new AlertEmailError(result.error.message)
  }

  if (!result.data?.id) {
    throw new AlertEmailError("Resend accepted no message id.")
  }

  return {
    providerMessageId: result.data.id,
  }
}
