async function fetchJSON(url, authHeader) {
  const res = await fetch(url, {
    headers: {
      'Authorization': authHeader,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch failed: ${res.status} - ${text}`);
  }

  return res.json();
}

async function Gitdata(authHeader) {
  const repoPath = process.env.REPO_PATH; 
  if (!repoPath) {
    console.error(' Missing REPO_PATH in environment');
    return 'Git context could not be fetched: Missing REPO_PATH';
  }

  const queryParam = `?repoPath=${encodeURIComponent(repoPath)}`;
  const baseURL = 'http://localhost:3000/git';

  try {
    const [branch, status, isClean, log, tracked, diff] = await Promise.all([
      fetchJSON(`${baseURL}/branch${queryParam}`, authHeader),
      fetchJSON(`${baseURL}/status${queryParam}`, authHeader),
      fetchJSON(`${baseURL}/is-clean${queryParam}`, authHeader),
      fetchJSON(`${baseURL}/log${queryParam}`, authHeader),
      fetchJSON(`${baseURL}/track-files${queryParam}`, authHeader),
      fetchJSON(`${baseURL}/diff${queryParam}`, authHeader),
    ]);

    return `
Git Context:
Branch: ${branch.current}
Clean Working Directory: ${isClean.clean}
Status: ${JSON.stringify(status.status, null, 2)}
Tracked Files: ${Array.isArray(tracked.tracked) ? tracked.tracked.join(', ') : 'None'}
Recent Commits:\n${log.all && log.all.length ? log.all.map(l => `- ${l.message}`).join('\n') : 'No commits'}
Diff:\n${diff.diff || 'No diff'}
    `.trim();
  } catch (err) {
    console.error('Error building Git context:', err.message);
    return 'Git context could not be fetched.';
  }
}

module.exports = { Gitdata };
