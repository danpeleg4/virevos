import type { ComponentType, SVGProps } from "react";

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>> | string;
  connected: boolean;
  syncStatus: "synced" | "syncing" | "error" | "not-connected";
  lastSync?: string;
  features: string[];
}
