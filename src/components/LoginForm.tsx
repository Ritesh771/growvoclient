import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { LogIn, Shield, Zap, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LoginFormProps {
  onLogin: () => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const { signIn, signUp, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Auto-login if user is already authenticated
  useEffect(() => {
    if (user) {
      onLogin();
    }
  }, [user, onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if this is the admin trying to sign in with hardcoded credentials
      if (email === 'growvo@stalight.tech' && password === 'growvo@client') {
        // Try to sign in first
        const { error: signInError } = await signIn(email, password);
        
        if (signInError && signInError.message.includes('Invalid login credentials')) {
          // Admin account doesn't exist, create it
          const { error: signUpError } = await signUp(email, password);
          if (signUpError) {
            toast({
              title: "Account creation failed",
              description: signUpError.message,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          
          // Now sign in
          const { error: secondSignInError } = await signIn(email, password);
          if (secondSignInError) {
            toast({
              title: "Login failed",
              description: secondSignInError.message,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        } else if (signInError) {
          toast({
            title: "Login failed",
            description: signInError.message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: "Welcome to Growvo!",
          description: "Successfully logged into client portal",
        });
        return; // onLogin will be called via useEffect when user state updates
      }

      // Handle regular authentication
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account",
          });
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Authentication error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center mobile-optimized mesh-bg">
      <Card className="w-full max-w-md card-glass">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4 overflow-hidden">
              <img 
                src="/growvo.png" 
                alt="Growvo Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-heading gradient-text mb-2">
            {isSignUp ? 'Create Account' : 'Growvo Client Portal'}
          </CardTitle>
          <p className="text-muted-foreground text-sm md:text-base">
            {isSignUp 
              ? 'Create your account to manage project access codes'
              : 'Enter your credentials to manage project access codes'
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-border/50 focus:border-primary text-sm md:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50 border-border/50 focus:border-primary text-sm md:text-base"
              />
            </div>
            <Button
              type="submit"
              className="w-full btn-primary text-sm md:text-base py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Access Portal
                    </>
                  )}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
            >
              {isSignUp 
                ? 'Already have an account? Sign in'
                : 'Need an account? Sign up'
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};