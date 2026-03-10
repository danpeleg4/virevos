"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import {
  Paperclip,
  Upload,
  File,
  FileText,
  Image,
  X,
  Link2,
  Cloud,
  Folder,
  Search,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (files: AttachedFile[]) => void;
}

interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: "document" | "image" | "other";
  url?: string;
  path?: string;
}

interface AppFile {
  id: number;
  name: string;
  path: string;
  size: number;
  mimeType: string | null;
  createdAt: string | null;
  projectName: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(
  mimeType: string | null,
  name: string
): AttachedFile["type"] {
  if (!mimeType) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || ""))
      return "image";
    if (["pdf", "doc", "docx", "xls", "xlsx", "txt"].includes(ext || ""))
      return "document";
    return "other";
  }
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("text")
  )
    return "document";
  return "other";
}

export function AttachmentDialog({
  open,
  onOpenChange,
  onAttach,
}: AttachmentDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<AttachedFile[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [appFiles, setAppFiles] = useState<AppFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchAppFiles();
    }
  }, [open]);

  const fetchAppFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch("/api/files/user-files");
      if (res.ok) {
        const data = await res.json();
        setAppFiles(data.files || []);
      }
    } catch (err) {
      console.error("Failed to fetch app files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const attachedFile: AttachedFile = {
            id: String(data.id || Date.now()),
            name: file.name,
            size: formatFileSize(file.size),
            type: getFileType(file.type, file.name),
            path: data.path,
            url: data.url,
          };
          setSelectedFiles((prev) => [...prev, attachedFile]);
          toast.success(`${file.name} uploaded successfully`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectAppFile = (file: AppFile) => {
    const attachedFile: AttachedFile = {
      id: String(file.id),
      name: file.name,
      size: formatFileSize(file.size),
      type: getFileType(file.mimeType, file.name),
      path: file.path,
    };
    if (selectedFiles.find((f) => f.id === attachedFile.id)) {
      setSelectedFiles(selectedFiles.filter((f) => f.id !== attachedFile.id));
    } else {
      setSelectedFiles([...selectedFiles, attachedFile]);
    }
  };

  const handleAttach = () => {
    const allFiles = [...selectedFiles];
    if (linkUrl) {
      allFiles.push({
        id: `link-${Date.now()}`,
        name: linkUrl,
        size: "Link",
        type: "other",
        url: linkUrl,
      });
    }
    onAttach(allFiles);
    setSelectedFiles([]);
    setLinkUrl("");
    onOpenChange(false);
  };

  const getFileIcon = (type: AttachedFile["type"]) => {
    switch (type) {
      case "document":
        return <FileText className="h-8 w-8 text-blue-500" />;
      case "image":
        return <Image className="h-8 w-8 text-green-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const filteredAppFiles = appFiles.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Paperclip className="h-5 w-5 mr-2" />
            Attach Files
          </DialogTitle>
          <DialogDescription>
            Upload files, add links, or select from your project files
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col"
        >
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Folder className="h-4 w-4 mr-2" />
              App Files
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link2 className="h-4 w-4 mr-2" />
              Add Link
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-2" style={{ height: "320px" }}>
            <TabsContent
              value="upload"
              className="absolute inset-0 data-[state=inactive]:hidden"
            >
              <div
                className="h-full border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer flex flex-col items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-12 w-12 text-blue-400 mb-4 animate-spin" />
                    <p className="text-sm text-gray-700">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Cloud className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-700 mb-2">
                      Drop files here or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Maximum file size: 10 MB
                    </p>
                    <Button variant="outline" size="sm" type="button">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="recent"
              className="absolute inset-0 flex flex-col gap-3 data-[state=inactive]:hidden"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="flex-1">
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredAppFiles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Folder className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No project files found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAppFiles.map((file, index) => {
                      const type = getFileType(file.mimeType, file.name);
                      const attached = selectedFiles.find(
                        (f) => f.id === String(file.id)
                      );
                      return (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleSelectAppFile(file)}
                          className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            attached
                              ? "bg-blue-50 border-blue-200 border"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {getFileIcon(type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                              {file.projectName ? ` · ${file.projectName}` : ""}
                            </p>
                          </div>
                          {attached && (
                            <Badge className="bg-blue-500 text-white">
                              Selected
                            </Badge>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="link"
              className="absolute inset-0 space-y-4 overflow-y-auto data-[state=inactive]:hidden"
            >
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-700 mb-2 block">
                    File URL
                  </label>
                  <Input
                    placeholder="https://example.com/file.pdf"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Add a link to a file stored in cloud storage or external
                  website
                </p>
                {linkUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Link2 className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-900 font-medium">
                            Link Preview
                          </p>
                          <p className="text-xs text-blue-700 mt-1 break-all">
                            {linkUrl}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLinkUrl("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {selectedFiles.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-700 mb-3">
              Selected Files ({selectedFiles.length})
            </p>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {selectedFiles.map((file) => (
                <Badge key={file.id} variant="secondary" className="pr-1">
                  {file.name}
                  <button
                    onClick={() =>
                      setSelectedFiles(
                        selectedFiles.filter((f) => f.id !== file.id)
                      )
                    }
                    className="ml-2 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAttach}
            disabled={selectedFiles.length === 0 && !linkUrl}
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Attach {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
