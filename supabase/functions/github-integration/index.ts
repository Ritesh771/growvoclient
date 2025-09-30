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

    console.log('GitHub Integration Function - Action:', action, 'RepoId:', repoId, 'UserId:', user.id);

    if (action === 'add-repository') {
      return await addRepository(supabaseClient, user.id, repoUrl);
    } else if (action === 'fetch-commits') {
      return await fetchCommits(supabaseClient, repoId);
    } else if (action === 'get-repositories') {
      return await getRepositories(supabaseClient, user.id);
    } else if (action === 'delete-repository') {
      if (!repoId) {
        return new Response(JSON.stringify({ error: 'Repository ID is required for delete action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return await deleteRepository(supabaseClient, user.id, repoId);
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
    // Get repository details including cache metadata
    const { data: repo, error: repoError } = await supabaseClient
      .from('github_repositories')
      .select('owner, repo, last_fetched_at, last_commit_sha, fetch_status, fetch_count')
      .eq('id', repoId)
      .single();

    if (repoError || !repo) {
      throw new Error('Repository not found');
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    // Check cache validity and rate limiting
    const now = new Date();
    const lastFetched = repo.last_fetched_at ? new Date(repo.last_fetched_at) : null;
    const timeSinceLastFetch = lastFetched ? (now.getTime() - lastFetched.getTime()) / 1000 / 60 : null; // minutes

    // Rate limiting: minimum 5 minutes between fetches
    const MIN_FETCH_INTERVAL_MINUTES = 5;
    if (timeSinceLastFetch !== null && timeSinceLastFetch < MIN_FETCH_INTERVAL_MINUTES) {
      const remainingMinutes = Math.ceil(MIN_FETCH_INTERVAL_MINUTES - timeSinceLastFetch);
      return new Response(JSON.stringify({
        success: false,
        error: `Rate limited. Please wait ${remainingMinutes} minutes before fetching again.`,
        rateLimited: true,
        nextFetchAt: new Date(now.getTime() + remainingMinutes * 60 * 1000).toISOString(),
        lastFetchedAt: repo.last_fetched_at,
        fetchStatus: 'rate_limited'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine fetch strategy
    let apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits?per_page=100`;
    let isIncremental = false;

    if (repo.last_commit_sha && repo.fetch_status === 'success') {
      // Incremental fetch: only get commits newer than the last stored commit
      apiUrl += `&sha=${repo.last_commit_sha}`;
      isIncremental = true;
      console.log('Performing incremental fetch for commits newer than:', repo.last_commit_sha);
    }

    console.log('Fetching commits from:', apiUrl);

    // Fetch commits from GitHub API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Function',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitHub API error: ${response.status} - ${errorText}`;

      // Handle rate limiting from GitHub
      if (response.status === 403) {
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        if (rateLimitReset) {
          const resetTime = new Date(parseInt(rateLimitReset) * 1000);
          errorMessage = `GitHub API rate limit exceeded. Resets at ${resetTime.toISOString()}`;
        }
      }

      // Update repository with error status
      await supabaseClient
        .from('github_repositories')
        .update({
          fetch_status: 'error',
          last_error_message: errorMessage,
          updated_at: now.toISOString()
        })
        .eq('id', repoId);

      throw new Error(errorMessage);
    }

    const commits = await response.json();
    console.log(`Fetched ${commits.length} commits from GitHub API`);

    // Process and store commits
    const processedCommits = [];
    let latestCommitSha = repo.last_commit_sha;

    for (const commit of commits) {
      // Skip commits we've already processed (for incremental fetches)
      if (isIncremental && commit.sha === repo.last_commit_sha) {
        continue;
      }

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
        // Track the latest commit SHA (first commit in array is most recent)
        if (!latestCommitSha || commits.indexOf(commit) === 0) {
          latestCommitSha = commit.sha;
        }
      }
    }

    // Update repository cache metadata
    const updateData: any = {
      last_fetched_at: now.toISOString(),
      fetch_status: 'success',
      last_error_message: null,
      fetch_count: (repo.fetch_count || 0) + 1,
      updated_at: now.toISOString()
    };

    // Update last_commit_sha if we found newer commits
    if (latestCommitSha && latestCommitSha !== repo.last_commit_sha) {
      updateData.last_commit_sha = latestCommitSha;
    }

    await supabaseClient
      .from('github_repositories')
      .update(updateData)
      .eq('id', repoId);

    const fetchType = isIncremental ? 'incremental' : 'full';
    const message = isIncremental
      ? `Processed ${processedCommits.length} new commits (incremental update)`
      : `Processed ${processedCommits.length} commits (full fetch)`;

    return new Response(JSON.stringify({
      success: true,
      message,
      commits: processedCommits,
      fetchType,
      isIncremental,
      lastFetchedAt: now.toISOString(),
      newCommitsCount: processedCommits.length,
      totalCommitsInRepo: await getCommitCount(supabaseClient, repoId)
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
      .select('id, user_id, owner, repo, repo_url, created_at, updated_at, last_fetched_at, last_commit_sha, fetch_status, last_error_message, fetch_count')
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

async function deleteRepository(supabaseClient: any, userId: string, repoId: string) {
  try {
    console.log('Delete Repository - UserId:', userId, 'RepoId:', repoId);
    
    // First verify the repository belongs to the user
    const { data: repo, error: fetchError } = await supabaseClient
      .from('github_repositories')
      .select('id, owner, repo')
      .eq('id', repoId)
      .eq('user_id', userId)
      .single();

    console.log('Repository fetch result:', { repo, fetchError });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error(`Failed to fetch repository: ${fetchError.message}`);
    }
    
    if (!repo) {
      throw new Error('Repository not found or access denied');
    }

    // Delete the repository (cascading delete will handle commits)
    const { error: deleteError } = await supabaseClient
      .from('github_repositories')
      .delete()
      .eq('id', repoId)
      .eq('user_id', userId);

    console.log('Delete operation result:', { deleteError });

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete repository: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Repository ${repo.owner}/${repo.repo} deleted successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting repository:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
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

async function getCommitCount(supabaseClient: any, repoId: string): Promise<number> {
  try {
    const { count, error } = await supabaseClient
      .from('github_commits')
      .select('*', { count: 'exact', head: true })
      .eq('repo_id', repoId);

    if (error) {
      console.error('Error counting commits:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getCommitCount:', error);
    return 0;
  }
}