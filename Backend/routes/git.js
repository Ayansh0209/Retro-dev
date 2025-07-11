const express = require('express');
const router = express.Router();
const simpleGit = require('simple-git');
const verifyToken = require('../middleware/verifyTok');
const git = simpleGit();

router.get('/status', verifyToken, async (req, res) => {
    try {
        const status = await git.status();
        res.json(status)
    } catch (err) {
        res.status(500).json({ error: 'Failes to get git status' });
    }
});

router.get('/branch', verifyToken, async (req, res) => {
    try {
        const branch = await git.branch();
        res.json({ current: branch.current });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get branch info ' });
    }
});

router.get('/log', verifyToken, async (req, res) => {
    try {
        const log = await git.log({ n: 5 });
        res.json(log);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get git log' });
    }
});

router.get('/is-clean', verifyToken, async (req, res) => {
    try {
        const status = await git.status();
        const isClean = status.isClean();
        res.json("clean: isClean");
    } catch (err) {
        res.status(500).json({ error: 'Failed to check clean state' });
    }
});

router.get('/track-files', verifyToken, async (req, res) => {
    try {
        const files = await git.raw(['ls-files']);
        res.json({ tracked: files.split('\n').filter(f => f) });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to list tracked files' });
    }
})
router.get('/diff', verifyToken, async (req, res) => {
    try {
        const diff = await git.diff();
        res.json({ diff });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get diff' });
    }
});