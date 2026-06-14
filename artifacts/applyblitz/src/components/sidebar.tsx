import { Link, useLocation } from "wouter";
import { useGetApplicationStats, useGetRunStatus, useRunAll, useRunCategory } from "@workspace/api-client-react";
import { Loader2, Play, TestTube, UploadCloud, FileText, CheckCircle2, XCircle, AlertCircle, Briefcase, Home, Clock, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "./progress-ring";
import { CvUpload } from "./cv-upload";
import { useToast } from "@/hooks/use-toast";
import { TestRunModal } from "./test-run-modal";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PriorityTargets } from "./priority-targets";
import { useGetProfile, useGetSchedule, useUpdateSchedule } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const [testModalOpen, setTestModalOpen] = useState(false);
  const { data: stats } = useGetApplicationStats();
  const { data: runStatus } = useGetRunStatus({ query: { refetchInterval: 3000 }});
  const runAll = useRunAll();
  const runCategory = useRunCategory();
  const { toast } = useToast();
  
  const { data: profile } = useGetProfile();
  const { data: schedule } = useGetSchedule();
  const updateSchedule = useUpdateSchedule();

  const handleRunAll = () => {
    runAll.mutate(undefined, {
      onSuccess: () => toast({ title: "Run started for all categories" }),
      onError: () => toast({ title: "Failed to start run", variant: "destructive" })
    });
  };

  const handleRunCategory = (category: "internships" | "accommodation" | "parttime") => {
    runCategory.mutate({ data: { category } }, {
      onSuccess: () => toast({ title: `Run started for ${category}` }),
      onError: () => toast({ title: `Failed to start run`, variant: "destructive" })
    });
  };

  return (
    <div className="w-72 bg-card border-r border-border h-full flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <Briefcase className="w-5 h-5" />
          <span>ApplyBlitz</span>
        </div>
      </div>

      <div className="p-4 border-b border-border flex flex-col gap-1">
        <Link href="/">
          <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-secondary/50 transition-colors ${location === '/' ? 'bg-secondary text-primary' : 'text-muted-foreground'}`}>
            <Home className="w-4 h-4" />
            <span className="font-medium text-sm">Dashboard</span>
          </div>
        </Link>
        <Link href="/manual">
          <div className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-secondary/50 transition-colors ${location === '/manual' ? 'bg-secondary text-primary' : 'text-muted-foreground'}`}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium text-sm">Manual Queue</span>
            </div>
            {stats?.todayManualQueue ? (
              <span className="bg-warning/20 text-warning text-xs px-2 py-0.5 rounded-full">{stats.todayManualQueue}</span>
            ) : null}
          </div>
        </Link>
        <Link href="/settings">
          <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-secondary/50 transition-colors ${location === '/settings' ? 'bg-secondary text-primary' : 'text-muted-foreground'}`}>
            <Settings className="w-4 h-4" />
            <span className="font-medium text-sm">Settings</span>
          </div>
        </Link>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{profile?.name || "No name set"}</div>
            <div className="text-xs text-muted-foreground">{profile?.email || "No email set"}</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Run Tasks</h3>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTestModalOpen(true)}>
            <TestTube className="w-3 h-3 mr-1" />
            Test Mode
          </Button>
        </div>
        <div className="space-y-2">
          <Button 
            className="w-full justify-start" 
            disabled={runStatus?.isRunning}
            onClick={handleRunAll}
          >
            {runStatus?.isRunning && runStatus?.activeCategories?.length === 3 ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Run All Categories
          </Button>
          <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-border ml-2 mt-2">
            <Button variant="secondary" size="sm" className="justify-start text-xs h-8" disabled={runStatus?.isRunning} onClick={() => handleRunCategory("internships")}>
              {runStatus?.isRunning && runStatus?.activeCategories?.includes("internships") ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2" />}
              Internships
            </Button>
            <Button variant="secondary" size="sm" className="justify-start text-xs h-8" disabled={runStatus?.isRunning} onClick={() => handleRunCategory("accommodation")}>
              {runStatus?.isRunning && runStatus?.activeCategories?.includes("accommodation") ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2" />}
              Accommodation
            </Button>
            <Button variant="secondary" size="sm" className="justify-start text-xs h-8" disabled={runStatus?.isRunning} onClick={() => handleRunCategory("parttime")}>
              {runStatus?.isRunning && runStatus?.activeCategories?.includes("parttime") ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2" />}
              Part-time
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Schedule Config</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4" />
            <span>Daily Run</span>
          </div>
          <Switch 
            checked={schedule?.enabled} 
            onCheckedChange={(enabled) => updateSchedule.mutate({ data: { enabled } })}
          />
        </div>
        {schedule?.enabled && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Next run:</span>
            <span className="font-mono text-primary">{schedule.nextRun ? new Date(schedule.nextRun).toLocaleTimeString() : '...'}</span>
          </div>
        )}
      </div>

      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">CV Upload</h3>
        <CvUpload />
      </div>

      <div className="p-4 flex-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Priority Targets</h3>
        <PriorityTargets />
      </div>

      <TestRunModal open={testModalOpen} onOpenChange={setTestModalOpen} />
    </div>
  );
}
