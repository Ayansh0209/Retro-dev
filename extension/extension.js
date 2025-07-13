const vscode = require('vscode');

class GitWhizViewProvider {
  constructor(context) {
    this.context = context;
  }

  resolveWebviewView(webviewView) {
    this.webviewView = webviewView;
     const folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    };
     webviewView.webview.onDidReceiveMessage(async (msg) => {
    if (msg.command === 'getWorkspacePath') {
      webviewView.webview.postMessage({
        command: 'workspacePath',
        path: folderPath,
      });
    }
  });

    webviewView.webview.html = this.getWebviewContent();
  }

  getWebviewContent() {
    const scriptUri = this.webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'gitwhiz.js'),
    );
    const styleUri = this.webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'tailwind-built.css'),
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitWhiz</title>
  <link href="${styleUri}" rel="stylesheet">
</head>
<body class="h-full overflow-hidden bg-black text-green-400 font-mono">
  <div id="root" class="h-full"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function activate(context) {
  const provider = new GitWhizViewProvider(context);
  const disposable = vscode.window.registerWebviewViewProvider(
    'gitwhizSidebarView',
    provider,
    { webviewOptions: { retainContextWhenHidden: true } },
  );
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
