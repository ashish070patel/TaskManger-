import { RegisterForm } from "@/components/register-form"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"

export const metadata = {
  title: "Create Account - TaskFlow",
  description: "Create a new TaskFlow account",
}

export default async function RegisterPage() {
  const session = await getSession()
  if (session) redirect("/dashboard")

  return <RegisterForm />
}
