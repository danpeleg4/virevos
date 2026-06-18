import { FileText, CheckCircle2, Upload, Loader2 } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import type { PortalData } from "@/types/portal";
import { useDocumentItemUpload } from "../_lib/hooks";

interface DocumentsTabProps {
  data: PortalData;
  token: string;
}

export function DocumentsTab({ data, token }: DocumentsTabProps) {
  const upload = useDocumentItemUpload(token);

  return (
    <div className="mt-6">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-foreground">
            Documents Needed
          </span>
        </div>
        <div className="p-4 space-y-6">
          {data.documentRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No documents requested
              </p>
            </div>
          ) : (
            data.documentRequests.map((req) => (
              <div key={req.id} className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {req.eventTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From your meeting on{" "}
                    {new Date(req.eventDateTime).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {req.items.map((item) => {
                    const isUploading =
                      upload.isPending && upload.variables?.itemId === item.id;
                    const inputId = `doc-item-input-${item.id}`;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="mt-0.5 shrink-0">
                            {item.status === "uploaded" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground font-medium">
                              {item.name}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description}
                              </p>
                            )}
                            {item.status === "uploaded" &&
                              item.uploadedFile && (
                                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                  Uploaded:{" "}
                                  <a
                                    href={`/api/portal/${token}/files/${item.uploadedFile.id}/download`}
                                    className="underline"
                                    download={item.uploadedFile.name}
                                  >
                                    {item.uploadedFile.name}
                                  </a>
                                </p>
                              )}
                            {item.status === "rejected" &&
                              item.uploadedFile && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last upload:{" "}
                                  <a
                                    href={`/api/portal/${token}/files/${item.uploadedFile.id}/download`}
                                    className="underline"
                                    download={item.uploadedFile.name}
                                  >
                                    {item.uploadedFile.name}
                                  </a>
                                </p>
                              )}
                            {item.aiVerdict === "meets" && (
                              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                ✓ Looks good
                                {item.aiReasoning
                                  ? ` — ${item.aiReasoning}`
                                  : ""}
                              </p>
                            )}
                            {item.aiVerdict === "does_not_meet" && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                ✗ Does not meet requirements
                                {item.aiReasoning
                                  ? ` — ${item.aiReasoning}`
                                  : ""}
                                . Please re-upload.
                              </p>
                            )}
                            {(item.aiVerdict === "needs_review" ||
                              item.aiVerdict === "error" ||
                              item.aiVerdict === "skipped") && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Awaiting agency review.
                              </p>
                            )}
                          </div>
                        </div>
                        {item.status !== "uploaded" && (
                          <>
                            <input
                              type="file"
                              id={inputId}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  upload.mutate({ itemId: item.id, file });
                                }
                                e.target.value = "";
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 h-8 text-xs gap-1.5"
                              onClick={() =>
                                document.getElementById(inputId)?.click()
                              }
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              Upload
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
