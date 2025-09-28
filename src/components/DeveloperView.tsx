import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Code, Unlock, Users, Zap } from 'lucide-react';
import { useProjectCodes } from '@/hooks/useProjectCodes';

export const DeveloperView = () => {
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<'success' | 'failure' | null>(null);
  const { validateCode } = useProjectCodes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationResult(null);

    try {
      const result = await validateCode(otpCode.trim());
      
      if (result.valid) {
        setValidationResult('success');
        toast({
          title: "Project Unlocked!",
          description: "Welcome to the project workspace",
        });
      } else {
        setValidationResult('failure');
        toast({
          title: "Validation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setValidationResult('failure');
      toast({
        title: "Validation Error",
        description: "Could not validate the code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(value);
    setValidationResult(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center mobile-optimized mesh-bg">
      <Card className="w-full max-w-md card-glass">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-heading gradient-accent mb-2">
            Freelancer Access
          </CardTitle>
          <p className="text-muted-foreground text-sm md:text-base">
            Enter your 6-digit project code to access client resources
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="otp" className="text-sm font-medium">Project Access Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={handleInputChange}
                required
                className="text-center text-2xl md:text-3xl font-mono tracking-[0.5em] bg-background/50 border-border/50 focus:border-accent py-4"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code provided by your client
              </p>
            </div>

            <Button
              type="submit"
              className="w-full btn-secondary text-sm md:text-base py-3"
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock Project
                </>
              )}
            </Button>
          </form>

          {/* Validation Result */}
          {validationResult && (
            <div className="pt-4 border-t border-border/50">
              {validationResult === 'success' ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle className="h-6 w-6 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-success text-sm md:text-base">Project unlocked successfully!</p>
                    <p className="text-sm text-success/80 mt-1">You now have access to all project resources and files</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <XCircle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive text-sm md:text-base">Access denied</p>
                    <p className="text-sm text-destructive/80 mt-1">Invalid or expired code. Please check with your client for a new code</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-border/50">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-medium">Growvo Freelancer Platform</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Need a project code? Contact your client or project manager
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};