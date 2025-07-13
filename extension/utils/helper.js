export const getGitcmd = (text) => {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      return (
        /^git\s+[a-z]/i.test(line) ||           
        /^add\s+\./i.test(line) ||              
        /^push\s+/i.test(line) ||               
        /^commit\s+/i.test(line) ||             
        /^clone\s+/i.test(line)                 
      );
    });
};


export const isSafeGitCommand = (cmd) => {
  const safePrefixes = [
    'git status',
    'git add',
    'git commit',
    'git log',
    'git diff'
  ];
  return safePrefixes.some(prefix => cmd.startsWith(prefix));
};