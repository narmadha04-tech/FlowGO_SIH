import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { login, register, verifyAccount, resendVerificationCode } from "@/lib/auth";

const AuthorityLogin = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authorityId, setAuthorityId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingAuthorityId, setPendingAuthorityId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login
      try {
        const result = await login({ authority_id: authorityId, password });
        toast.success("Login successful!");
        navigate("/authority/dashboard");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Login failed");
      }
    } else {
      // Register
      try {
        const result = await register({
          authority_id: authorityId,
          name,
          email: email || undefined,
          password,
        });
        toast.success("Registration successful! Please verify your account.");
        setPendingAuthorityId(authorityId);
        setIsVerifying(true);
        // Show verification code (in production, this would be sent via email/SMS)
        toast.info(`Verification code: ${result.verification_code}`, { duration: 10000 });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Registration failed");
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyAccount({
        authority_id: pendingAuthorityId,
        verification_code: verificationCode,
      });
      toast.success("Account verified! You can now login.");
      setIsVerifying(false);
      setIsLogin(true);
      setVerificationCode("");
      setPendingAuthorityId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    }
  };

  const handleResendCode = async () => {
    try {
      const result = await resendVerificationCode(pendingAuthorityId);
      toast.success("Verification code resent!");
      toast.info(`New verification code: ${result.verification_code}`, { duration: 10000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend code");
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
        <Card className="w-full max-w-md p-8 bg-card border-border">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-rajdhani font-bold text-foreground mb-2">
              Verify Your Account
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter the verification code sent to your email
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-foreground">Verification Code</Label>
              <Input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="bg-secondary border-border focus:border-primary"
                maxLength={6}
              />
            </div>

            <Button 
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-rajdhani font-semibold text-lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify Account
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleResendCode}
              className="text-primary hover:underline text-sm"
            >
              Resend verification code
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsVerifying(false);
                setIsLogin(true);
              }}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Back to login
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="p-8 bg-card border-border">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
              {isLogin ? "FlowGo Authority Login" : "Create FlowGo Account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to access the FlowGo traffic control dashboard"
                : "Register for authority access to FlowGo traffic management system"}
            </p>
            <div className="mt-2">
              <span className="text-xs text-primary font-semibold">FlowGo Team</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-secondary border-border focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-secondary border-border focus:border-primary"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="authorityId" className="text-foreground">Authority ID</Label>
              <Input
                id="authorityId"
                type="text"
                value={authorityId}
                onChange={(e) => setAuthorityId(e.target.value)}
                placeholder="Enter your authority ID"
                className="bg-secondary border-border focus:border-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-secondary border-border focus:border-primary"
                required
                minLength={6}
              />
            </div>

            <Button 
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-rajdhani font-semibold text-lg glow-primary"
            >
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline text-sm"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthorityLogin;
