//Git Command Executor
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
