import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, Clock, Eye, Activity, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProjectCode {
  id: string;
  code: string;
  expires_at: string;
  generated_at: string;
  used_count: number;
  is_active: boolean;
}

interface OTPVerification {
  id: string;
  code_id: string;
  freelancer_identifier: string;
  verified_at: string;
  verification_attempts: number;
}

interface CodeUsageData {
  code: ProjectCode;
  verifications: OTPVerification[];
  uniqueFreelancers: number;
  totalAccess: number;
  lastAccessed: string | null;
}

interface CodeUsageAnalyticsProps {
  codes: ProjectCode[];
}

export const CodeUsageAnalytics: React.FC<CodeUsageAnalyticsProps> = ({ codes }) => {
  const [usageData, setUsageData] = useState<CodeUsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalCodes: 0,
    totalFreelancers: 0,
    totalAccessAttempts: 0,
    activeCodes: 0
  });

  useEffect(() => {
    if (codes.length > 0) {
      loadUsageAnalytics();
    } else {
      setLoading(false);
    }
  }, [codes]);

  const loadUsageAnalytics = async () => {
    try {
      setLoading(true);
      const usageDataPromises = codes.map(async (code) => {
        const { data: verifications, error } = await supabase
          .from('otp_verifications')
          .select('*')
          .eq('code_id', code.id)
          .order('verified_at', { ascending: false });

        if (error) {
          console.error('Error loading verifications for code:', code.code, error);
          return {
            code,
            verifications: [],
            uniqueFreelancers: 0,
            totalAccess: 0,
            lastAccessed: null
          };
        }

        const uniqueFreelancers = new Set(
          verifications
            ?.filter(v => v.freelancer_identifier)
            .map(v => v.freelancer_identifier.toLowerCase().trim()) || []
        ).size;

        const totalAccess = verifications?.length || 0;
        const lastAccessed = verifications?.[0]?.verified_at || null;

        return {
          code,
          verifications: verifications || [],
          uniqueFreelancers,
          totalAccess,
          lastAccessed
        };
      });

      const resolvedUsageData = await Promise.all(usageDataPromises);
      setUsageData(resolvedUsageData);

      // Calculate total stats
      const stats = resolvedUsageData.reduce((acc, data) => {
        acc.totalCodes += 1;
        acc.totalFreelancers += data.uniqueFreelancers;
        acc.totalAccessAttempts += data.totalAccess;
        if (data.code.is_active && new Date(data.code.expires_at) > new Date()) {
          acc.activeCodes += 1;
        }
        return acc;
      }, {
        totalCodes: 0,
        totalFreelancers: 0,
        totalAccessAttempts: 0,
        activeCodes: 0
      });

      setTotalStats(stats);

    } catch (error) {
      console.error('Error loading usage analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load usage analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const getCodeStatus = (code: ProjectCode) => {
    if (!code.is_active) return { status: 'Expired', variant: 'destructive' as const };
    if (new Date(code.expires_at) <= new Date()) return { status: 'Expired', variant: 'destructive' as const };
    return { status: 'Active', variant: 'default' as const };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalStats.totalCodes}</p>
                  <p className="text-xs text-muted-foreground">Total Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-success" />
                <div>
                  <p className="text-2xl font-bold">{totalStats.totalFreelancers}</p>
                  <p className="text-xs text-muted-foreground">Unique Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{totalStats.totalAccessAttempts}</p>
                  <p className="text-xs text-muted-foreground">Total Access</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{totalStats.activeCodes}</p>
                  <p className="text-xs text-muted-foreground">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Code Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Code Usage Details
          </CardTitle>
          <CardDescription>
            Detailed breakdown of freelancer access for each project code
          </CardDescription>
      
        
          {usageData.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No usage data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {usageData.map((data, index) => (
                <motion.div
                  key={data.code.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4 space-y-4"
                >
                  {/* Code Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <span className="font-mono font-bold text-primary text-lg">
                          {data.code.code}
                        </span>
                      </div>
                      <div>
                        <Badge {...getCodeStatus(data.code)}>
                          {getCodeStatus(data.code).status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Generated: {formatDate(data.code.generated_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires: {formatDate(data.code.expires_at)}
                      </div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{data.uniqueFreelancers}</p>
                      <p className="text-xs text-muted-foreground">Unique Freelancers</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-success">{data.totalAccess}</p>
                      <p className="text-xs text-muted-foreground">Total Access</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-accent">{data.code.used_count}</p>
                      <p className="text-xs text-muted-foreground">Code Uses</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium text-warning">
                        {data.lastAccessed ? 'Recently Used' : 'Never Used'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(data.lastAccessed)}
                      </p>
                    </div>
                  </div>

                  {/* Freelancer List */}
                  {data.verifications.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Freelancer Access History
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {data.verifications.map((verification, vIndex) => (
                          <motion.div
                            key={verification.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: vIndex * 0.05 }}
                            className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(verification.freelancer_identifier || 'Anonymous')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {verification.freelancer_identifier || 'Anonymous'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Accessed: {formatDate(verification.verified_at)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">
                                Access #{vIndex + 1}
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.verifications.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No freelancer access yet</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>
    </div>
  );
};