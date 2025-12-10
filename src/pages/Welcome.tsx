import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 fade-in">
      <div className="text-center space-y-8 max-w-sm mx-auto">
        {/* Logo */}
        <div className="space-y-4">
          <h1 className="tastr-logo text-6xl mb-2">tastr.</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Discover, review, and share your favorite restaurants with friends
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 w-full">
          <Button 
            onClick={() => navigate("/signup")}
            className="btn-primary w-full text-lg py-3"
          >
            Get Started
          </Button>
          
          <Button 
            onClick={() => navigate("/login")}
            variant="outline"
            className="btn-secondary w-full text-lg py-3"
          >
            Sign In
          </Button>
        </div>

        {/* Footer */}
        <p className="text-muted-foreground text-sm mt-12">
          Join the community of food lovers
        </p>
      </div>
    </div>
  );
};

export default Welcome;