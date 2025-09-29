import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, repoUrl, repoId } = await req.json();

    if (action === 'add-repository') {
      return await addRepository(supabaseClient, user.id, repoUrl);
    } else if (action === 'fetch-commits') {
      return await fetchCommits(supabaseClient, repoId);
    } else if (action === 'get-repositories') {
      return await getRepositories(supabaseClient, user.id);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in github-integration function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function addRepository(supabaseClient: any, userId: string, repoUrl: string) {
  try {
    // Extract owner and repo from URL
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = urlMatch;
    const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git if present

    // Check if repository already exists
    const { data: existingRepo } = await supabaseClient
      .from('github_repositories')
      .select('id')
      .eq('user_id', userId)
      .eq('owner', owner)
      .eq('repo', cleanRepo)
      .single();

    if (existingRepo) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Repository already exists',
        repoId: existingRepo.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add repository to database
    const { data: newRepo, error } = await supabaseClient
      .from('github_repositories')
      .insert({
        user_id: userId,
        owner,
        repo: cleanRepo,
        repo_url: repoUrl,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Repository added successfully',
      repoId: newRepo.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error adding repository:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function fetchCommits(supabaseClient: any, repoId: string) {
  try {
    // Get repository details
    const { data: repo, error: repoError } = await supabaseClient
      .from('github_repositories')
      .select('owner, repo')
      .eq('id', repoId)
      .single();

    if (repoError || !repo) {
      throw new Error('Repository not found');
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    // Fetch commits from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits?per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Supabase-Function',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const commits = await response.json();

    // Process and store commits
    const processedCommits = [];
    for (const commit of commits) {
      const category = categorizeCommit(commit.commit.message);
      
      const commitData = {
        repo_id: repoId,
        sha: commit.sha,
        message: commit.commit.message,
        author_name: commit.commit.author.name,
        author_email: commit.commit.author.email,
        commit_date: commit.commit.author.date,
        enhanced_category: category,
      };

      // Insert or update commit
      const { error } = await supabaseClient
        .from('github_commits')
        .upsert(commitData, {
          onConflict: 'repo_id,sha',
          ignoreDuplicates: false,
        });

      if (!error) {
        processedCommits.push(commitData);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${processedCommits.length} commits`,
      commits: processedCommits 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching commits:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function getRepositories(supabaseClient: any, userId: string) {
  try {
    const { data: repositories, error } = await supabaseClient
      .from('github_repositories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      repositories 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error getting repositories:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

function categorizeCommit(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('patch')) {
    return 'Bugfix';
  } else if (lowerMessage.includes('feat') || lowerMessage.includes('add') || lowerMessage.includes('new')) {
    return 'Feature';
  } else if (lowerMessage.includes('doc') || lowerMessage.includes('readme')) {
    return 'Documentation';
  } else if (lowerMessage.includes('refactor') || lowerMessage.includes('cleanup') || lowerMessage.includes('improve')) {
    return 'Refactor';
  } else if (lowerMessage.includes('test') || lowerMessage.includes('spec')) {
    return 'Test';
  } else if (lowerMessage.includes('style') || lowerMessage.includes('format')) {
    return 'Style';
  } else if (lowerMessage.includes('chore') || lowerMessage.includes('update') || lowerMessage.includes('bump')) {
    return 'Chore';
  } else {
    return 'Other';
  }
}