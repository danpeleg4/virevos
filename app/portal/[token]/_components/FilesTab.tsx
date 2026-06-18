import { useState } from "react";
import axios from "axios";
import {
  Paperclip,
  FileText,
  FileUp,
  Upload,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import type { PortalData } from "@/types/portal";
import { formatFileSize } from "../_lib/format";
import { useFileUpload } from "../_lib/hooks";

interface FilesTabProps {
  data: PortalData;
  token: string;
}

export function FilesTab({ data, token }: FilesTabProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(
    data.cases[0]?.id ?? null
  );
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const upload = useFileUpload(token);

  const uploadError =
    upload.isError && axios.isAxiosError(upload.error)
      ? (upload.error.response?.data?.error ?? "Upload failed")
      : upload.isError
        ? "Upload failed"
        : null;

  const handleFile = (file: File) => {
    upload.mutate({ file, caseId: selectedCaseId });
  };

  const fileSharingEnabled = data.settings?.fileSharing ?? true;

  return (
    <div className="mt-6">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
          <Paperclip className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium text-foreground">Files</span>
        </div>
        <div className="space-y-4 p-4">
          {/* Upload zone — only shown when fileSharing is not disabled */}
          {fileSharingEnabled && (
            <>
              <input
                type="file"
                id="portalFileInput"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />

              {/* Case selector when multiple cases exist */}
              {data.cases.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">
                    Upload to:
                  </label>
                  <select
                    className="flex-1 text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedCaseId ?? ""}
                    onChange={(e) => setSelectedCaseId(Number(e.target.value))}
                  >
                    {data.cases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                onClick={() =>
                  document.getElementById("portalFileInput")?.click()
                }
                className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDraggingFile
                    ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                    : "border-border hover:border-orange-300 hover:bg-muted/50"
                }`}
              >
                {upload.isPending ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="text-sm text-muted-foreground">
                      Uploading...
                    </p>
                  </>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Max 10 MB per file
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 pointer-events-none"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                  </>
                )}
              </div>

              {uploadError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {uploadError}
                </p>
              )}
            </>
          )}

          {/* File list */}
          {data.files.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
              <Paperclip className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No files yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {data.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatFileSize(file.size)}
                        {file.createdAt
                          ? ` · ${new Date(file.createdAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="shrink-0"
                  >
                    <a
                      href={`/api/portal/${token}/files/${file.id}/download`}
                      download={file.name}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
