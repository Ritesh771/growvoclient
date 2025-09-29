import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitHubDashboard } from './GitHubDashboard';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, User, Clock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FreelancerDashboardProps {
  codeId: string;
  onBack: () => void;
}

interface ProjectCode {
  id: string;
  code: string;
  expires_at: string;
  created_by: string;
  is_active: boolean;
  used_count: number;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

interface OTPVerification {
  freelancer_identifier: string;
  verified_at: string;
  code_id: string;
  verification_attempts: number;
}

export const FreelancerDashboard: React.FC<FreelancerDashboardProps> = ({ 
  codeId, 
  onBack 
}) => {
  const [projectCode, setProjectCode] = useState<ProjectCode | null>(null);
  const [verification, setVerification] = useState<OTPVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    loadProjectData();
  }, [codeId]);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (projectCode) {
        const now = new Date();
        const expiresAt = new Date(projectCode.expires_at);
        const timeRemaining = expiresAt.getTime() - now.getTime();
        
        if (timeRemaining <= 0) {
          setTimeLeft('Expired');
          toast({
            title: "Session Expired",
            description: "Your access has expired. Please request a new code.",
            variant: "destructive",
          });
          setTimeout(() => onBack(), 3000);
          return;
        }

        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [projectCode, onBack]);

  const loadProjectData = async () => {
    try {
      // Load project code details
      const { data: codeData, error: codeError } = await supabase
        .from('project_codes')
        .select('*')
        .eq('id', codeId)
        .single();

      if (codeError || !codeData) {
        toast({
          title: "Error",
          description: "Failed to load project details",
          variant: "destructive",
        });
        onBack();
        return;
      }

      setProjectCode(codeData as ProjectCode);

      // Load verification details
      const { data: verificationData, error: verificationError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('code_id', codeId)
        .order('verified_at', { ascending: false })
        .limit(1)
        .single();

      if (!verificationError && verificationData) {
        setVerification(verificationData);
      }

    } catch (error) {
      console.error('Error loading project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg">
      <div className="container mx-auto mobile-optimized py-6 max-w-7xl">
        {/* Header */}
        <Card className="card-glass mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onBack}
                  className="p-2 hover:bg-primary/10 transition-colors hover-scale"
                >
                  <ArrowLeft className="h-5 w-5 text-primary" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl md:text-2xl font-heading">
                    <Shield className="h-6 w-6 text-primary" />
                    Freelancer Project Dashboard
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Access granted for project resources and GitHub integration
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 text-sm">
                {verification && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success">
                    <User className="h-4 w-4" />
                    <span>{verification.freelancer_identifier}</span>
                  </div>
                )}
                {projectCode && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                    <span>Expires: {timeLeft}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Session Info */}
        <Card className="card-glass mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Project Code:</span>
                <p className="font-mono font-bold text-primary">
                  {projectCode?.code}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Access Granted:</span>
                <p className="font-medium">
                  {verification ? formatDate(verification.verified_at) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Session Expires:</span>
                <p className="font-medium">
                  {projectCode ? formatDate(projectCode.expires_at) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GitHub Dashboard */}
        <div className="space-y-6">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-xl font-heading">
                Project Repository Access
              </CardTitle>
              <CardDescription>
                View and analyze the project's GitHub repository data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/20 border border-muted/30">
                <GitHubDashboard />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};