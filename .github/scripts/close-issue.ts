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
import { fetchGoogleDocContent } from "../services/google-services";
import {
  addIssueToProject,
  getProjectData,
} from "../services/project-v2-services";
import { extractDocDetails, extractIssueData } from "../utils/parsers";
import { GOOGLE_DOC_URL_REGEX } from "../utils/consts";
import {
  updateAllProjectFields,
  createClosureComment,
  validateEnv,
  fetchReplicatedIssueContext,
} from "../utils/issue-helpers";
import { postComment, updateIssue } from "../services/github-services";
import {
  applyTemplateReplacements,
  buildIncidentTemplateData,
  loadIncidentTemplate,
} from "../services/template-services";
import { createGitHubClient } from "../clients/github-client";

/**
 * Close and Sync Security Incident Issues
 *
 * This script handles the final synchronization and closure of security incident issues
 * when an original issue is closed.
 *
 * Workflow:
 * 1. Fetches the latest data from the linked Google Doc
 * 2. Updates the replicated issue body with final incident data
 * 3. Syncs all fields to the GitHub Project V2 board
 * 4. Closes the replicated issue
 * 5. Posts closure notifications on both original and replicated issues
 */
module.exports = async ({
  context,
  core,
  google,
  github,
}: any): Promise<void> => {
  try {
    core.info("Starting Final Sync & Closure Process...");

    // Validate Environment
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

    // Extract Issue Data from Payload
    const issue = extractIssueData(context.payload);
    const repository = context.payload.repository;

    // Authenticate Target Client
    const githubClient = createGitHubClient(config.ISSUE_PROJECT_ACCESS_TOKEN);

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

    // Extract Google Doc ID from the origin issue
    const docMatch = issue.body?.match(GOOGLE_DOC_URL_REGEX);
    if (!docMatch?.[1]) {
      core.warning(
        "No Google Doc link found in the origin issue description. Closing mirrored issue without updating doc data.",
      );
      // Close the mirrored issue even if the doc link was removed
      await updateIssue(
        githubClient,
        config.TARGET_OWNER,
        config.TARGET_REPO,
        replicatedIssue.number,
        undefined,
        "closed",
        "completed",
      );

      // Comment on replicated issue
      await postComment(
        githubClient,
        config.TARGET_OWNER,
        config.TARGET_REPO,
        replicatedIssue.number,
        createClosureComment(replicatedIssue.html_url, false),
      );

      // Comment on original issue
      await postComment(
        github,
        context.repo.owner,
        context.repo.repo,
        context.issue.number,
        createClosureComment(replicatedIssue.html_url, true),
      );
      return;
    }

    const docId = docMatch[1];
    const docUrl = `https://docs.google.com/document/d/${docId}`;

    // Fetch Google Doc Content
    core.info("Fetching final state from Google Doc...");
    const markdownText = await fetchGoogleDocContent(docId, google);
    const incidentData = extractDocDetails(markdownText);

    // Sync Final Data to Project Board
    core.info("Syncing final data to GitHub Project Board...");
    const projectData = await getProjectData(
      githubClient.graphql,
      config.TARGET_OWNER,
      projectNumber,
    );

    const itemId = await addIssueToProject(
      githubClient.graphql,
      projectData.id,
      replicatedIssue.node_id,
    );

    core.startGroup("Syncing project fields...");
    await updateAllProjectFields(
      githubClient.graphql,
      projectData.id,
      itemId,
      projectData.fields.nodes,
      incidentData,
    );
    core.endGroup();
    core.info("Project Board updated successfully.");

    // Update Replicated Issue Body
    core.info("Updating replicated issue body...");
    const template = loadIncidentTemplate();
    const templateData = buildIncidentTemplateData(
      issue,
      repository,
      incidentData,
      docUrl,
    );
    const updatedBody = applyTemplateReplacements(template, templateData);

    await updateIssue(
      githubClient,
      config.TARGET_OWNER,
      config.TARGET_REPO,
      replicatedIssue.number,
      updatedBody,
      "closed",
      "completed",
    );

    core.info("Replicated issue body updated and closed.");
    core.info("Posting closure comments...");

    // Comment on replicated issue
    await postComment(
      githubClient,
      config.TARGET_OWNER,
      config.TARGET_REPO,
      replicatedIssue.number,
      createClosureComment(replicatedIssue.html_url, false),
    );

    // Comment on original issue
    await postComment(
      github,
      context.repo.owner,
      context.repo.repo,
      context.issue.number,
      createClosureComment(replicatedIssue.html_url, true),
    );

    core.notice("Workflow Complete: Issue synced and closed successfully.");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Closure Sync Failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      core.error(error.stack);
    }
  }
};
