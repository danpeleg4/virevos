import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import type { PortalData } from "@/types/portal";
import { getInitials } from "../_lib/format";

interface PortalHeaderProps {
  client: PortalData["client"];
  title: string;
}

export function PortalHeader({ client, title }: PortalHeaderProps) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-foreground">
              <span className="text-background text-xs font-bold">
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-foreground">
                {client.name}
              </p>
              {client.email && (
                <p className="text-xs text-muted-foreground">{client.email}</p>
              )}
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
