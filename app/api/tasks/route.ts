import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { taskSchema } from "@/lib/validations"
import { encrypt, decrypt } from "@/lib/crypto"

// GET /api/tasks - List tasks for the authenticated user
// Supports: ?status= &search= &sort= &order= &page= &limit=
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  // Validate sort/order against allowlist — these are injected into raw SQL
  const validSorts = ["created_at", "updated_at", "title", "status"]
  const validOrders = ["asc", "desc"]
  const sort = validSorts.includes(searchParams.get("sort") ?? "")
    ? searchParams.get("sort")!
    : "created_at"
  const order = validOrders.includes(searchParams.get("order") ?? "")
    ? searchParams.get("order")!
    : "desc"

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)))
  const offset = (page - 1) * limit

  // ORDER BY clause is safe: both values passed through allowlist above
  const orderBy = `${sort} ${order}`

  // Use sql(string, params[]) form so we can inject the pre-validated ORDER BY
  // as a string while still using $N placeholders for all user-supplied values
  let tasks, countResult

  if (status && search) {
    const pattern = `%${search}%`
    ;[tasks, countResult] = await Promise.all([
      sql(
        `SELECT * FROM tasks WHERE user_id = $1 AND status = $2 AND (title ILIKE $3 OR description ILIKE $3) ORDER BY ${orderBy} LIMIT $4 OFFSET $5`,
        [session.userId, status, pattern, limit, offset]
      ),
      sql(
        `SELECT COUNT(*)::int AS total FROM tasks WHERE user_id = $1 AND status = $2 AND (title ILIKE $3 OR description ILIKE $3)`,
        [session.userId, status, pattern]
      ),
    ])
  } else if (status) {
    ;[tasks, countResult] = await Promise.all([
      sql(
        `SELECT * FROM tasks WHERE user_id = $1 AND status = $2 ORDER BY ${orderBy} LIMIT $3 OFFSET $4`,
        [session.userId, status, limit, offset]
      ),
      sql(
        `SELECT COUNT(*)::int AS total FROM tasks WHERE user_id = $1 AND status = $2`,
        [session.userId, status]
      ),
    ])
  } else if (search) {
    const pattern = `%${search}%`
    ;[tasks, countResult] = await Promise.all([
      sql(
        `SELECT * FROM tasks WHERE user_id = $1 AND (title ILIKE $2 OR description ILIKE $2) ORDER BY ${orderBy} LIMIT $3 OFFSET $4`,
        [session.userId, pattern, limit, offset]
      ),
      sql(
        `SELECT COUNT(*)::int AS total FROM tasks WHERE user_id = $1 AND (title ILIKE $2 OR description ILIKE $2)`,
        [session.userId, pattern]
      ),
    ])
  } else {
    ;[tasks, countResult] = await Promise.all([
      sql(
        `SELECT * FROM tasks WHERE user_id = $1 ORDER BY ${orderBy} LIMIT $2 OFFSET $3`,
        [session.userId, limit, offset]
      ),
      sql(
        `SELECT COUNT(*)::int AS total FROM tasks WHERE user_id = $1`,
        [session.userId]
      ),
    ])
  }

  const total: number = countResult[0]?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  // Decrypt descriptions before returning
  const decryptedTasks = await Promise.all(
    tasks.map(async (task) => ({
      ...task,
      description: await decrypt(task.description || ""),
    }))
  )

  return NextResponse.json({
    tasks: decryptedTasks,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  })
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