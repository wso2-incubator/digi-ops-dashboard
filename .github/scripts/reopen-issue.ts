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
import { createGitHubClient } from "../clients/github-client";
import {
  createReopenComment,
  fetchReplicatedIssueContext,
  updateProjectItemStatus,
  validateEnv,
} from "../utils/issue-helpers";
import { postComment, updateIssue } from "../services/github-services";

/**
 * Reopen Issue Workflow Script
 *
 * This script is triggered when an issue that was previously closed
 * and replicated to a target repository) is reopened.
 *
 * Workflow:
 * 1. Fetches comments from the original issue to find the hidden replicated issue ID.
 * 2. Reopens the replicated issue in the target repository.
 * 3. Posts comments on both the original and replicated issues to notify about the reopening.
 */
module.exports = async ({
  context,
  core,
  github,
  getOctokit,
}: any): Promise<void> => {
  try {
    core.info("Starting Reopen Issue Process...");

    const config = {
      TARGET_OWNER: (process.env.TARGET_OWNER || "").trim(),
      TARGET_REPO: (process.env.TARGET_REPO || "").trim(),
      ISSUE_PROJECT_ACCESS_TOKEN: (
        process.env.ISSUE_PROJECT_ACCESS_TOKEN || ""
      ).trim(),
      PROJECT_NUMBER: (process.env.PROJECT_NUMBER || "").trim(),
    };

    validateEnv(config);

    const projectNumber = parseInt(config.PROJECT_NUMBER, 10);

    // Authenticate Target Client
    const githubClient = createGitHubClient(
      config.ISSUE_PROJECT_ACCESS_TOKEN,
      getOctokit,
      github,
    );

    const replicatedIssue = await fetchReplicatedIssueContext(
      github,
      githubClient,
      context.repo.owner,
      context.repo.repo,
      context.issue.number,
      config.TARGET_OWNER,
      config.TARGET_REPO,
      core,
    );

    if (replicatedIssue.state === "open") {
      core.info("Replicated issue is already open. Skipping reopen.");
      return;
    }

    await updateIssue(
      githubClient,
      config.TARGET_OWNER,
      config.TARGET_REPO,
      replicatedIssue.number,
      undefined,
      "open",
      "reopened",
    );

    core.info("Replicated issue reopened successfully.");
    core.info("Syncing GitHub Project V2 Status...");

    await updateProjectItemStatus(
      githubClient.graphql,
      config.TARGET_OWNER,
      projectNumber,
      replicatedIssue.node_id,
    );

    core.info("Successfully moved project card back to 'Todo'.");
    core.info("Posting reopen comments...");

    // Comment on replicated issue
    await postComment(
      githubClient,
      config.TARGET_OWNER,
      config.TARGET_REPO,
      replicatedIssue.number,
      createReopenComment(replicatedIssue.html_url, false),
    );

    // Comment on original issue
    await postComment(
      github,
      context.repo.owner,
      context.repo.repo,
      context.issue.number,
      createReopenComment(replicatedIssue.html_url, true),
    );

    core.notice(
      `Successfully reopened replica issue #${replicatedIssue.number}!`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Reopen Issue Workflow Failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      core.error(error.stack);
    }
  }
};
