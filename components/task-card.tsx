"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Pencil, Trash2, Clock, CircleDot, CheckCircle2 } from "lucide-react"
import type { Task } from "@/components/task-dialog"

const statusConfig = {
  todo: {
    label: "To Do",
    variant: "outline" as const,
    icon: CircleDot,
  },
  "in-progress": {
    label: "In Progress",
    variant: "secondary" as const,
    icon: Clock,
  },
  done: {
    label: "Done",
    variant: "default" as const,
    icon: CheckCircle2,
  },
}

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: number) => void
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const config = statusConfig[task.status]
  const StatusIcon = config.icon

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug text-balance">
            {task.title}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(task)}
              aria-label="Edit task"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(task.id)}
              aria-label="Delete task"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {task.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
            {task.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={config.variant} className="gap-1">
            <StatusIcon className="size-3" />
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(task.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
