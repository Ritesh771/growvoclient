import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ProjectCode {
  id: string;
  code: string;
  created_by: string;
  generated_at: string;
  expires_at: string;
  is_active: boolean;
  used_count: number;
}

export const useProjectCodes = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<ProjectCode[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user's project codes
  const loadCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_codes')
        .select('*')
        .eq('created_by', user.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error: any) {
      console.error('Error loading codes:', error);
      toast({
        title: "Error loading codes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Generate new project code
  const generateCode = async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2); // 2 days from now

      const { data, error } = await supabase
        .from('project_codes')
        .insert({
          code,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Code Generated",
        description: `New tracking code: ${code}`,
      });

      return data;
    } catch (error: any) {
      console.error('Error generating code:', error);
      toast({
        title: "Error generating code",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Invalidate a specific code
  const invalidateCode = async (codeId: string) => {
    try {
      const { error } = await supabase
        .from('project_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (error) throw error;

      toast({
        title: "Code Invalidated",
        description: "Project code has been deactivated",
      });
    } catch (error: any) {
      console.error('Error invalidating code:', error);
      toast({
        title: "Error invalidating code",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Validate a code (for freelancers)
  const validateCode = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('project_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { valid: false, message: 'Invalid or expired code' };
        }
        throw error;
      }

      // Increment usage count
      await supabase
        .from('project_codes')
        .update({ used_count: data.used_count + 1 })
        .eq('id', data.id);

      return { valid: true, message: 'Code validated successfully', data };
    } catch (error: any) {
      console.error('Error validating code:', error);
      return { valid: false, message: error.message };
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    loadCodes();

    const channel = supabase
      .channel('project_codes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_codes',
          filter: `created_by=eq.${user.id}`
        },
        (payload) => {
          console.log('Project codes change:', payload);
          loadCodes(); // Reload codes on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getActiveCode = () => {
    const now = new Date();
    return codes.find(code => 
      code.is_active && 
      new Date(code.expires_at) > now
    );
  };

  return {
    codes,
    loading,
    activeCode: getActiveCode(),
    generateCode,
    invalidateCode,
    validateCode,
    loadCodes,
  };
};