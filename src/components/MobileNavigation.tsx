import { useNavigate, useLocation } from "react-router-dom";
import { Users, User, Plus, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const MobileNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/start", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/log", icon: Plus, label: "Log", isCenter: true },
    { path: "/friends", icon: Users, label: "Friends" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="mobile-nav flex items-center justify-around py-2 px-1 z-50">
      {/* Logo in center */}
      <div className="absolute left-1/2 top-2 transform -translate-x-1/2 bg-primary rounded-full p-2 shadow-lg">
        <div className="tastr-logo text-white text-xs font-bold">tastr.</div>
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Button
            key={item.path}
            onClick={() => {
              // Pass state to indicate navigation from menu
              navigate(item.path, { state: { fromMenu: true } });
            }}
            variant="ghost"
            size="icon"
            className={`
              flex flex-col items-center justify-center rounded-full h-10 w-10
              ${isActive ? "text-primary bg-primary/10" : "text-muted-foreground"}
              ${item.isCenter ? "bg-primary text-white shadow-orange scale-110" : ""}
            `}
          >
            <Icon size={item.isCenter ? 20 : 16} />
          </Button>
        );
      })}
    </nav>
  );
};

export default MobileNavigation;