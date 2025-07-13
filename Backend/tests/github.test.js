// __tests__/chunkedRoute.test.js
jest.mock('../middleware/verifyTok', () => (req, res, next) => next()); // ✅ mock verifyToken

const request = require('supertest');
const express = require('express');
const router = require('../routes/github');


jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    activity: {
      listNotificationsForAuthenticatedUser: jest.fn(() => ({
        data: [
          { id: '1', updated_at: new Date().toISOString(), subject: { title: 'Urgent fix needed' } },
          { id: '2', updated_at: new Date().toISOString(), subject: { title: 'Regular update' } }
        ]
      }))
    },
    rest: {
      users: {
        getAuthenticated: jest.fn(() => ({
          data: { login: 'testuser', id: 123 }
        }))
      },
      activity: {
        markNotificationsAsRead: jest.fn(() => Promise.resolve()),
        markThreadAsRead: jest.fn(() => Promise.resolve()) // ✅ THIS FIXES THE 500 ERROR
      },
      issues: {
        createComment: jest.fn(() => ({
          data: { id: 1, body: 'Reply posted' }
        }))
      },
      actions: {
        createWorkflowDispatch: jest.fn(() => Promise.resolve())
      }
    }
  }))
}));


// 🧪 Mock chunking and priority filter logic
jest.mock('../Time-chunking/Timechunker', () => ({
  chunkNotificationsByTime: jest.fn(() => ({
    '🕒 2pm – 5pm': [{ id: '1' }, { id: '2' }]
  })),
  filterPriorityNotifications: jest.fn((data) =>
    data.filter(n => n.subject.title.toLowerCase().includes('urgent'))
  )
}));


jest.mock('../utils/helper', () => ({
  GithubData: jest.fn(() => Promise.resolve([
    { title: 'Fix critical bug', repo: 'repo1', type: 'Issue' },
    { title: 'Add new feature', repo: 'repo2', type: 'PR' }
  ]))
}));


jest.mock('../services/googleai', () => ({
  summarizeGithubContext: jest.fn(async (context, onData) => {
    onData("🔔 You have 2 new updates:");
    onData("- Fix critical bug in repo1");
    onData("- Add new feature in repo2");
  })
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/github', router);

describe('GET /github/notifications/chunked', () => {
  it('returns chunked notifications with default interval', async () => {
    const res = await request(app)
      .get('/github/notifications/chunked')
      .set('Authorization', 'Bearer faketoken')
      .set('github-token', 'faketoken'); // simulate token header

    expect(res.statusCode).toBe(200);
    expect(res.body.chunked).toBeDefined();
    expect(res.body.chunked['🕒 2pm – 5pm']).toBeDefined();
  });

  it('filters only priority when onlyPriority=true', async () => {
    const res = await request(app)
      .get('/github/notifications/chunked?onlyPriority=true')
      .set('Authorization', 'Bearer faketoken')
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(200);
    expect(res.body.chunked['🕒 2pm – 5pm']).toBeDefined();
  });
});

describe('GET /github/notifications', () => {
  it('returns notifications array', async () => {
    const res = await request(app)
      .get('/github/notifications')
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(200);
    expect(res.body.notifications).toBeDefined();
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications.length).toBeGreaterThan(0);
  });
});

describe('GET /github/user', () => {
  it('returns user data', async () => {
    const res = await request(app)
      .get('/github/user')
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.login).toBe('testuser'); // adjust based on your mock
  });
});

describe('POST /github/notifications/mark-read', () => {
  it('marks all notifications as read', async () => {
    const res = await request(app)
      .post('/github/notifications/mark-read')
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("All notifications marked as read");
  });
});


describe('POST /github/notifications/mark-thread', () => {
  it('marks a specific thread as read', async () => {
    const res = await request(app)
      .post('/github/notifications/mark-thread')
      .send({ threadId: '12345' })
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Notification 12345 marked as read');
  });

  it('returns 400 if threadId is missing', async () => {
    const res = await request(app)
      .post('/github/notifications/mark-thread')
      .send({})
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Missing threadId');
  });
});

describe('POST /github/discussions/reply', () => {
  it('posts a comment on an issue/discussion', async () => {
    const res = await request(app)
      .post('/github/discussions/reply')
      .send({
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 1,
        body: 'This is a test reply'
      })
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(200);
    expect(res.body.comment).toBeDefined();
    expect(res.body.comment.body).toBe('Reply posted');
  });

  it('rejects if required fields are missing', async () => {
    const res = await request(app)
      .post('/github/discussions/reply')
      .send({}) // missing everything
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Missing required fields');
  });

  it('rejects unsafe/spam content', async () => {
    const res = await request(app)
      .post('/github/discussions/reply')
      .send({
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 1,
        body: 'automated spam content'
      })
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Unsafe or too long reply content');
  });
});

describe('POST /github/actions/trigger', () => {
  it('triggers a GitHub Actions workflow', async () => {
    const res = await request(app)
      .post('/github/actions/trigger')
      .send({
        owner: 'octocat',
        repo: 'hello-world',
        workflow_id: 'ci.yml',
        ref: 'main'
      })
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Workflow ci.yml triggered on main');
  });

  it('returns 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/github/actions/trigger')
      .send({}) // missing everything
      .set('github-token', 'faketoken');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Missing required fields');
  });
});

describe('POST /github/summary (SSE)', () => {
  // ✅ Increase timeout for all tests in this block
  jest.setTimeout(15000);

  it('streams summarized GitHub notifications via SSE', async () => {
    const res = await new Promise((resolve, reject) => {
      const req = request(app)
        .post('/github/summary')
        .set('Authorization', 'Bearer faketoken')
        .set('github-token', 'faketoken');

      let data = '';

      req
        .buffer(true)
        .parse((res, cb) => {
          res.on('data', chunk => {
            data += chunk.toString();
          });

          res.on('end', () => {
            res.text = data;
            console.log("✅ AI Summary Output:\n" + res.text); // 🔍 Debug
            cb(null, res);
            resolve(res);
          });

          res.on('error', reject);
        });
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data: 🔔 You have 2 new updates:');
    expect(res.text).toContain('data: - Fix critical bug in repo1');
    expect(res.text).toContain('event: done');
  });

  it('handles errors in summarization', async () => {
    // ✅ Mock AI failure
    const { summarizeGithubContext } = require('../services/googleai');
    summarizeGithubContext.mockImplementationOnce(async () => {
      throw new Error('Mock AI failure');
    });

    const res = await new Promise((resolve, reject) => {
      const req = request(app)
        .post('/github/summary')
        .set('Authorization', 'Bearer faketoken')
        .set('github-token', 'faketoken');

      let data = '';

      req
        .buffer(true)
        .parse((res, cb) => {
          res.on('data', chunk => {
            data += chunk.toString();
          });

          res.on('end', () => {
            res.text = data;
            console.log("🛑 AI Summary Error Output:\n" + res.text); // 🔍 Debug
            cb(null, res);
            resolve(res);
          });

          res.on('error', reject);
        });
    });

    expect(res.statusCode).toBe(200); // ✅ SSE always returns 200
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('data: Mock AI failure');
  });
});


it('handles errors in summarization', async () => {
  const { summarizeGithubContext } = require('../services/googleai');

  // 🧪 Simulate AI failure
  summarizeGithubContext.mockImplementationOnce(() => {
    throw new Error("Mock AI failure");
  });

  const res = await new Promise((resolve, reject) => {
    let data = '';
    const req = request(app)
      .post('/github/summary')
      .set('Authorization', 'Bearer faketoken')
      .buffer()
      .parse((res, cb) => {
        res.on('data', chunk => { data += chunk.toString(); });
        res.on('end', () => {
          res.text = data; // ✅ Set res.text manually so you can assert on it
          cb(null, res);
          resolve(res);
        });
        res.on('error', reject);
      });
  });

  console.log("🧪 Error SSE Output:\n", res.text); // 🔍 Optional Debug

  expect(res.statusCode).toBe(200); // ✅ SSE always sends 200 even on logical errors
  expect(res.text).toContain('event: error');
  expect(res.text).toContain('data: Mock AI failure');
});
