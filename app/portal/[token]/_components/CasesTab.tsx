import { FolderKanban } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import type { PortalData } from "@/types/portal";
import { CasesTable } from "./CasesTable";

export function CasesTab({ data }: { data: PortalData }) {
  return (
    <div className="mt-6">
      <Card className="overflow-hidden p-0 gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
          <FolderKanban className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-foreground">All Cases</span>
        </div>
        <div>
          {data.cases.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
              <FolderKanban className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No cases yet</p>
            </div>
          ) : (
            <CasesTable cases={data.cases} />
          )}
        </div>
      </Card>
    </div>
  );
}
