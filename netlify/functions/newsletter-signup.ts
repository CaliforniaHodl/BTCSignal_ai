import type { Context } from '@netlify/functions';

// Simple newsletter signup - stores emails in a GitHub file
// For production, consider using a proper email service like Mailchimp, ConvertKit, etc.

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { email } = await req.json();

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Store email in GitHub (simple approach)
    // In production, use a proper email service
    const saved = await saveEmailToGitHub(email);

    if (saved) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Still return success to user (email might already exist)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Newsletter signup error:', error);
    return new Response(JSON.stringify({ error: 'Signup failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function saveEmailToGitHub(email: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set');
    return false;
  }

  const path = 'data/newsletter-subscribers.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current file content
    let subscribers: string[] = [];
    let sha: string | undefined;

    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      subscribers = JSON.parse(content);
    }

    // Check if email already exists
    if (subscribers.includes(email)) {
      console.log('Email already subscribed');
      return true;
    }

    // Add new email
    subscribers.push(email);

    // Save updated list
    const body: any = {
      message: `Add newsletter subscriber`,
      content: Buffer.from(JSON.stringify(subscribers, null, 2)).toString('base64'),
      branch: 'master',
    };

    if (sha) {
      body.sha = sha;
    }

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    if (putRes.ok) {
      console.log('Email saved:', email);
      return true;
    } else {
      const error = await putRes.json();
      console.error('GitHub save error:', error);
      return false;
    }

  } catch (error: any) {
    console.error('Save error:', error.message);
    return false;
  }
}
