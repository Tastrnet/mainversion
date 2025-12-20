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
    <nav className="mobile-nav flex items-center justify-around px-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        if (item.isCenter) {
          // Perfectly round orange plus button - completely isolated and round
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path, { state: { fromMenu: true } })}
              className="text-white"
              style={{ 
                borderRadius: '50%',
                width: '3rem',
                height: '3rem',
                aspectRatio: '1 / 1',
                padding: 0,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(255, 109, 19, 0.25)',
                backgroundColor: 'hsl(20, 100%, 54%)',
                border: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                flexShrink: 0,
                flexGrow: 0,
                clipPath: 'circle(50% at 50% 50%)',
                WebkitClipPath: 'circle(50% at 50% 50%)'
              }}
            >
              <Icon size={20} style={{ display: 'block', flexShrink: 0 }} />
            </button>
          );
        }
        
        return (
          <Button
            key={item.path}
            onClick={() => {
              // Pass state to indicate navigation from menu
              navigate(item.path, { state: { fromMenu: true } });
            }}
            variant="ghost"
            size="icon"
            className={`rounded-full h-10 w-10 ${isActive ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
          >
            <Icon size={16} />
          </Button>
        );
      })}
    </nav>
  );
};

export default MobileNavigation;