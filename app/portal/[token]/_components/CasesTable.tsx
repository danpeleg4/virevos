import {
  FolderKanban,
  Flag,
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { PortalData } from "@/types/portal";
import { parseDateOnlyString } from "@/lib/util/date_utils";
import { StatusBadge, PriorityBadge } from "./badges";

type PortalCase = PortalData["cases"][number];

export function CasesTable({ cases }: { cases: PortalCase[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <FolderKanban className="h-3.5 w-3.5" />
                Case
              </div>
            </th>
            <th className="text-left px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                Status
              </div>
            </th>
            <th className="text-left px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Flag className="h-3.5 w-3.5" />
                Priority
              </div>
            </th>
            <th className="text-left px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <CalendarIcon className="h-3.5 w-3.5" />
                Due Date
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cases.map((aCase) => (
            <tr key={aCase.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {aCase.name}
                </p>
                {aCase.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate">
                    {aCase.description}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={aCase.status} />
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={aCase.priority} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {aCase.dueDate ? (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    {parseDateOnlyString(aCase.dueDate).toLocaleDateString()}
                  </div>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
