# GitHub Issue Replicator

Automated workflow for replicating and syncing GitHub issues with security incident reports from Google Docs to GitHub Projects V2. This system integrates GitHub Actions with Google Drive API and GitHub GraphQL API to create a seamless incident management workflow.

## Overview

This project automates the process of:

1. Extracting security incident data from Google Docs
2. Creating replicated issues in a centralized GitHub repository
3. Syncing incident metadata to GitHub Projects V2 custom fields
4. Providing cross-references between source and target issues
5. Synchronizing final incident data when issues are closed
6. Reopening replicated issues when original issues are reopened

## Workflows

### 1. Replicate Issue Workflow (`replicate-issue.yml`)

Triggers when a new issue is opened with a Google Doc link. Creates a replicated issue in the centralized repository.

### 2. Close Issue Workflow (`close-issue.yml`)

Triggers when an issue is closed. Fetches the latest data from Google Doc, updates the replicated issue, syncs to project board, and posts closure notifications.

### 3. Reopen Issue Workflow (`reopen-issue.yml`)

Triggers when an issue is reopened. Reopens the corresponding replicated issue in the centralized repository and posts reopen notifications on both issues.

## Architecture

```
.github/
├── clients/
│   └── github-client.ts         # Octokit client factory
├── scripts/
│   ├── replicate-issue.ts       # Main orchestration logic for new issues
│   ├── close-issue.ts           # Final sync and closure workflow
│   └── reopen-issue.ts          # Reopen replicated issue workflow
├── services/
│   ├── github-services.ts       # GitHub REST API wrappers
│   ├── google-services.ts       # Google Drive API integration
│   ├── project-v2-services.ts   # GitHub Projects V2 GraphQL operations
│   └── template-services.ts     # Issue body template loading and rendering
├── utils/
│   ├── parsers.ts               # Markdown parsing utilities
│   ├── dates.ts                 # Date formatting functions
│   ├── consts.ts                # Regular expressions and constants
│   ├── field-mappings.ts        # Centralized field configuration
│   └── issue-helpers.ts         # Reusable helper functions
├── templates/
│   └── issue-description.md     # Issue body template
└── workflows/
    ├── replicate-issue.yml      # GitHub Actions workflow for new issues
    ├── close-issue.yml          # GitHub Actions workflow for closing issues
    └── reopen-issue.yml         # GitHub Actions workflow for reopening issues
```

## Features

### Automated Issue Replication

- Triggers on new issues in source repositories
- Validates Google Doc links in issue descriptions
- Creates formatted mirror issues in centralized repository

### Google Docs Integration

- OAuth2 authentication with refresh tokens
- Markdown export for structured data extraction

### GitHub Projects V2 Sync

- Automatic addition to project boards
- Custom field population (text, single-select, date)
- Parallel field updates for performance

## Setup

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sample-repo
   ```

2. **Configure GitHub Secrets**

   Add the following secrets to your repository settings:

   | Secret Name                  | Description                                                                                                                                      |
   | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
   | `GCP_CLIENT_ID`              | Google OAuth2 Client ID                                                                                                                          |
   | `GCP_CLIENT_SECRET`          | Google OAuth2 Client Secret                                                                                                                      |
   | `GCP_REFRESH_TOKEN`          | Google OAuth2 Refresh Token                                                                                                                      |
   | `ISSUE_PROJECT_ACCESS_TOKEN` | Fine-grained PAT scoped to the Target Organization with **Repository: Issues (Read and write)** and **Organization: Projects (Read and write)**. |

3. **Configure Environment Variables**

   The workflows are pre-configured with the following default values. If you need to change them, update the `env` section in each workflow file:

   ```yaml
   env:
     TARGET_OWNER: "wso2-incubator"  # Target organization or username
     TARGET_REPO: "dt-dashboard"     # Target repository name
     PROJECT_NUMBER: "9"             # GitHub Project number
   ```

### Google Cloud Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable Drive API**
   - Navigate to APIs & Services > Library
   - Search for "Google Drive API"
   - Click "Enable"

3. **Create OAuth2 Credentials**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Download the credentials JSON

4. **Generate Refresh Token**
   - Visit [Google OAuth2 Playground](https://developers.google.com/oauthplayground/)
   - Click the settings icon and check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - In Step 1, select "Drive API v3" > `https://www.googleapis.com/auth/drive.readonly`
   - Click "Authorize APIs"
   - In Step 2, click "Exchange authorization code for tokens"
   - Copy the refresh token

## Usage

### Workflow Trigger

The workflow automatically triggers when a new issue is opened in your repository:

```yaml
on:
  issues:
    types: [opened]
```

### Custom Fields in Projects V2

The automation populates these custom fields (configure in your project board):

- **Incident #** (Text)
- **Incident Type** (Single Select)
- **Incident Classification** (Single Select)
- **Opened Date** (Date)
- **Closed date** (Date)
- **Reported By** (Text)
- **Description** (Text)
- **Category/Rating/Priority** (Single Select)
- **Assignment To** (Text)
- **Assignment Group/Team** (Single Select)
- **Service/Product/Scope/system/Tool** (Text)
- **Attachment options for incident report** (Text)

### Project Structure

- **scripts/**: Main orchestration logic
- **services/**: External API integrations (Google, GitHub)
- **types/**: TypeScript type definitions
- **utils/**: Helper functions (parsers, date formatters, constants)
- **templates/**: Issue and content templates
- **workflows/**: GitHub Actions workflow definitions

## Related Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Projects V2 GraphQL API](https://docs.github.com/en/graphql/reference/objects#projectv2)
- [Google Drive API Reference](https://developers.google.com/drive/api/v3/reference)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
