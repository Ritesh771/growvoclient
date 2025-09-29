import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecentAccessItem {
  id: string;
  freelancer_identifier: string;
  verified_at: string;
  code: string;
}

interface RecentActivityProps {
  codes: Array<{ id: string; code: string }>;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ codes }) => {
  const [recentAccess, setRecentAccess] = useState<RecentAccessItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, [codes]);

  const loadRecentActivity = async () => {
    try {
      if (codes.length === 0) {
        setRecentAccess([]);
        setLoading(false);
        return;
      }

      const codeIds = codes.map(code => code.id);
      const { data: verifications } = await supabase
        .from('otp_verifications')
        .select('id, freelancer_identifier, verified_at, code_id')
        .in('code_id', codeIds)
        .order('verified_at', { ascending: false })
        .limit(10);

      if (verifications) {
        // Map with code information
        const enrichedData = verifications.map(verification => ({
          ...verification,
          code: codes.find(code => code.id === verification.code_id)?.code || 'Unknown'
        }));
        
        setRecentAccess(enrichedData);
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const accessTime = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - accessTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="card-glass">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-heading">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentAccess.length === 0 ? (
          <div className="text-center py-6">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent freelancer access</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAccess.slice(0, 5).map((access, index) => (
              <motion.div
                key={access.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(access.freelancer_identifier || 'Anonymous')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {access.freelancer_identifier || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Used code: {access.code}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimeAgo(access.verified_at)}
                  </Badge>
                </div>
              </motion.div>
            ))}
            
            {recentAccess.length > 5 && (
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Showing 5 of {recentAccess.length} recent activities
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};