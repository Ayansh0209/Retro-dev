const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyTok');
const { summarizeGithubContext } = require('../services/googleai'); 
const { GithubData } = require('../utils/helper');
const admin = require('../services/admin'); 
const { chunkNotificationsByTime, filterPriorityNotifications } = require('../Time-chunking/Timechunker');

require('dotenv').config;

async function getOctokit(req) {
  const { Octokit } = await import('@octokit/rest');
  const token = req.headers['github-token'] || req.headers['authorization']?.replace('Bearer ', '') || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Missing GitHub token");
  return new Octokit({ auth: token });
}

router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const octokit = await getOctokit(req);

    const { data } = await octokit.activity.listNotificationsForAuthenticatedUser({
      all: true,
      per_page: 100,
    });

    res.json({ notifications: data });
  } catch (error) {
    console.error("GitHub API error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/user', verifyToken, async (req, res) => {
  try {
    const octokit = await getOctokit(req);
    const { data } = await octokit.rest.users.getAuthenticated();
    res.json({ user: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/notifications/mark-read', verifyToken, async (req, res) => {
  try {
    const octokit = await getOctokit(req);
    await octokit.rest.activity.markNotificationsAsRead();
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//   Mark specific notification thread as read
router.post('/notifications/mark-thread', verifyToken, async (req, res) => {
  try {
    const { threadId } = req.body;
    const octokit = await getOctokit(req);

    if (!threadId) {
      return res.status(400).json({ error: "Missing threadId" });
    }

    await octokit.rest.activity.markThreadAsRead({ thread_id: threadId });
    res.json({ message: `Notification ${threadId} marked as read` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/discussions/reply', verifyToken, async (req, res) => {
  try {
    const { owner, repo, issue_number, body } = req.body;
    const octokit = await getOctokit(req);

    if (!owner || !repo || !issue_number || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    //   Optional safety check: prevent AI from posting long or risky messages
    if (body.length > 1000 || /auto|spam/i.test(body)) {
      return res.status(400).json({ error: "Unsafe or too long reply content" });
    }

    const { data } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });

    res.json({ comment: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/actions/trigger', verifyToken, async (req, res) => {
  try {
    const { owner, repo, workflow_id, ref } = req.body;
    const octokit = await getOctokit(req);

    if (!owner || !repo || !workflow_id || !ref) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id, // can be the file name like 'ci.yml'
      ref,         // e.g., 'main' or 'dev'
    });

    res.json({ message: `Workflow ${workflow_id} triggered on ${ref}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/summary', verifyToken, async (req, res) => {
  const authHeader = req.headers.authorization;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const githubContext = await GithubData(authHeader);

    await summarizeGithubContext(githubContext, (line) => {
      res.write(`data: ${line}\n\n`);
    });

    res.write(`event: done\ndata: [END]\n\n`);
    res.end();
  } catch (err) {
    console.error('Summary error:', err.message);
    res.write(`event: error\ndata: ${err.message}\n\n`);
    res.end();
  }
});

router.get('/notifications/chunked', verifyToken, async (req, res) => {
  const octokit = await getOctokit(req);
  const { interval = 180, onlyPriority = false } = req.query;

  try {
    const { data: notifications } = await octokit.activity.listNotificationsForAuthenticatedUser({
      all: true,
      per_page: 100,
    });

    const filtered = onlyPriority === 'true'
      ? filterPriorityNotifications(notifications)
      : notifications;

    const chunked = chunkNotificationsByTime(filtered, parseInt(interval));
    res.json({ chunked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
let NEXT_PULSE_TIME = '14:00'; // in-memory setting for now

router.get('/settings/next-pulse', verifyToken, (req, res) => {
  res.json({ nextPulse: NEXT_PULSE_TIME });
});

router.post('/settings/next-pulse', verifyToken, (req, res) => {
  const { nextPulse } = req.body;
  if (!nextPulse) {
    return res.status(400).json({ error: 'Missing nextPulse' });
  }
  NEXT_PULSE_TIME = nextPulse;
  res.json({ message: 'Next pulse updated', nextPulse });
});    

router.get('/github-login', (req, res) => {
  const firebaseToken = req.query.token;
  if (!firebaseToken) {
    return res.status(400).send('Missing Firebase token');
  }

  const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${firebaseToken}&scope=repo read:user notifications`;
  res.redirect(githubOAuthURL);
});

router.get('/github/callback', async (req, res) => {
  const { code, state: firebaseToken } = req.query;

  if (!code || !firebaseToken) {
    return res.status(400).send('Missing code or state');
  }

  try {
    // Step 2.1: Exchange code for GitHub access token
    const accessRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const accessToken = accessRes.data.access_token;

    // Step 2.2: Get GitHub user info
    const octokit = new Octokit({ auth: accessToken });
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();

    // Step 2.3: (Optional) Verify Firebase token and store GitHub data in DB
    const decoded = await admin.auth().verifyIdToken(firebaseToken);
    const uid = decoded.uid;

    await admin.firestore().collection('users').doc(uid).set({
      github: {
        username: githubUser.login,
        accessToken,
      },
    }, { merge: true });

    // Step 2.4: Redirect back to frontend with username
    res.redirect(`${FRONTEND_REDIRECT}?username=${githubUser.login}`);
  } catch (err) {
    console.error('GitHub OAuth Error:', err.message);
    res.status(500).send('GitHub login failed');
  }
});

router.get('/user', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const doc = await admin.firestore().collection('users').doc(decoded.uid).get();
    const github = doc.data()?.github;

    if (!github) return res.status(404).json({ error: 'GitHub not linked' });

    res.json({ username: github.username });
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
});
module.exports = router;
