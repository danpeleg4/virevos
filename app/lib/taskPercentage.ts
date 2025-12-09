export function taskPercentage(input: Task[] | {completed: number, total: number}) {
    if (Array.isArray(input)) {
        const completed = input.filter(t => t.status === "completed").length;
        const total = input.length;
        return total === 0 ? 0 : Math.round((completed / total) * 100);
    } else {
        const { completed, total } = input;
        return total === 0 ? 0 : Math.round((completed / total) * 100);
    }
}
