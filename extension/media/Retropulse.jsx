import React, { useEffect, useState } from 'react';
import {
  fetchRetroPulseNotifications,
  fetchGitHubUser,
  updateNextPulse,
  streamSummary,
  sendDiscussionReply,
} from '../api/api';



export default function RetroPulse() {
  const [pulseChunks, setPulseChunks] = useState({});
  const [nextPulse, setNextPulse] = useState('');
  const [unread, setUnread] = useState(0);
  const [repoCount, setRepoCount] = useState(0);
  const [newPulse, setNewPulse] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [summary, setSummary] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [reply, setReply] = useState({ owner: '', repo: '', issue_number: '', body: '' });

  const [token, setToken] = useState('');
  const [githubUsername, setGitHubUsername] = useState('');
  const [loading, setLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    setLoading(false);
  }, []);

  // After loading, fetch GitHub username or trigger OAuth
  useEffect(() => {
    if (!loading && token) {
      (async () => {
        try {
          const res = await fetch('http://localhost:3000/github/user', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('githubUsername', data.username);
            setGitHubUsername(data.username);
          } else {
            const wantsToLink = window.confirm(
              '🔗 GitHub not connected.\nWould you like to connect GitHub now via browser?'
            );
            if (wantsToLink) {
              window.open(`http://localhost:3000/github-login?token=${token}`, '_blank');
            }
          }
        } catch (err) {
          console.error('Error checking GitHub user:', err);
        }
      })();
    }
  }, [loading, token]);

  // Fetch notifications, repo count, and pulse time
  useEffect(() => {
    if (!token || !githubUsername) return;

    (async () => {
      try {
        const data = await fetchRetroPulseNotifications(token);
        setPulseChunks(data?.chunked || {});
        setUnread(data?.unread || 0);

        const userData = await fetchGitHubUser(token);
        setRepoCount(userData?.repoCount || 0);

        const pulseRes = await fetch(`http://localhost:3000/github/settings/next-pulse`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pulseData = await pulseRes.json();
        setNextPulse(pulseData?.nextPulse || '14:00');
      } catch (err) {
        console.error('RetroPulse Error:', err.message);
        setPulseChunks({});
      }
    })();
  }, [token, githubUsername]);

  const handlePulseUpdate = async () => {
    if (newPulse) {
      const res = await updateNextPulse(token, newPulse);
      setNextPulse(res.nextPulse);
      setNewPulse('');
    }
  };

  const handleStartSummary = () => {
    setSummary('');
    setStreaming(true);
    streamSummary(
      token,
      (line) => setSummary((prev) => prev + line),
      () => setStreaming(false),
      (err) => {
        console.error('Summary Error:', err.message);
        setStreaming(false);
      }
    );
  };

  const handleSendReply = async () => {
    try {
      await sendDiscussionReply(token, reply);
      alert('Reply sent successfully!');
      setReply({ owner: '', repo: '', issue_number: '', body: '' });
    } catch (err) {
      alert('Failed to send reply.');
    }
  };

  if (loading) return null;

  return (
    <div className="px-3 py-2 space-y-4 text-green-300 font-mono">
      <div className="bg-green-700 text-black font-bold px-3 py-1 rounded-md flex justify-between items-center">
        <div>RETROPULSE</div>
        <div className="text-sm flex items-center gap-2">
          Next Pulse: {nextPulse}
          <input
            type="time"
            value={newPulse}
            onChange={(e) => setNewPulse(e.target.value)}
            className="bg-black border border-green-500 rounded px-1 text-green-300"
          />
          <button
            onClick={handlePulseUpdate}
            className="bg-green-600 text-black font-bold px-2 py-0.5 rounded hover:bg-green-700"
          >
            Set
          </button>
        </div>
      </div>

      <div className="text-xs flex justify-between border-b border-green-700 pb-1">
        <div>STATUS: ACTIVE</div>
        <div>REPOS: {repoCount}</div>
        <div>UNREAD: {unread}</div>
        <div className="text-yellow-300">● MONITORING</div>
      </div>
      {!githubUsername && (
    <button
      onClick={() => window.open(`http://localhost:3000/github-login?token=${token}`, '_blank')}
      className="text-xs bg-yellow-500 hover:bg-yellow-600 text-black px-2 py-0.5 rounded"
    >
      Connect GitHub
    </button>
  )}

      {Object.entries(pulseChunks || {}).map(([chunk, notifications], idx) => (
        <div key={idx}>
          <div className="text-sm text-green-400 font-bold mt-3 mb-1 border-b border-green-700 pb-1">
            ⏱️ {chunk}
          </div>
          <div className="space-y-2">
            {notifications.map((item, index) => (
              <div
                key={index}
                className={`border-l-4 pl-3 py-2 rounded-md ${
                  item.type === 'PULL_REQUEST'
                    ? 'border-cyan-400 bg-cyan-900/20'
                    : item.type === 'ISSUE'
                    ? 'border-yellow-400 bg-yellow-900/20'
                    : 'border-blue-400 bg-blue-900/20'
                }`}
              >
                <div className="text-xs mb-1">
                  <span
                    className={`px-2 py-0.5 rounded font-bold mr-2 ${
                      item.type === 'PULL_REQUEST'
                        ? 'bg-cyan-500 text-black'
                        : item.type === 'ISSUE'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-blue-500 text-black'
                    }`}
                  >
                    {item.type}
                  </span>
                  {item.repo}
                </div>
                <div className="text-green-200">{item.message}</div>
                <div className="text-xs text-green-500 mt-1">
                  {item.user} • {item.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div
        className="fixed bottom-4 right-4 bg-green-700 hover:bg-green-800 p-3 rounded-full cursor-pointer shadow-lg"
        onClick={() => setShowChat(!showChat)}
        title="Ask RetroPulse AI"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="black"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.25-8.25v4.5h5.25A5.25 5.25 0 0121 13.5v.75a5.25 5.25 0 01-5.25 5.25H10.5v4.5L2.25 12z"
          />
        </svg>
      </div>

      {showChat && (
        <div className="fixed bottom-20 right-4 w-96 bg-black border border-green-700 rounded-lg p-4 text-green-300 font-mono z-50 shadow-xl">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-green-400">🤖 RetroPulse AI</h2>
            <button
              onClick={() => setShowChat(false)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-bold">AI Summary</label>
              <button
                onClick={handleStartSummary}
                className="text-xs bg-green-600 hover:bg-green-700 text-black px-2 py-0.5 rounded"
              >
                {streaming ? 'Streaming...' : 'Get'}
              </button>
            </div>
            <div className="text-sm bg-green-900/10 border border-green-700 p-2 rounded h-24 overflow-y-auto whitespace-pre-line">
              {summary || 'Click "Get" to fetch AI summary'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">AI Reply to Discussion</label>
            <input
              type="text"
              placeholder="owner"
              value={reply.owner}
              onChange={(e) => setReply({ ...reply, owner: e.target.value })}
              className="w-full bg-black border border-green-700 rounded px-2 py-1 text-sm"
            />
            <input
              type="text"
              placeholder="repo"
              value={reply.repo}
              onChange={(e) => setReply({ ...reply, repo: e.target.value })}
              className="w-full bg-black border border-green-700 rounded px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="issue_number"
              value={reply.issue_number}
              onChange={(e) => setReply({ ...reply, issue_number: e.target.value })}
              className="w-full bg-black border border-green-700 rounded px-2 py-1 text-sm"
            />
            <textarea
              placeholder="Your AI-generated reply"
              value={reply.body}
              onChange={(e) => setReply({ ...reply, body: e.target.value })}
              className="w-full bg-black border border-green-700 rounded px-2 py-1 text-sm"
              rows={3}
            ></textarea>
            <button
              onClick={handleSendReply}
              className="bg-green-600 hover:bg-green-700 text-black font-bold px-3 py-1 rounded"
            >
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
