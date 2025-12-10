import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const validatePassword = (password: string) => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,./`~]/.test(password);
  
  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasDigit,
    hasSymbol,
    isValid: minLength && hasUppercase && hasLowercase && hasDigit && hasSymbol
  };
};

const SignUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Error",
        description: "Password does not meet security requirements",
        variant: "destructive"
      });
      return;
    }

    if (fullName.length < 1) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive"
      });
      return;
    }

    if (username.length < 3 || username.length > 15) {
      toast({
        title: "Error", 
        description: "Username must be between 3 and 15 characters",
        variant: "destructive"
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Error",
        description: "You must agree to the Terms of Service and Privacy Policy",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await signUp(email, password, { 
        username, 
        full_name: fullName,
        app_context: 'main_app'
      });
      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive"
        });
      } else {
        // Navigate to login page after successful signup
        navigate("/login");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Button onClick={() => navigate("/")} variant="ghost" size="icon" className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="tastr-logo text-2xl ml-4 text-orange-500">tastr.</h1>
      </div>

      {/* Sign Up Form */}
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-orange-500">Join tastr.</CardTitle>
            <CardDescription>
              Create your account to start discovering great restaurants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  type="text" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                  className="rounded-xl" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="username">Username</Label>
                  <span className="text-xs text-muted-foreground">{username.length}/15</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">@</span>
                  <Input 
                    id="username" 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
                    required 
                    minLength={3}
                    maxLength={15}
                    className="rounded-xl pl-8" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="rounded-xl" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  minLength={8}
                  className="rounded-xl" 
                />
                {password && (
                  <div className="text-xs space-y-1 mt-2">
                    <div className={`flex items-center gap-1 ${validatePassword(password).minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {validatePassword(password).minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1 ${validatePassword(password).hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {validatePassword(password).hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1 ${validatePassword(password).hasLowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {validatePassword(password).hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1 ${validatePassword(password).hasDigit ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {validatePassword(password).hasDigit ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>One digit</span>
                    </div>
                    <div className={`flex items-center gap-1 ${validatePassword(password).hasSymbol ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {validatePassword(password).hasSymbol ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>One symbol (!@#$%^&*...)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-tight cursor-pointer"
                >
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>


            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;