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
import { GOOGLE_DOC_URL_REGEX, INCIDENT_LABEL_NAME } from "../utils/consts";
import { extractDocDetails, extractIssueData } from "../utils/parsers";
import { fetchGoogleDocContent } from "../services/google-services";
import {
  getProjectData,
  addIssueToProject,
} from "../services/project-v2-services";
import {
  validateEnv,
  createReplicationComment,
  updateAllProjectFields,
} from "../utils/issue-helpers";
import {
  ensureLabelExists,
  createIssue,
  handleProjectSyncFailure,
  postComment,
} from "../services/github-services";
import {
  applyTemplateReplacements,
  buildIncidentTemplateData,
  loadIncidentTemplate,
} from "../services/template-services";
import { createGitHubClient } from "../clients/github-client";

/**
 * Security Incident Issue Replicator
 *
 * This module handles the automated replication of security incident reports from Google Docs
 * to a centralised GitHub repository with full GitHub Projects V2 integration.
 *
 * Workflow:
 * 1. Validates environment configuration
 * 2. Extracts Google Doc ID from issue description
 * 3. Fetches and parses the Google Doc as Markdown
 * 4. Extracts all incident field data
 * 5. Creates a formatted replicated issue in the target repository
 * 6. Syncs all incident data to GitHub Projects V2 custom fields
 * 7. Posts a comment on the original issue with a link to the replicated issue
 */
module.exports = async ({
  context,
  core,
  google,
  github,
}: any): Promise<void> => {
  try {
    core.info("Starting Issue Replication Workflow...");

    if (!context.payload.issue) {
      throw new Error("No issue payload found.");
    }

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
    core.info(`Processing issue #${issue.number}: ${issue.title}`);

    // Google Doc Link
    const docMatch = issue.body?.match(GOOGLE_DOC_URL_REGEX);
    if (!docMatch?.[1]) {
      core.warning(
        "No Google Doc link found in issue description. Skipping replication.",
      );
      return;
    }

    const docId = docMatch[1];
    const docUrl = `https://docs.google.com/document/d/${docId}`;
    core.notice(`Security Incident Report Found`);

    // Fetch Google Doc Content
    core.info("Fetching Google Doc content...");
    let markdownText = "";
    try {
      markdownText = await fetchGoogleDocContent(docId, google);
    } catch (googleError: unknown) {
      const errorMessage =
        googleError instanceof Error
          ? googleError.message
          : String(googleError);
      throw new Error(`Failed to read Google Doc: ${errorMessage}`);
    }

    // Extract Incident Data
    core.info("Extracting incident field data...");
    const incidentData = extractDocDetails(markdownText);

    // Generate Issue Body
    core.info("Generating issue body from template...");
    const template = loadIncidentTemplate();
    const templateData = buildIncidentTemplateData(
      issue,
      repository,
      incidentData,
      docUrl,
    );
    const issueBody = applyTemplateReplacements(template, templateData);

    // Authenticate Target Client
    const githubClient = createGitHubClient(config.ISSUE_PROJECT_ACCESS_TOKEN);

    await ensureLabelExists(
      githubClient,
      config.TARGET_OWNER,
      config.TARGET_REPO,
      core,
    );

    // Create Replicated Issue
    core.info(
      `Creating replicated issue in https://github.com/${config.TARGET_OWNER}/${config.TARGET_REPO}`,
    );

    const newTitle = `${issue.title} [Origin: ${INCIDENT_LABEL_NAME}]`;
    const newIssue = await createIssue(
      githubClient,
      config.TARGET_OWNER,
      config.TARGET_REPO,
      newTitle,
      issueBody,
      [...issue.labels, INCIDENT_LABEL_NAME],
      issue.assignees ?? undefined,
    );

    core.notice(`Replicated issue created: ${newIssue.html_url}`);

    // Sync to GitHub Projects V2
    core.info("Syncing to GitHub Project Board...");

    try {
      const projectData = await getProjectData(
        githubClient.graphql,
        config.TARGET_OWNER,
        projectNumber,
      );

      if (!newIssue.node_id) {
        throw new Error(
          "GitHub API did not return a node_id for the newly created issue.",
        );
      }

      const itemId = await addIssueToProject(
        githubClient.graphql,
        projectData.id,
        newIssue.node_id,
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

      core.notice("Successfully synced data to Project V2!");
    } catch (projectError: unknown) {
      const errorMessage =
        projectError instanceof Error
          ? projectError.message
          : String(projectError);

      core.error(
        `Project sync failed: ${errorMessage}. Initiating rollback...`,
      );

      await handleProjectSyncFailure(
        githubClient,
        config.TARGET_OWNER,
        config.TARGET_REPO,
        newIssue.number,
        errorMessage,
        issue.labels,
        INCIDENT_LABEL_NAME,
        core,
      );

      throw new Error(
        `Transaction failed during Project mapping: ${errorMessage}`,
      );
    }

    // Post Success Comment
    core.info("Posting success notification on original issue...");
    try {
      await postComment(
        github,
        context.repo.owner,
        context.repo.repo,
        context.issue.number,
        createReplicationComment(newIssue.html_url, newIssue.number),
      );
    } catch (commentError: unknown) {
      const errorMessage =
        commentError instanceof Error
          ? commentError.message
          : String(commentError);
      core.warning(
        `Replicated issue was created, but failed to leave a comment on the origin issue: ${errorMessage}`,
      );
    }

    core.notice("Workflow Complete: Issue replicated and synced successfully.");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Replication Failed: ${errorMessage}`);

    if (error instanceof Error && error.stack) {
      core.error(error.stack);
    }
  }
};
