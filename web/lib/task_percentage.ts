export function task_percentage(
  input: Task[] | { completed: number; total: number }
): number {
  if (!input) {
    return 0;
  }
  let completed: number;
  let total: number;

  if (Array.isArray(input)) {
    completed = input.filter((t) => t.status === "completed").length;
    total = input.length;
  } else {
    ({ completed, total } = input);
  }

  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}
