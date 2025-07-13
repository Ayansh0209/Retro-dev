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

async function Gitdata(authHeader, repoPath) {
  if (!repoPath) {
    console.error(' Missing REPO_PATH in Gitdata');
    return 'Git context could not be fetched: Missing REPO_PATH';
  }

  const queryParam = `?repoPath=${encodeURIComponent(repoPath)}`;
  const baseURL = 'http://localhost:3000/git';

  const safeFetch = async (url) => {
    try {
      return await fetchJSON(url, authHeader);
    } catch (err) {
      console.warn(`⚠️ Failed to fetch ${url}:`, err.message);
      return null;
    }
  };

  const [
    branch,
    status,
    isClean,
    log,
    tracked,
    diff
  ] = await Promise.all([
    safeFetch(`${baseURL}/branch${queryParam}`),
    safeFetch(`${baseURL}/status${queryParam}`),
    safeFetch(`${baseURL}/is-clean${queryParam}`),
    safeFetch(`${baseURL}/log${queryParam}`),
    safeFetch(`${baseURL}/track-files${queryParam}`),
    safeFetch(`${baseURL}/diff${queryParam}`)
  ]);

  return `
Git Context:
Branch: ${branch?.current || 'Unknown'}
Clean Working Directory: ${isClean?.clean ?? 'Unknown'}
Status: ${status?.status ? JSON.stringify(status.status, null, 2) : 'Unavailable'}
Tracked Files: ${Array.isArray(tracked?.tracked) ? tracked.tracked.join(', ') : 'None'}
Recent Commits:\n${log?.all?.length ? log.all.map(l => `- ${l.message}`).join('\n') : 'No commits'}
Diff:\n${diff?.diff || 'No diff'}
`.trim();
}

async function GithubData(authHeader) {
  const baseURL = 'http://localhost:3000/github';
  const safeFetch = async (url) => {
    try {
      return await fetchJSON(url, authHeader);
    } catch (err) {
      console.warn(`⚠️ Failed to fetch ${url}:`, err.message);
      return null;
    }
  };

  const [user, notifications] = await Promise.all([
    safeFetch(`${baseURL}/user`),
    safeFetch(`${baseURL}/notifications`),
  ]);

  const userInfo = user ? `GitHub User: ${user.login} (${user.name || 'No name'})` : 'User info unavailable';

  const notifInfo = notifications?.notifications?.length
    ? notifications.notifications.map(n =>
      `🔔 ${n.subject.type} — ${n.subject.title} (${n.repository.full_name})`
    ).join('\n')
    : 'No notifications found.';

  return `
GitHub Context
${userInfo}

${notifInfo}

`.trim();
}



module.exports = { Gitdata ,GithubData};
