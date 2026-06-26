import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/components/auth/login-form"
import { redirectAuthenticatedUser } from "@/lib/auth/guards"

export default async function LoginPage() {
  await redirectAuthenticatedUser()

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-10 text-zinc-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl content-center gap-8">
        <Link href="/" className="text-xl font-semibold">
          SurfPass
        </Link>
        <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-end">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase text-zinc-500">
              Operator access
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-none md:text-6xl">
              Sign in to coordinate upcoming satellite passes.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">
              Use your test account or create a local account.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-950"
            >
              <ArrowLeft className="size-4" />
              Back to landing
            </Link>
          </div>
          <Card className="rounded-md border-zinc-200 bg-white shadow-none">
            <CardHeader className="border-b border-zinc-200">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-zinc-950">
                <Mail className="size-5 text-zinc-500" />
                SurfPass account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
