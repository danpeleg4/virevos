export function ClientPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">
      <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block flex-shrink-0" />
      {name}
    </span>
  );
}
