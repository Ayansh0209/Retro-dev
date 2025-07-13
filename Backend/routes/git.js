const express = require('express');
const router = express.Router();
const simpleGit = require('simple-git');
const verifyToken = require('../middleware/verifyTok');
const { exec } = require('child_process');
const { GeminiRes } = require('../services/googleai');
const { Gitdata } = require('../utils/helper');

router.get('/status', verifyToken, async (req, res) => {
    const { repoPath } = req.query;
    if (!repoPath) return res.status(400).json({ error: 'Missing repoPath' });
     const git = simpleGit(repoPath);
    try {
        const status = await git.status();
        res.json({status})
    } catch (err) {
        res.status(500).json({ error: 'Failes to get git status' });
    }
});

router.get('/branch', verifyToken, async (req, res) => {
      const { repoPath } = req.query;
  if (!repoPath) return res.status(400).json({ error: 'Missing repoPath' });

  const git = simpleGit(repoPath);
    try {
        const branch = await git.branch();
        res.json({ current: branch.current });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get branch info ' });
    }
});

router.get('/log', verifyToken, async (req, res) => {
    const { repoPath } = req.query;
    if (!repoPath) return res.status(400).json({ error: 'Missing repoPath' });

    console.log('[GIT LOG] repoPath =', repoPath);

    const git = simpleGit(repoPath);
    try {
        const log = await git.log({ n: 5 });
        res.json({ all: log.all });
    } catch (err) {
        if (err.message.includes('unknown revision or path not in the working tree')) {

            res.json({ all: [] });
        } else {
            console.error('[GIT LOG ERROR]', err.message);
            res.status(500).json({ error: 'Failed to get git log' });
        }
    }
});
router.get('/is-clean', verifyToken, async (req, res) => {
     const { repoPath } = req.query;
  if (!repoPath) return res.status(400).json({ error: 'Missing repoPath' });

  const git = simpleGit(repoPath);
    try {
        const status = await git.status();
        const isClean = status.isClean();
        res.json({clean: isClean});
    } catch (err) {
        res.status(500).json({ error: 'Failed to check clean state' });
    }
});

router.get('/track-files', verifyToken, async (req, res) => {
      const { repoPath } = req.query;
  if (!repoPath) return res.status(400).json({ error: 'Missing repoPath' });
  const git = simpleGit(repoPath);
    
    try {
        const files = await git.raw(['ls-files']);
        res.json({ tracked: files.split('\n').filter(f => f) });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to list tracked files' });
    }
})
router.get('/diff', verifyToken, async (req, res) => {
  const { repoPath } = req.query;
  if (!repoPath) return res.status(400).json({ error: 'Missing repoPath' });

  const git = simpleGit(repoPath);
    try {
        const diff = await git.diff();
        res.json({ diff });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get diff' });
    }
});

router.post('/execute', verifyToken, async (req, res) => {
    const { gitCommand, force, repoPath } = req.body;

    if (!gitCommand || typeof gitCommand !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid Git command' });
    }

    if (!repoPath || typeof repoPath !== 'string') {
        return res.status(400).json({ error: 'Missing repo path' });
    }

    const blacklist = ['reset --hard', 'rebase', 'clean -fd', 'checkout --orphan'];
    const detect = blacklist.find(bad => gitCommand.includes(bad));
    if (detect && !force) {
        return res.status(403).json({
            error: 'Unsafe git command detected',
            warning: `"${detect}" is a dangerous operation`,
            prompt: 'Send again with "force: true" if you want to proceed',
            requiresConfirmation: true,
        });
    }

    const safeCommand = gitCommand.startsWith('git ') ? gitCommand : `git ${gitCommand}`;

    exec(safeCommand, { cwd: repoPath }, (err, stdout, stderr) => {
        const output = `${stdout}${stderr}`.trim();

        if (err && !output.toLowerCase().includes('committed')) {
            return res.status(500).json({
                error: 'Command failed',
                details: output,
            });
        }

        res.json({ result: output });
    });
});

router.post('/ai-prompt', verifyToken, async (req, res) => {
    const { prompt, repoPath } = req.body;
    const authValue = req.headers['authorization'];
    console.log('[DEBUG ai prompt ] Gitdata received repoPath:', repoPath);


    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const GitVal = await Gitdata(authValue, repoPath);
        await GeminiRes(prompt, GitVal, (chunk) => {
            res.write(`data: ${chunk}\n\n`);
        });
        res.end();
    } catch (err) {
        console.error('[Gemini Error]', err.message);
        res.write(`data: [ERROR] ${err.message}\n\n`);
        res.end();
    }
});

module.exports = router;
