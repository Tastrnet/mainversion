import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Automatically redirect signed-in users to start page after delay
    if (user) {
      const timeoutId = setTimeout(() => {
        navigate("/start");
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-6 max-w-sm mx-auto">
        <h1 className="tastr-logo text-6xl mb-4">tastr.</h1>
        <div className="space-y-3">
          <h2 className="text-2xl font-medium">Page not found</h2>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
