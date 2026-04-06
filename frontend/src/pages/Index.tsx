import { DashboardLayout } from "@/components/DashboardLayout";
import { SoundCard } from "@/components/real-time-cards/SoundCard";
import { LayoutDashboard } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout title="Dashboard">
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-8 w-8 text-primary/60" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Your dashboard is ready</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add widgets, charts, and metrics to get started with your analytics overview.
            </p>
            <div>
        
        <SoundCard
          sound={70}           // temporary static value
          history={[20, 30, 40, 45]} // mock data
          min={20}
          max={45}
        />

      </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
