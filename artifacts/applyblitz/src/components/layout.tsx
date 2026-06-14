import { Sidebar } from "@/components/sidebar";
import { StatsBar } from "@/components/stats-bar";
import { LogViewer } from "@/components/log-viewer";
import { OnboardingModal } from "@/components/onboarding-modal";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative">
        <StatsBar />
        <main className="flex-1 overflow-y-auto pb-10">
          {children}
        </main>
        <LogViewer />
      </div>
      <OnboardingModal />
    </div>
  );
}
