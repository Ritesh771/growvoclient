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
    console.log('Freelancer access function started')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log('Request body:', requestBody)

    const { action, codeId, repoIds } = requestBody
    console.log('Parsed:', { action, codeId: codeId?.substring(0, 8), repoIds })

    if (action === 'get-repositories') {
      console.log('Processing get-repositories for codeId:', codeId)

      if (!codeId) {
        console.log('No codeId provided')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Code ID is required'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      // Validate the code
      console.log('Validating code...')
      const { data: codeData, error: codeError } = await supabaseClient
        .from('project_codes')
        .select('created_by, is_active, expires_at')
        .eq('id', codeId)
        .single()

      console.log('Code query result:', { hasData: !!codeData, error: codeError?.message })

      if (codeError || !codeData) {
        console.log('Code validation failed')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid code'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      if (!codeData.is_active) {
        console.log('Code is not active')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Code is not active'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      if (new Date(codeData.expires_at) < new Date()) {
        console.log('Code has expired')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Code has expired'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      console.log('Code is valid, created_by:', codeData.created_by)

      // Get repositories
      console.log('Fetching repositories...')
      const { data: repoData, error: repoError } = await supabaseClient
        .from('github_repositories')
        .select('*')
        .eq('user_id', codeData.created_by)
        .order('created_at', { ascending: false })

      console.log('Repository query result:', { count: repoData?.length, error: repoError?.message })

      if (repoError) {
        console.log('Repository query failed')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to fetch repositories: ' + repoError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      // Get client name
      console.log('Fetching client profile...')
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('user_id', codeData.created_by)
        .single()

      console.log('Profile query result:', { hasData: !!profileData, error: profileError?.message })

      let clientName = `Client ${codeId.slice(-4)}`
      if (!profileError && profileData) {
        clientName = profileData.email.split('@')[0]
      }

      console.log('Final response:', { repoCount: repoData?.length, clientName })

      return new Response(
        JSON.stringify({
          success: true,
          repositories: repoData || [],
          clientName: clientName
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (action === 'get-commits') {
      console.log('Processing get-commits')

      if (!codeId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Code ID is required'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      if (!repoIds || !Array.isArray(repoIds) || repoIds.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Repository IDs are required'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      // Validate the code
      const { data: codeData, error: codeError } = await supabaseClient
        .from('project_codes')
        .select('created_by, is_active, expires_at')
        .eq('id', codeId)
        .single()

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid code'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      if (!codeData.is_active) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Code is not active'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      if (new Date(codeData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Code has expired'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      // Verify that all requested repositories belong to the code creator
      const { data: validRepos, error: repoCheckError } = await supabaseClient
        .from('github_repositories')
        .select('id')
        .eq('user_id', codeData.created_by)
        .in('id', repoIds)

      if (repoCheckError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Repository validation failed: ' + repoCheckError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      if (!validRepos || validRepos.length !== repoIds.length) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Access denied to one or more repositories'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      // Get commits for the validated repositories
      const { data: commitsData, error: commitsError } = await supabaseClient
        .from('github_commits')
        .select('commit_date, enhanced_category, author_name, repo_id')
        .in('repo_id', repoIds)
        .order('commit_date', { ascending: false })

      if (commitsError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to fetch commits: ' + commitsError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          commits: commitsData || []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log('Invalid action:', action)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid action'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error: ' + (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
