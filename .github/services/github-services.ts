// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import {
  IssueCommentData,
  IssueDetails,
  OctokitClient,
} from "../types/github-types";
import {
  INCIDENT_LABEL_NAME,
  INCIDENT_LABEL_COLOR,
  INCIDENT_LABEL_DESCRIPTION,
} from "../utils/consts";

/**
 * Posts a comment on a GitHub issue.
 */
export async function postComment(
  client: OctokitClient,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  await client.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

/**
 * Ensures a label exists in the target repository, creating it if necessary.
 */
export async function ensureLabelExists(
  client: OctokitClient,
  owner: string,
  repo: string,
  logger?: { info: (message: string) => void },
): Promise<void> {
  try {
    await client.rest.issues.getLabel({
      owner,
      repo,
      name: INCIDENT_LABEL_NAME,
    });
    logger?.info(
      `Label '${INCIDENT_LABEL_NAME}' already exists in target repo.`,
    );
  } catch (error: unknown) {
    const isNotFoundError =
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404;

    if (isNotFoundError) {
      logger?.info(`Creating label '${INCIDENT_LABEL_NAME}' in target repo...`);
      await client.rest.issues.createLabel({
        owner,
        repo,
        name: INCIDENT_LABEL_NAME,
        color: INCIDENT_LABEL_COLOR,
        description: INCIDENT_LABEL_DESCRIPTION,
      });
    } else {
      throw error;
    }
  }
}

/**
 * Creates a GitHub issue in the target repository.
 */
export async function createIssue(
  client: OctokitClient,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels: string[],
  assignees?: string[],
): Promise<{ node_id: string; html_url: string; number: number }> {
  const response = await client.rest.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
    assignees: assignees && assignees.length > 0 ? assignees : undefined,
  });
  return response.data;
}

/**
 * Handles project sync failure by rolling back the created issue.
 * Closes the issue and posts an error comment on the original issue.
 */
export async function handleProjectSyncFailure(
  targetClient: OctokitClient,
  targetOwner: string,
  targetRepo: string,
  newIssueNumber: number,
  errorMessage: string,
  labels: string[],
  labelName: string,
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  },
): Promise<void> {
  try {
    // Close the newly created issue with failure label
    await updateIssue(
      targetClient,
      targetOwner,
      targetRepo,
      newIssueNumber,
      "",
      "closed",
      "not_planned",
      [...labels, labelName, "project-sync-failed"],
    );

    logger?.info(
      `Rollback successful: Issue #${newIssueNumber} has been closed.`,
    );

    // Post error comment on origin issue
    const commentBody =
      `**Incident Sync Failed**\n\n` +
      `The system created the replicated issue but failed to map the incident data to the centralised project board. ` +
      `The replicated issue has been rolled back (closed).\n\n` +
      `**Error Details:**\n\`\`\`\n${errorMessage}\n\`\`\``;

    await postComment(
      targetClient,
      targetOwner,
      targetRepo,
      newIssueNumber,
      commentBody,
    );
  } catch (rollbackError: unknown) {
    const rbErrorMessage =
      rollbackError instanceof Error
        ? rollbackError.message
        : String(rollbackError);
    logger?.error(
      `CRITICAL: Rollback failed! Orphaned issue #${newIssueNumber} remains open. Error: ${rbErrorMessage}`,
    );
    throw rollbackError;
  }
}

/**
 * Lists all comments for a given GitHub issue.
 */
export async function listIssueComments(
  client: OctokitClient,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<IssueCommentData[]> {
  const response = await client.paginate(client.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  return response;
}

/**
 * Retrieves a GitHub issue's details.
 */
export async function getIssue(
  client: OctokitClient,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<IssueDetails> {
  const response = await client.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });
  return response.data;
}

/**
 * Updates a GitHub issue's body and state.
 */
export async function updateIssue(
  client: OctokitClient,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string | undefined,
  state: "open" | "closed",
  stateReason?: "completed" | "not_planned" | "reopened",
  labels?: string[],
): Promise<void> {
  await client.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    body,
    state,
    state_reason: stateReason,
    labels,
  });
}
