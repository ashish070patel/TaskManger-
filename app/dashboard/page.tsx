import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { TaskList } from "@/components/task-list"

export const metadata = {
  title: "Dashboard - TaskFlow",
  description: "Manage your tasks",
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName={session.name} userEmail={session.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
            Your Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize, track, and complete your work
          </p>
        </div>
        <TaskList />
      </main>
    </div>
  )
}
