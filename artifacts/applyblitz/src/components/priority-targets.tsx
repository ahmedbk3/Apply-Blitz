import { useListPriorityTargets, useCheckPriorityTarget, getListPriorityTargetsQueryKey } from "@workspace/api-client-react";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function PriorityTargets() {
  const { data: targets, isLoading } = useListPriorityTargets();
  const checkTarget = useCheckPriorityTarget();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCheck = (id: number, company: string) => {
    checkTarget.mutate({ id }, {
      onSuccess: () => {
        toast({ title: `Checked ${company}`, description: "Priority target scan complete." });
        queryClient.invalidateQueries({ queryKey: getListPriorityTargetsQueryKey() });
      },
      onError: () => {
        toast({ title: `Failed to check ${company}`, variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-secondary/50 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {targets?.map((target) => (
        <div key={target.id} className="bg-secondary/30 border border-border rounded-md p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="font-semibold text-sm text-foreground">{target.company}</div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={() => window.open(target.careersUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-success"
                onClick={() => handleCheck(target.id, target.company)}
                disabled={checkTarget.isPending && checkTarget.variables?.id === target.id}
              >
                {checkTarget.isPending && checkTarget.variables?.id === target.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            Last checked: {target.lastChecked ? new Date(target.lastChecked).toLocaleString() : 'Never'}
          </div>
          {target.status && (
            <div className={`text-[10px] mt-1 ${target.status.toLowerCase() === 'open' ? 'text-success font-semibold' : 'text-muted-foreground'}`}>
              Status: {target.status}
            </div>
          )}
        </div>
      ))}
      {(!targets || targets.length === 0) && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          No priority targets configured.
        </div>
      )}
    </div>
  );
}
