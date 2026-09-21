import { listTodos } from '@/lib/actions/todos'
import { TodoList } from '@/components/modules/todos/todo-list'

export default async function TodosPage() {
  const todos = await listTodos()

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">To-do list</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          Your personal list — only you can see it. Nearest deadline stays on top.
        </p>
      </div>

      <TodoList
        todos={todos.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          deadline: t.deadline,
          isDone: t.isDone,
          createdAt: t.createdAt,
        }))}
      />
    </div>
  )
}
