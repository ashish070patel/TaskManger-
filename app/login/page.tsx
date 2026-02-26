import { LoginForm } from "@/components/login-form"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"

export const metadata = {
  title: "Sign In - TaskFlow",
  description: "Sign in to your TaskFlow account",
}

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect("/dashboard")

  return <LoginForm />
}
