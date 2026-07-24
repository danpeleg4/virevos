import { Clock } from "lucide-react";
import type { PortalData } from "@/types/portal";
import { parseDateOnlyString } from "@/lib/util/date_utils";
import { StatusBadge, PriorityBadge } from "./badges";

type PortalCase = PortalData["cases"][number];

export function CasesTable({ cases }: { cases: PortalCase[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
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
