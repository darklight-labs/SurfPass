#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const ROOT = process.cwd()
const args = new Set(process.argv.slice(2))
const shouldCheckRemote = args.has("--remote")
const strict = args.has("--strict")

const results = []

function addResult(area, check, status, detail) {
  results.push({ area, check, status, detail })
}

function valueOf(name) {
  return process.env[name]?.trim() ?? ""
}

function isPresent(name) {
  return valueOf(name).length > 0
}

function isPlaceholder(value) {
  const normalised = value.trim().toLowerCase()

  if (!normalised) {
    return true
  }

  return [
    "changeme",
    "change-me",
    "change_me",
    "your-key",
    "your_key",
    "replace-me",
    "replace_me",
    "placeholder",
    "pending",
    "todo",
    "xxx",
    "example",
    "insert",
  ].some((token) => normalised.includes(token))
}

function maskValue(value) {
  if (!value) {
    return "missing"
  }

  if (value.length <= 8) {
    return "present (masked)"
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function safeUrlDetail(value) {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}`
  } catch {
    return "invalid URL"
  }
}

function checkRequiredEnv(name, { url = false, secret = true } = {}) {
  const value = valueOf(name)

  if (!value) {
    addResult("Env", name, "FAIL", "missing")
    return
  }

  if (isPlaceholder(value)) {
    addResult("Env", name, "FAIL", "placeholder-like value")
    return
  }

  if (url) {
    try {
      const parsed = new URL(value)
      const local = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
        parsed.hostname
      )

      addResult(
        "Env",
        name,
        local ? "WARN" : "PASS",
        `${safeUrlDetail(value)}${local ? " (local URL)" : ""}`
      )
    } catch {
      addResult("Env", name, "FAIL", "invalid URL")
    }
    return
  }

  addResult("Env", name, "PASS", secret ? maskValue(value) : "present")
}

function checkEitherEnv(names, label, { url = false } = {}) {
  const present = names.filter(isPresent)

  if (present.length === 0) {
    addResult("Env", label, "FAIL", `missing one of: ${names.join(", ")}`)
    return
  }

  const selected = present[0]
  const value = valueOf(selected)

  if (isPlaceholder(value)) {
    addResult("Env", label, "FAIL", `${selected} has placeholder-like value`)
    return
  }

  if (url) {
    try {
      const parsed = new URL(value)
      const local = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
        parsed.hostname
      )

      addResult(
        "Env",
        label,
        local ? "WARN" : "PASS",
        `${selected}: ${safeUrlDetail(value)}${local ? " (local URL)" : ""}`
      )
    } catch {
      addResult("Env", label, "FAIL", `${selected} is not a valid URL`)
    }
    return
  }

  addResult("Env", label, "PASS", `${selected}: ${maskValue(value)}`)
}

function checkCronSecret() {
  const value = valueOf("CRON_SECRET")

  if (!value) {
    return
  }

  if (value.length < 16) {
    addResult("Env safety", "CRON_SECRET length", "FAIL", "must be at least 16 characters")
    return
  }

  addResult("Env safety", "CRON_SECRET length", "PASS", ">= 16 characters")
}

async function exists(relativePath) {
  try {
    await access(path.join(ROOT, relativePath))
    return true
  } catch {
    return false
  }
}

async function checkFile(relativePath) {
  addResult(
    "Files",
    relativePath,
    (await exists(relativePath)) ? "PASS" : "FAIL",
    (await exists(relativePath)) ? "found" : "missing"
  )
}

async function checkRequiredFiles() {
  const required = [
    "README.md",
    "vercel.json",
    "supabase/migrations",
    "supabase/seed.sql",
    "docs/reviewer-flow.md",
    "docs/submission-checklist.md",
    "docs/final-qa-report.md",
  ]

  for (const item of required) {
    await checkFile(item)
  }

  try {
    const migrations = await readdir(path.join(ROOT, "supabase/migrations"))
    const sqlMigrations = migrations.filter((file) => file.endsWith(".sql"))
    addResult(
      "Files",
      "supabase/migrations/*.sql",
      sqlMigrations.length > 0 ? "PASS" : "FAIL",
      `${sqlMigrations.length} SQL migration(s)`
    )
  } catch {
    addResult("Files", "supabase/migrations/*.sql", "FAIL", "directory unreadable")
  }
}

async function readText(relativePath) {
  try {
    return await readFile(path.join(ROOT, relativePath), "utf8")
  } catch {
    return ""
  }
}

async function checkReadmePlaceholders() {
  const readme = await readText("README.md")

  if (!readme) {
    addResult("README", "placeholder scan", "FAIL", "README.md unavailable")
    return
  }

  addResult(
    "README",
    "Live URL",
    /live url[\s\S]{0,120}pending/i.test(readme)
      ? "WARN"
      : "PASS",
    /live url[\s\S]{0,120}pending/i.test(readme)
      ? "still pending"
      : "not pending"
  )
  addResult(
    "README",
    "Test account",
    /test account[\s\S]{0,180}pending/i.test(readme)
      ? "WARN"
      : "PASS",
    /test account[\s\S]{0,180}pending/i.test(readme)
      ? "still pending"
      : "not pending"
  )
}

async function checkGithubPlaceholders() {
  const docs = [
    "README.md",
    "docs/submission-checklist.md",
    "docs/submission-email.md",
    "docs/reviewer-flow.md",
  ]
  const combined = (
    await Promise.all(docs.map((file) => readText(file)))
  ).join("\n")
  const mentionsGithub = /github/i.test(combined)
  const hasUrl = /https:\/\/github\.com\/[^\s)]+/i.test(combined)
  const blankLabel = /^GitHub:\s*$/im.test(combined)

  if (!mentionsGithub) {
    return
  }

  addResult(
    "Submission",
    "GitHub URL",
    hasUrl && !blankLabel ? "PASS" : "WARN",
    hasUrl && !blankLabel ? "GitHub URL present" : "GitHub URL appears missing"
  )
}

async function checkVercelCron() {
  const text = await readText("vercel.json")

  if (!text) {
    addResult("Vercel", "vercel.json", "FAIL", "missing")
    return
  }

  try {
    const parsed = JSON.parse(text)
    const crons = Array.isArray(parsed.crons) ? parsed.crons : []
    const alertCron = crons.find((cron) => cron?.path === "/api/cron/alerts")

    addResult(
      "Vercel",
      "cron path",
      alertCron ? "PASS" : "FAIL",
      alertCron ? "/api/cron/alerts configured" : "/api/cron/alerts missing"
    )
    addResult(
      "Vercel",
      "cron schedule",
      alertCron?.schedule ? "PASS" : "FAIL",
      alertCron?.schedule ?? "missing"
    )
  } catch (error) {
    addResult(
      "Vercel",
      "vercel.json parse",
      "FAIL",
      error instanceof Error ? error.message : "invalid JSON"
    )
  }
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function checkRemoteRoutes() {
  if (!shouldCheckRemote) {
    addResult("Remote", "--remote", "WARN", "skipped")
    return
  }

  const base = valueOf("APP_BASE_URL") || valueOf("NEXT_PUBLIC_APP_URL")

  if (!base) {
    addResult("Remote", "APP_BASE_URL", "FAIL", "required for --remote")
    return
  }

  let parsed

  try {
    parsed = new URL(base)
  } catch {
    addResult("Remote", "APP_BASE_URL", "FAIL", "invalid URL")
    return
  }

  try {
    const response = await fetchWithTimeout(parsed.toString())
    addResult(
      "Remote",
      "GET /",
      response.status >= 200 && response.status < 500 ? "PASS" : "WARN",
      `HTTP ${response.status}`
    )
  } catch (error) {
    addResult(
      "Remote",
      "GET /",
      "FAIL",
      error instanceof Error ? error.message : "request failed"
    )
  }

  try {
    const cronUrl = new URL("/api/cron/alerts", parsed)
    const response = await fetchWithTimeout(cronUrl.toString())
    addResult(
      "Remote",
      "GET /api/cron/alerts without auth",
      response.status === 401 ? "PASS" : "FAIL",
      `HTTP ${response.status}; expected 401`
    )
  } catch (error) {
    addResult(
      "Remote",
      "GET /api/cron/alerts without auth",
      "FAIL",
      error instanceof Error ? error.message : "request failed"
    )
  }
}

function printSection(title, rows) {
  console.log(`\n${title}`)
  console.log("-".repeat(title.length))

  rows.forEach((row) => {
    const status = row.status.padEnd(4)
    console.log(`${status}  ${row.check} - ${row.detail}`)
  })
}

function printResults() {
  const areas = [...new Set(results.map((result) => result.area))]

  areas.forEach((area) => {
    printSection(
      area,
      results.filter((result) => result.area === area)
    )
  })

  const failCount = results.filter((result) => result.status === "FAIL").length
  const warnCount = results.filter((result) => result.status === "WARN").length
  const passCount = results.filter((result) => result.status === "PASS").length
  const verdict =
    failCount > 0
      ? "NOT READY"
      : warnCount > 0
        ? "READY WITH WARNINGS"
        : "SUBMISSION READY"

  console.log("\nSummary")
  console.log("-------")
  console.log(`PASS ${passCount} / WARN ${warnCount} / FAIL ${failCount}`)
  console.log(`Verdict: ${verdict}`)

  if (!strict && failCount > 0) {
    console.log("Note: use --strict to exit non-zero when FAIL checks exist.")
  }

  if (strict && failCount > 0) {
    process.exitCode = 1
  }
}

async function main() {
  console.log("SurfPass deployment readiness")
  console.log(`Mode: ${shouldCheckRemote ? "local + remote" : "local only"}`)

  checkRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", { url: true, secret: false })
  checkRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  checkRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  checkRequiredEnv("N2YO_API_KEY")
  checkRequiredEnv("RESEND_API_KEY")
  checkEitherEnv(["RESEND_FROM_EMAIL", "ALERT_FROM_EMAIL"], "alert sender email")
  checkRequiredEnv("CRON_SECRET")
  checkEitherEnv(["APP_BASE_URL", "NEXT_PUBLIC_APP_URL"], "app base URL", {
    url: true,
  })
  checkCronSecret()

  await checkRequiredFiles()
  await checkReadmePlaceholders()
  await checkGithubPlaceholders()
  await checkVercelCron()
  await checkRemoteRoutes()

  printResults()
}

main().catch((error) => {
  console.error("Readiness checker failed unexpectedly.")
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
