"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TaskCard } from "@/components/task-card"
import { TaskDialog, type Task } from "@/components/task-dialog"
import {
  Plus,
  Search,
  ArrowUpDown,
  ListFilter,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const ITEMS_PER_PAGE = 9 // 3x3 grid

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function TaskList() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("created_at")
  const [order, setOrder] = useState("desc")
  const [page, setPage] = useState(1)

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Reset to page 1 whenever filters change
  function updateFilter<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  // Build URL with all filters + pagination
  const params = new URLSearchParams()
  if (statusFilter !== "all") params.set("status", statusFilter)
  if (search) params.set("search", search)
  params.set("sort", sort)
  params.set("order", order)
  params.set("page", String(page))
  params.set("limit", String(ITEMS_PER_PAGE))

  const { data, isLoading, mutate } = useSWR(
    `/api/tasks?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: true }
  )

  const tasks: Task[] = data?.tasks || []
  const pagination: Pagination | undefined = data?.pagination

  const handleSuccess = useCallback(() => {
    mutate()
  }, [mutate])

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${deleteId}`, { method: "DELETE" })
      if (res.ok) {
        // If we deleted the last item on this page, go back one page
        if (tasks.length === 1 && page > 1) setPage((p) => p - 1)
        mutate()
      }
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  function toggleOrder() {
    setOrder((prev) => (prev === "desc" ? "asc" : "desc"))
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats strip */}
      {pagination && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", count: pagination.total, color: "bg-foreground/10 text-foreground" },
            { label: "Page", count: `${pagination.page} / ${pagination.totalPages || 1}`, color: "bg-muted text-muted-foreground" },
            { label: "Per Page", count: ITEMS_PER_PAGE, color: "bg-secondary text-secondary-foreground" },
            { label: "Showing", count: tasks.length, color: "bg-primary/10 text-foreground" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-3 ${stat.color}`}
            >
              <span className="text-2xl font-bold">{stat.count}</span>
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={updateFilter(setStatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <ListFilter className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={updateFilter(setSort)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="updated_at">Last Updated</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleOrder}
            aria-label={`Sort ${order === "desc" ? "ascending" : "descending"}`}
          >
            <ArrowUpDown className="size-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
        </div>
      </div>

      {/* Task Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20">
          <Inbox className="size-12 text-muted-foreground/50" />
          <div className="text-center">
            <p className="font-medium text-foreground">No tasks found</p>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first task to get started"}
            </p>
          </div>
          {!search && statusFilter === "all" && (
            <Button
              variant="outline"
              onClick={() => setCreateOpen(true)}
              className="mt-2"
            >
              <Plus className="size-4" />
              Create Task
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={(t) => setEditTask(t)}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{pagination.total}</span> tasks
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!pagination.hasPrevPage || isLoading}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm font-medium px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage || isLoading}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />

      {/* Edit Dialog */}
      {editTask && (
        <TaskDialog
          open={!!editTask}
          onOpenChange={(open) => {
            if (!open) setEditTask(null)
          }}
          task={editTask}
          onSuccess={handleSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
