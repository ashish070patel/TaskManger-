import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { taskSchema } from "@/lib/validations"
import { encrypt, decrypt } from "@/lib/crypto"

// GET /api/tasks/[id] - Get a single task
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  const tasks = await sql`
    SELECT * FROM tasks WHERE id = ${taskId} AND user_id = ${session.userId}
  `

  if (tasks.length === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  const task = tasks[0]
  task.description = await decrypt(task.description || "")

  return NextResponse.json({ task })
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = taskSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { title, description, status } = parsed.data

    // Encrypt description
    const encryptedDescription = await encrypt(description || "")

    // Only update if the task belongs to the current user
    const result = await sql`
      UPDATE tasks
      SET title = ${title}, description = ${encryptedDescription}, status = ${status}, updated_at = NOW()
      WHERE id = ${taskId} AND user_id = ${session.userId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const task = result[0]
    task.description = description || ""

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const taskId = parseInt(id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  // Only delete if the task belongs to the current user
  const result = await sql`
    DELETE FROM tasks WHERE id = ${taskId} AND user_id = ${session.userId}
    RETURNING id
  `

  if (result.length === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
