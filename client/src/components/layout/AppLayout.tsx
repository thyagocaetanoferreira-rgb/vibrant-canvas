import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const AppLayout = () => {
  const { sidebarCollapsed } = useAppContext();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <TopBar />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "ml-[68px]" : "ml-[240px]"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
