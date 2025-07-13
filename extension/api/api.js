//Git Command Executor
const BASE_URL = 'http://localhost:3000';
export const GitCmd = async (command, repoPath= false) => {
  const token = localStorage.getItem('token');

  const res = await fetch("http://localhost:3000/git/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ 
      gitCommand: command, 
       repoPath: repoPath,
    }),
  });

  return await res.json(); 
};

//  user normal prompt 
export const AiResponse = (prompt, repoPath, onData, onError, onEnd) => {
  console.log('[Frontend] Sending prompt:', prompt);
  console.log('[Frontend] Sending repoPath to AiResponse:', repoPath);

  const token = localStorage.getItem('token');

  fetch(`http://localhost:3000/git/ai-prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, repoPath }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const read = () => {
        reader.read().then(({ value, done }) => {
          if (done) {
            console.log('[Frontend] Stream ended   ');
            onEnd();
            return;
          }

          try {
            const chunk = decoder.decode(value, { stream: true });
            console.log('[Frontend] Raw chunk:', chunk);

            const lines = chunk.split('\n\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const message = line.slice(6);
                console.log('[Frontend] Parsed message chunk:', message);
                onData(message);
              } else if (line.trim()) {
                console.log('[Frontend] Ignored non-data line:', line);
              }
            }
          } catch (decodeErr) {
            console.error('[Frontend] Error decoding chunk:', decodeErr);
          }

          read(); // continue reading
        }).catch(err => {
          console.error('[Frontend] Reader read error:', err);
          onError(err.message);
        });
      };

      read();
    })
    .catch((err) => {
      console.error('[Frontend] Fetch error:', err);
      onError(err.message);
    });
};


export async function fetchRetroPulseNotifications(token) {
  const res = await fetch(`${BASE_URL}/github/notifications/chunked`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const { chunked } = await res.json();

  let unread = 0;
  Object.values(chunked).forEach(arr => unread += arr.length);

  return { chunked, unread };
}

export async function fetchGitHubUser(token) {
  const res = await fetch(`${BASE_URL}/github/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const { user } = await res.json();
  return { repoCount: user.public_repos };
}

export async function updateNextPulse(token, nextPulse) {
  const res = await fetch(`${BASE_URL}/github/settings/next-pulse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ nextPulse }),
  });
  return res.json();
}
// Summary via SSE
export async function streamSummary(token, onData, onDone, onError) {
  const eventSource = new EventSource(`${BASE_URL}/github/summary`, {
    headers: { Authorization: `Bearer ${token}` }, // SSE doesn’t allow headers directly, workaround below
  });

  // SSE header workaround
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
    originalOpen.apply(this, arguments);
    this.setRequestHeader('Authorization', `Bearer ${token}`);
  };

  eventSource.onmessage = (event) => {
    if (event.data === '[END]') {
      eventSource.close();
      onDone();
    } else {
      onData(event.data);
    }
  };

  eventSource.onerror = (err) => {
    eventSource.close();
    onError(err);
  };
}

// Send reply to discussion thread
export async function sendDiscussionReply(token, { owner, repo, issue_number, body }) {
  const res = await fetch(`${BASE_URL}/github/discussions/reply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ owner, repo, issue_number, body }),
  });

  if (!res.ok) throw new Error('Failed to send reply');
  return res.json();
}
