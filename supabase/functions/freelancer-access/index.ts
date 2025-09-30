import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, codeId } = await req.json()

    if (action === 'get-repositories') {
      if (!codeId) {
        throw new Error('Code ID is required')
      }

      // First, validate the code and get the creator
      const { data: codeData, error: codeError } = await supabaseClient
        .from('project_codes')
        .select('created_by, is_active, expires_at')
        .eq('id', codeId)
        .single()

      if (codeError || !codeData) {
        throw new Error('Invalid code')
      }

      if (!codeData.is_active) {
        throw new Error('Code is not active')
      }

      if (new Date(codeData.expires_at) < new Date()) {
        throw new Error('Code has expired')
      }

      // Get repositories for the code creator
      const { data: repoData, error: repoError } = await supabaseClient
        .from('github_repositories')
        .select('*')
        .eq('user_id', codeData.created_by)
        .order('created_at', { ascending: false })

      if (repoError) {
        throw repoError
      }

      return new Response(
        JSON.stringify({
          success: true,
          repositories: repoData || []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error in freelancer-access function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})