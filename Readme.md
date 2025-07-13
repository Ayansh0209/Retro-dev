# GitWhiz — AI-Powered Git Assistant VS Code Extension

## Overview

GitWhiz is a Visual Studio Code extension designed to assist developers with Git operations using an AI-powered assistant presented through a retro terminal-inspired interface inside VS Code. It integrates with GitHub to provide enhanced repository insights, notifications, and command suggestions. GitWhiz aims to simplify Git workflows and improve developer productivity by combining AI assistance with a nostalgic retro UI experience.

## Features

- Retro terminal UI embedded as a sidebar view within VS Code.
- AI-powered natural language Git command generation and assistance.
- Integration with GitHub for fetching notifications, user info, and repo data.
- Support for OAuth-based GitHub login and authentication.
- GitHub notification chunking and AI-generated summaries.
- Terminal-like experience with real-time AI responses.

## Prerequisites

Before installing and running the GitWhiz extension, ensure you have the following installed:

- Node.js (version 16 or above recommended)
- npm (comes with Node.js)
- Visual Studio Code (version 1.101.0 or above)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gitwhiz-extension.git
cd gitwhiz-extension
2. Install Dependencies
From the project root, run:

bash
Copy code
npm install
This will install all required dependencies including React, TailwindCSS, Firebase, and build tools.

3. Build Static Assets
Compile your React frontend and Tailwind CSS by running:

bash
Copy code
npm run build:css
npm run build
build:css compiles Tailwind CSS styles into a single CSS file.

build bundles React code and dependencies into a single JavaScript file for the webview.

4. Environment Configuration
This project requires certain secret keys and tokens which are not included in the repository for security reasons.

You need to create an .env file in the root of the project with the following environment variables:

env
Copy code
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
GEMINI_API_KEY=your_openai_or_gemini_api_key
These environment variables are essential for:

GitHub OAuth authentication flow.

Firebase Authentication and data storage.

AI API access via Gemini/OpenAI for natural language processing and command generation.

5. Gemini API Configuration
The project uses Gemini (OpenAI-compatible) API for AI-powered command generation and notification summaries. You must provide a Gemini configuration JSON file named gemini-config.json inside a config folder at the root of your project, structured as follows:

json
Copy code
{
  "apiKey": "your_gemini_api_key",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "maxTokens": 1500
}
This file configures how your AI calls are made, including the API key, model selection, and response generation parameters.

Running the Extension Locally
1. Launch VS Code Extension Development Host
Run the following command to open VS Code in Extension Development Mode:

bash
Copy code
code --extensionDevelopmentPath=$(pwd)
Or open VS Code, then:

Press F5 to start debugging.

This will launch a new VS Code window with the GitWhiz extension loaded.

2. Using GitWhiz
Open the GitWhiz sidebar panel (usually a terminal icon on the activity bar).

Authenticate with GitHub using the prompted OAuth flow.

Start interacting with the AI assistant for Git commands and notifications.

Why GitWhiz Was Built
Managing Git repositories can be complex, especially for those less familiar with Git commands or workflows. Traditional Git interfaces are powerful but sometimes overwhelming.

GitWhiz was created to:

Provide an AI-powered assistant to generate, explain, and run Git commands naturally.

Integrate GitHub notifications and repository insights directly within VS Code.

Present the interface with a retro terminal aesthetic to combine productivity with a nostalgic experience.

Enable easier and faster Git interactions, reducing context switching between terminal, browser, and editor.

The project intentionally avoids exposing secrets or configuration files publicly to maintain security best practices. Developers must provide their own environment and API configurations.

Troubleshooting
Ensure your .env variables and gemini-config.json are correctly configured.

Check for errors in the VS Code extension development console (Help > Toggle Developer Tools).

Confirm that your GitHub OAuth app is configured correctly with redirect URIs matching your local server.

Confirm network connectivity for API calls.

Contribution
Contributions and feedback are welcome. Please open issues or pull requests to help improve GitWhiz.

License
MIT License