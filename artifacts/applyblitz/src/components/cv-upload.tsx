import { useState } from "react";
import { UploadCloud, CheckCircle2, Loader2, File } from "lucide-react";
import { useGetCvInfo, getGetCvInfoQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function CvUpload() {
  const { data: cvInfo, isLoading } = useGetCvInfo();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file type", description: "Only PDF files are supported.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("cv", file);

    try {
      const res = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      
      await queryClient.invalidateQueries({ queryKey: getGetCvInfoQueryKey() });
      toast({ title: "CV Uploaded", description: "Successfully updated your CV." });
    } catch (err) {
      toast({ title: "Upload Failed", description: "There was an error uploading your CV.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  if (isLoading) return <div className="h-24 animate-pulse bg-secondary/50 rounded-md"></div>;

  return (
    <div 
      className={`border-2 border-dashed rounded-md p-4 text-center transition-colors cursor-pointer relative overflow-hidden ${isDragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById("cv-upload")?.click()}
    >
      <input type="file" id="cv-upload" className="hidden" accept=".pdf" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
      
      {isUploading ? (
        <div className="flex flex-col items-center justify-center space-y-2 py-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Uploading...</span>
        </div>
      ) : cvInfo?.uploaded ? (
        <div className="flex flex-col items-center justify-center space-y-1">
          <div className="bg-success/20 text-success p-2 rounded-full mb-1">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-foreground truncate max-w-full px-2">{cvInfo.filename || "resume.pdf"}</span>
          <span className="text-[10px] text-muted-foreground">{cvInfo.uploadedAt ? new Date(cvInfo.uploadedAt).toLocaleDateString() : 'Recently'} • {cvInfo.size ? (cvInfo.size / 1024).toFixed(0) + 'KB' : 'PDF'}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 py-2 text-muted-foreground hover:text-foreground transition-colors">
          <UploadCloud className="w-6 h-6" />
          <div className="text-xs text-center">
            <span className="font-semibold text-primary">Click to upload</span> or drag and drop<br/>PDF only (max 5MB)
          </div>
        </div>
      )}
    </div>
  );
}
