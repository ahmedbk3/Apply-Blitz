import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRunTestMode } from "@workspace/api-client-react";
import { Loader2, Play, AlertCircle } from "lucide-react";

interface TestRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestRunModal({ open, onOpenChange }: TestRunModalProps) {
  const testRun = useRunTestMode();

  const handleTestRun = () => {
    testRun.mutate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Test Run</DialogTitle>
          <DialogDescription>
            Simulate a run without actually sending applications. Fetches 5 jobs per category to verify parsing and matching.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 space-y-4">
          <div className="flex justify-between items-center">
            <Button onClick={handleTestRun} disabled={testRun.isPending}>
              {testRun.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Start Test Run
            </Button>
            
            {testRun.data && (
              <span className="text-sm text-muted-foreground font-mono">
                Found {testRun.data.jobs.length} potential matches
              </span>
            )}
          </div>

          <div className="flex-1 bg-[#0A0D12] rounded-md border border-border overflow-hidden">
            <ScrollArea className="h-full">
              {testRun.isPending ? (
                <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : testRun.error ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-destructive p-4 text-center">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p>Failed to execute test run. Check logs for details.</p>
                </div>
              ) : testRun.data ? (
                <div className="p-4 space-y-4">
                  {testRun.data.jobs.map((job, i) => (
                    <div key={i} className="border border-border bg-card rounded p-3 text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-primary">{job.role}</div>
                          <div className="text-foreground">{job.company}</div>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-secondary text-muted-foreground">{job.category}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-secondary text-muted-foreground">{job.language}</span>
                          {job.wouldApply ? (
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-success/20 text-success">Would Apply</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-warning/20 text-warning">Manual Review</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate font-mono">{job.url}</div>
                    </div>
                  ))}
                  {testRun.data.jobs.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No jobs found in this test run.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                  Click "Start Test Run" to begin
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
