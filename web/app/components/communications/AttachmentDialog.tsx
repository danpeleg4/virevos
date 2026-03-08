import { useState } from "react";
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
} from "lucide-react";
import { motion } from "motion/react";

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
}

const recentFiles: AttachedFile[] = [
  {
    id: "1",
    name: "Project-Proposal-Q4.pdf",
    size: "2.4 MB",
    type: "document",
  },
  {
    id: "2",
    name: "Design-Mockups-v3.png",
    size: "1.8 MB",
    type: "image",
  },
  {
    id: "3",
    name: "Budget-Summary.xlsx",
    size: "456 KB",
    type: "document",
  },
  {
    id: "4",
    name: "Meeting-Notes-Nov.docx",
    size: "128 KB",
    type: "document",
  },
  {
    id: "5",
    name: "Logo-Final.svg",
    size: "89 KB",
    type: "image",
  },
];

export function AttachmentDialog({
  open,
  onOpenChange,
  onAttach,
}: AttachmentDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<AttachedFile[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [activeTab, setActiveTab] = useState("upload");

  const handleSelectFile = (file: AttachedFile) => {
    if (selectedFiles.find((f) => f.id === file.id)) {
      setSelectedFiles(selectedFiles.filter((f) => f.id !== file.id));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const handleAttach = () => {
    onAttach(selectedFiles);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Paperclip className="h-5 w-5 mr-2" />
            Attach Files
          </DialogTitle>
          <DialogDescription>
            Upload files, add links, or select from recent files
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Folder className="h-4 w-4 mr-2" />
              Recent Files
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link2 className="h-4 w-4 mr-2" />
              Add Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-700 mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Maximum file size: 10 MB
              </p>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search files..." className="pl-10" />
            </div>

            <ScrollArea className="h-72">
              <div className="space-y-2">
                {recentFiles.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectFile(file)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFiles.find((f) => f.id === file.id)
                        ? "bg-blue-50 border-blue-200 border"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">{file.size}</p>
                    </div>
                    {selectedFiles.find((f) => f.id === file.id) && (
                      <Badge className="bg-blue-500 text-white">Selected</Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
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
                Add a link to a file stored in cloud storage or external website
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
                    onClick={() => handleSelectFile(file)}
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
