import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Shield, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface FreelancerAccessProps {
  onAccessGranted: (codeId: string, freelancerName?: string) => void;
}

interface VerificationResult {
  success: boolean;
  message: string;
  codeId?: string;
}

export const FreelancerAccess = ({ onAccessGranted }: FreelancerAccessProps) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState<VerificationResult | null>(null);
  const [freelancerName, setFreelancerName] = useState('');

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    if (!freelancerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if code exists and is active
      const { data: codeData, error: codeError } = await supabase
        .from('project_codes')
        .select('*')
        .eq('code', otp)
        .eq('is_active', true)
        .single();

      if (codeError || !codeData) {
        setShowResult({
          success: false,
          message: "Invalid or expired code"
        });
        setIsLoading(false);
        return;
      }

      // Check if code is expired
      const now = new Date();
      const expiresAt = new Date(codeData.expires_at);
      
      if (expiresAt <= now) {
        setShowResult({
          success: false,
          message: "Code has expired"
        });
        setIsLoading(false);
        return;
      }

      // Create OTP verification record
      const { data: verificationData, error: verificationError } = await supabase
        .from('otp_verifications')
        .insert({
          code_id: codeData.id,
          freelancer_identifier: freelancerName.trim(),
          verified_at: new Date().toISOString(),
          verification_attempts: 1
        })
        .select()
        .single();

      if (verificationError) {
        console.error('Verification error:', verificationError);
        // Try to update existing record instead
        const { data: existingRecord } = await supabase
          .from('otp_verifications')
          .select('verification_attempts')
          .eq('code_id', codeData.id)
          .eq('freelancer_identifier', freelancerName.trim())
          .single();
        
        const { error: updateError } = await supabase
          .from('otp_verifications')
          .update({
            verified_at: new Date().toISOString(),
            verification_attempts: (existingRecord?.verification_attempts || 0) + 1
          })
          .eq('code_id', codeData.id)
          .eq('freelancer_identifier', freelancerName.trim());
        
        if (updateError) {
          console.error('Update verification error:', updateError);
          setShowResult({
            success: false,
            message: "Verification failed. Please try again."
          });
          setIsLoading(false);
          return;
        }
      }

      // Update code usage count
      await supabase
        .from('project_codes')
        .update({ 
          used_count: (codeData.used_count || 0) + 1 
        })
        .eq('id', codeData.id);

      setShowResult({
        success: true,
        message: `Welcome ${freelancerName}! Access granted.`,
        codeId: codeData.id
      });

      // Auto-proceed after showing success animation
      setTimeout(() => {
        onAccessGranted(codeData.id, freelancerName.trim());
      }, 2500);

    } catch (error) {
      console.error('OTP verification error:', error);
      setShowResult({
        success: false,
        message: "An error occurred. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setOtp('');
    setFreelancerName('');
    setShowResult(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg p-4">
      <Card className="w-full max-w-md card-glass">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <motion.div 
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-4"
              animate={{ 
                scale: showResult?.success ? [1, 1.2, 1] : 1,
                rotate: showResult?.success ? [0, 10, -10, 0] : 0
              }}
              transition={{ duration: 0.6 }}
            >
              <Shield className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </motion.div>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-heading gradient-text mb-2">
            Freelancer Access
          </CardTitle>
          <p className="text-muted-foreground text-sm md:text-base">
            Enter the 6-digit code provided by your client
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="freelancer-name" className="text-sm font-medium">
                    Your Name
                  </Label>
                  <Select value={freelancerName} onValueChange={setFreelancerName} disabled={isLoading}>
                    <SelectTrigger className="bg-background/50 border-border/50 focus:border-accent text-sm md:text-base">
                      <SelectValue placeholder="Select your name" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ritesh N">Ritesh N</SelectItem>
                      <SelectItem value="Pannaga JA">Pannaga JA</SelectItem>
                      <SelectItem value="Shashank GS">Shashank GS</SelectItem>
                      <SelectItem value="Ruthu Parinika">Ruthu Parinika</SelectItem>
                      <SelectItem value="Praveen V">Praveen V</SelectItem>
                      <SelectItem value="Vignesh SD">Vignesh SD</SelectItem>
                      <SelectItem value="Raghuveer P">Raghuveer P</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium">
                    6-Digit Access Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={handleOTPChange}
                    className="bg-background/50 border-border/50 focus:border-accent text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit code from your client
                  </p>
                </div>

                <Button
                  onClick={verifyOTP}
                  className="w-full btn-secondary text-sm md:text-base py-3"
                  disabled={isLoading || otp.length !== 6 || !freelancerName.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Verify Access
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className={`mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center ${
                    showResult.success 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-red-500/20 text-red-500'
                  }`}
                >
                  {showResult.success ? (
                    <CheckCircle className="h-10 w-10" />
                  ) : (
                    <XCircle className="h-10 w-10" />
                  )}
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`text-xl font-semibold mb-2 ${
                    showResult.success ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {showResult.success ? 'Access Granted!' : 'Access Denied'}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-muted-foreground mb-6"
                >
                  {showResult.message}
                </motion.p>

                {!showResult.success && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="hover-scale"
                    >
                      Try Again
                    </Button>
                  </motion.div>
                )}

                {showResult.success && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-sm text-muted-foreground"
                  >
                    Redirecting to project dashboard...
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};