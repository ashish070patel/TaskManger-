import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { taskSchema } from "@/lib/validations"
import { encrypt, decrypt } from "@/lib/crypto"

// GET /api/tasks - List all tasks for the authenticated user
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const sort = searchParams.get("sort") || "created_at"
  const order = searchParams.get("order") || "desc"

  // Validate sort and order to prevent injection
  const validSorts = ["created_at", "updated_at", "title", "status"]
  const validOrders = ["asc", "desc"]
  const safeSort = validSorts.includes(sort) ? sort : "created_at"
  const safeOrder = validOrders.includes(order) ? order : "desc"

  let tasks

  if (status && search) {
    tasks = await sql`
      SELECT * FROM tasks
      WHERE user_id = ${session.userId}
        AND status = ${status}
        AND (title ILIKE ${"%" + search + "%"} OR description ILIKE ${"%" + search + "%"})
      ORDER BY
        CASE WHEN ${safeSort} = 'created_at' AND ${safeOrder} = 'desc' THEN created_at END DESC,
        CASE WHEN ${safeSort} = 'created_at' AND ${safeOrder} = 'asc' THEN created_at END ASC,
        CASE WHEN ${safeSort} = 'updated_at' AND ${safeOrder} = 'desc' THEN updated_at END DESC,
        CASE WHEN ${safeSort} = 'updated_at' AND ${safeOrder} = 'asc' THEN updated_at END ASC,
        CASE WHEN ${safeSort} = 'title' AND ${safeOrder} = 'desc' THEN title END DESC,
        CASE WHEN ${safeSort} = 'title' AND ${safeOrder} = 'asc' THEN title END ASC,
        CASE WHEN ${safeSort} = 'status' AND ${safeOrder} = 'desc' THEN status END DESC,
        CASE WHEN ${safeSort} = 'status' AND ${safeOrder} = 'asc' THEN status END ASC
    `
  } else if (status) {
    tasks = await sql`
      SELECT * FROM tasks
      WHERE user_id = ${session.userId} AND status = ${status}
      ORDER BY
        CASE WHEN ${safeSort} = 'created_at' AND ${safeOrder} = 'desc' THEN created_at END DESC,
        CASE WHEN ${safeSort} = 'created_at' AND ${safeOrder} = 'asc' THEN created_at END ASC,
        CASE WHEN ${safeSort} = 'updated_at' AND ${safeOrder} = 'desc' THEN updated_at END DESC,
        CASE WHEN ${safeSort} = 'updated_at' AND ${safeOrder} = 'asc' THEN updated_at END ASC,
        CASE WHEN ${safeSort} = 'title' AND ${safeOrder} = 'desc' THEN title END DESC,
        CASE WHEN ${safeSort} = 'title' AND ${safeOrder} = 'asc' THEN title END ASC,
        CASE WHEN ${safeSort} = 'status' AND ${safeOrder} = 'desc' THEN status END DESC,
        CASE WHEN ${safeSort} = 'status' AND ${safeOrder} = 'asc' THEN status END ASC
    `
  } else if (search) {
    tasks = await sql`
      SELECT * FROM tasks
      WHERE user_id = ${session.userId}
        AND (title ILIKE ${"%" + search + "%"} OR description ILIKE ${"%" + search + "%"})
      ORDER BY
        CASE WHEN ${safeSort} = 'created_at' AND ${safeOrder} = 'desc' THEN created_at END DESC,
        CASE WHEN ${safeSort} = 'created_at' AND ${safeOrder} = 'asc' THEN created_at END ASC,
        CASE WHEN ${safeSort} = 'updated_at' AND ${safeOrder} = 'desc' THEN updated_at END DESC,
        CASE WHEN ${safeSort} = 'updated_at' AND ${safeOrder} = 'asc' THEN updated_at END ASC,
        CASE WHEN ${safeSort} = 'title' AND ${safeOrder} = 'desc' THEN title END DESC,
        CASE WHEN ${safeSort} = 'title' AND ${safeOrder} = 'asc' THEN title END ASC,
        CASE WHEN ${safeSort} = 'status' AND ${safeOrder} = 'desc' THEN status END DESC,
        CASE WHEN ${safeSort} = 'status' AND ${safeOrder} = 'asc' THEN status END ASC
    `
  } else {
    tasks = await sql`
      SELECT * FROM tasks
      WHERE user_id = ${session.userId}
      ORDER BY
        CASE WHEN ${safeSort} = 'created_at' AND ${safeOrder} = 'desc' THEN created_at END DESC,
        CASE WHEN ${safeSort} = 'created_at' AND ${safeOrder} = 'asc' THEN created_at END ASC,
        CASE WHEN ${safeSort} = 'updated_at' AND ${safeOrder} = 'desc' THEN updated_at END DESC,
        CASE WHEN ${safeSort} = 'updated_at' AND ${safeOrder} = 'asc' THEN updated_at END ASC,
        CASE WHEN ${safeSort} = 'title' AND ${safeOrder} = 'desc' THEN title END DESC,
        CASE WHEN ${safeSort} = 'title' AND ${safeOrder} = 'asc' THEN title END ASC,
        CASE WHEN ${safeSort} = 'status' AND ${safeOrder} = 'desc' THEN status END DESC,
        CASE WHEN ${safeSort} = 'status' AND ${safeOrder} = 'asc' THEN status END ASC
    `
  }

  // Decrypt descriptions
  const decryptedTasks = await Promise.all(
    tasks.map(async (task) => ({
      ...task,
      description: await decrypt(task.description || ""),
    }))
  )

  return NextResponse.json({ tasks: decryptedTasks })
}

// POST /api/tasks - Create a new task
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    const result = await sql`
      INSERT INTO tasks (user_id, title, description, status)
      VALUES (${session.userId}, ${title}, ${encryptedDescription}, ${status})
      RETURNING *
    `

    const task = result[0]
    task.description = description || ""

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("Task creation error:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}
