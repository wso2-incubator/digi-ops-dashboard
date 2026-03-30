# GitHub Issue Replicator

Automated workflow for replicating and syncing GitHub issues with security incident reports from Google Docs to GitHub Projects V2. This system integrates GitHub Actions with Google Drive API and GitHub GraphQL API to create a seamless incident management workflow.

## Overview

This project automates the process of:

1. Extracting security incident data from Google Docs
2. Creating replicated issues in a centralised GitHub repository
3. Syncing incident metadata to GitHub Projects V2 custom fields
4. Providing cross-references between source and target issues
5. Synchronizing final incident data when issues are closed
6. Reopening replicated issues when original issues are reopened

## Workflows

### 1. Replicate Issue Workflow (`replicate-issue.yml`)

Triggers when a new issue is opened with a Google Doc link. Creates a replicated issue in the centralised repository.

### 2. Close Issue Workflow (`close-issue.yml`)

Triggers when an issue is closed. Fetches the latest data from Google Doc, updates the replicated issue, syncs to project board, and posts closure notifications.

### 3. Reopen Issue Workflow (`reopen-issue.yml`)

Triggers when an issue is reopened. Reopens the corresponding replicated issue in the centralised repository and posts reopen notifications on both issues.

## Architecture

```
.github/
├── clients/
│   └── github-client.ts
├── scripts/
│   ├── replicate-issue.ts
│   ├── close-issue.ts
│   └── reopen-issue.ts
├── services/
│   ├── github-services.ts
│   ├── google-services.ts
│   ├── project-v2-services.ts
│   └── template-services.ts     # Issue body template loading and rendering
├── types/
│   ├── github-types.ts
│   ├── google-api-types.ts
│   ├── incident-field-types.ts
│   └── project-v2-types.ts
├── utils/
│   ├── parsers.ts
│   ├── dates.ts
│   ├── consts.ts
│   ├── field-mappings.ts
│   └── issue-helpers.ts
├── templates/
│   └── issue-description.md     # Issue body template
└── workflows/
    ├── replicate-issue.yml
    ├── close-issue.yml
    └── reopen-issue.yml
```

## Features

### Automated Issue Replication

- Triggers on issue events in source repositories
- Validates Google Doc links in issue descriptions
- Creates formatted mirror issues in centralised repository

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
   cd digi-ops-dashboard
   ```

2. **Configure GitHub Secrets**

   Add the following secrets and variables to your repository settings:

   | Secret Name                  | Description                                                                                                                                      |
   | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
   | `GCP_CLIENT_ID`              | Google OAuth2 Client ID                                                                                                                          |
   | `GCP_CLIENT_SECRET`          | Google OAuth2 Client Secret                                                                                                                      |
   | `GCP_REFRESH_TOKEN`          | Google OAuth2 Refresh Token                                                                                                                      |
   | `ISSUE_PROJECT_ACCESS_TOKEN` | Fine-grained PAT scoped to the Target Organization with **Repository: Issues (Read and write)** and **Organization: Projects (Read and write)**. |

   | Variable Name         | Description            |
   | --------------------- | ---------------------- |
   | `TARGET_OWNER`        | Target organization    |
   | `TARGET_REPO`         | Target repository name |
   | `PROJECT_NUMBER`      | GitHub Project number  |
   | `INCIDENT_LABEL_NAME` | Custom label name      |

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

### Custom Fields in Projects V2

The automation populates these custom fields (configure in your project board):

| Field Name                        | Type          | Source in Google Doc               |
| --------------------------------- | ------------- | ---------------------------------- |
| Incident #                        | Text          | Document header                    |
| Incident Type                     | Single Select | "Incident type"                    |
| Incident Classification           | Single Select | "Incident Classification"          |
| Opened Date                       | Date          | "Incident reported on"             |
| Closed Date                       | Date          | "Incident closed on"               |
| Reported By                       | Text          | "Reporter"                         |
| Description                       | Text          | "Incident Overview"                |
| Category/Rating/Priority          | Single Select | "Priority"                         |
| Assignment To                     | Text          | "Coordinator"                      |
| Assignment Group/Team             | Single Select | "Incident owning team (Custodian)" |
| Service/Product/Scope/system/Tool | Text          | "Affected system(s)"               |
| Attachment options                | Text          | "Incident report located at"       |

## Related Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Projects V2 GraphQL API](https://docs.github.com/en/graphql/reference/objects#projectv2)
- [Google Drive API Reference](https://developers.google.com/drive/api/v3/reference)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
