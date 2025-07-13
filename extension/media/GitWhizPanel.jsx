import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { GitCmd, AiResponse } from "../api/api";
import AuthPage from "./AuthPage";
import { getGitcmd, isSafeGitCommand } from '../utils/helper';

const GitWhizApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'system', text: '█ GitWhiz Terminal Booting...' },
    { type: 'system', text: '█ Connected to AI Core [OK]' }
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [prevGit, setprevGit] = useState([]);


const updateTerminalHistory = (newHistory) => {
  setTerminalHistory(newHistory);
  localStorage.setItem(`terminalHistory_${userEmail}`, JSON.stringify(newHistory));
};

const updatePrevGit = (newPrevGit) => {
  setprevGit(newPrevGit);
  localStorage.setItem(`prevGit_${userEmail}`, JSON.stringify(newPrevGit));
};

useEffect(() => {
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.command === 'workspacePath') {
      localStorage.setItem('repoPath', message.path);
      setRepoPath(message.path);
    }
  });

  const vscode = acquireVsCodeApi();
  vscode.postMessage({ command: 'getWorkspacePath' });

  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email');

  if (token && email) {
    setUserEmail(email);
    setIsAuthenticated(true);
    // Load user-specific history
    const history = localStorage.getItem(`terminalHistory_${email}`);
    const git = localStorage.getItem(`prevGit_${email}`);

    setTerminalHistory(history ? JSON.parse(history) : [
      { type: 'system', text: '█ GitWhiz Terminal Booting...' },
      { type: 'system', text: '█ Connected to AI Core [OK]' }
    ]);

    setprevGit(git ? JSON.parse(git) : []);
  }
}, []);
const handleLogout = () => {
  localStorage.removeItem(`terminalHistory_${userEmail}`);
  localStorage.removeItem(`prevGit_${userEmail}`);
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  localStorage.removeItem('repoPath');
  setUserEmail('');
  setIsAuthenticated(false);
  setTerminalHistory([]);
  setprevGit([]);
};


  const handleCommand = async (command) => {
  if (!command.trim()) return;

  const trimmed = command.trim().toLowerCase();

  // Step 1: Handle confirmation of pending Git commands
  if (trimmed === 'yes' && prevGit.length > 0) {
    setTerminalHistory(prev => [...prev, { type: 'user', text: '> yes' }]);
    setIsProcessing(true);

    for (let cmd of prevGit) {
      setTerminalHistory(prev => [...prev, { type: 'ai', text: `▶ Executing: ${cmd}` }]);
      try {
        const result = await GitCmd(cmd, repoPath);
        setTerminalHistory(prev => [...prev, {
          type: 'ai',
          text: result.result || result.error || '  Done'
        }]);
      } catch (err) {
        setTerminalHistory(prev => [...prev, {
          type: 'ai',
          text: `  ${err.message}`
        }]);
      }
    }

    setprevGit([]);
    setIsProcessing(false);
    return;
  }

  // Step 2: Ensure repoPath is available
  if (!repoPath) {
    setTerminalHistory(prev => [...prev, { type: 'ai', text: '  Repo path not available' }]);
    return;
  }

  setTerminalHistory(prev => [...prev, { type: 'user', text: `> ${command}` }]);
  setCurrentCommand('');
  setIsProcessing(true);

  const loadingId = Date.now();
  setTerminalHistory(prev => [
    ...prev,
    { type: 'ai', id: loadingId, text: `💾 Processing "${command}"...` }
  ]);

  const isGit = command.startsWith('git');

  // Step 3: Direct Git command from user
if (isGit) {
  try {
    const result = await GitCmd(command, repoPath);
    const output = result?.result?.trim() || result?.error?.trim() || '    Command executed, but no output.';
    setTerminalHistory(prev => [
      ...prev.filter(entry => entry.id !== loadingId),
      { type: 'ai', text: output }
    ]);
  } catch (err) {
    setTerminalHistory(prev => [
      ...prev.filter(entry => entry.id !== loadingId),
      { type: 'ai', text: `  ❌ ${err.message || 'Command failed.'}` }
    ]);
  } finally {
    setIsProcessing(false);
  }
  return;
}


  // Step 4: AI-powered response mode
  let hasStarted = false;
  let fullAiResponse = '';

  AiResponse(
    command,
    repoPath,
    async (chunk) => {
      if (!hasStarted) {
        setTerminalHistory(prev => prev.filter(entry => entry.id !== loadingId));
        hasStarted = true;
      }

      fullAiResponse += chunk;
      setTerminalHistory(prev => [...prev, { type: 'ai', text: chunk }]);
    },
    (err) => {
      setTerminalHistory(prev => [
        ...prev.filter(entry => entry.id !== loadingId),
        { type: 'ai', text: `  Stream error: ${err}` }
      ]);
      setIsProcessing(false);
    },
    async () => {
      const extracted = getGitcmd(fullAiResponse);

      if (extracted.length > 0) {
        const allSafe = extracted.every(isSafeGitCommand);

        if (allSafe) {
          for (let cmd of extracted) {
            setTerminalHistory(prev => [...prev, { type: 'ai', text: `▶ Executing: ${cmd}` }]);
            try {
              const result = await GitCmd(cmd, repoPath);
              setTerminalHistory(prev => [...prev, {
                type: 'ai',
                text: result.result || result.error || '  Done'
              }]);
            } catch (err) {
              setTerminalHistory(prev => [...prev, {
                type: 'ai',
                text: `  ${err.message}`
              }]);
            }
          }
        } else {
          setprevGit(extracted);
          setTerminalHistory(prev => [...prev, {
            type: 'ai',
            text: `  Do you want me to run these commands?\n${extracted.join('\n')}`
          }]);
        }
      }

      setIsProcessing(false);
    }
  );
};
useEffect(() => {
  const terminal = document.getElementById('terminal-output');
  if (terminal) terminal.scrollTop = terminal.scrollHeight;
}, [terminalHistory]);


  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleCommand(currentCommand);
  };

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={(email) => {
      setUserEmail(email);
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <div className="fixed inset-0 font-mono bg-black text-green-500 flex flex-col text-[0.95em]">
      <div className="flex flex-col flex-1 p-2 overflow-hidden">
       <div className="flex items-center justify-between mb-2 px-1">
  <div className="text-green-400 font-bold">
    👤 {userEmail.split('@')[0]}
  </div>
  <button
    className="flex items-center text-red-400 hover:text-red-300 transition text-sm"
    onClick={handleLogout}

  >
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
    Logout
  </button>
</div>


        <div id="terminal-output" className="flex-1 overflow-y-auto whitespace-pre-wrap pr-2">
          {terminalHistory.map((entry, index) => (
            <div key={index} className={
              entry.type === 'system' ? 'text-green-500 font-bold' :
                entry.type === 'user' ? 'text-yellow-300' :
                  'text-green-300'}>
              {entry.text}
            </div>
          ))}
        </div>

        <div className="flex items-end border-t border-green-500 pt-2 mt-2">
          <span className="text-green-500 text-lg mr-2">➤</span>
          <textarea
            value={currentCommand}
            onChange={e => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isProcessing}
            placeholder="Enter Git command or ask AI..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-green-300 placeholder-green-700 outline-none focus:ring-0 border-none shadow-none focus:outline-none"
            style={{
              minHeight: '1.5rem',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          />


        </div>
      </div>
    </div>
  );

};

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<GitWhizApp />);
