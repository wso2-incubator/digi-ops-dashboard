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
import fs from "fs";
import path from "path";
import { IncidentFieldData } from "../types/incident-field-types";
import { IssueData, RepositoryData } from "../types/github-types";

/**
 * Loads the incident issue template from the repository.
 */
export function loadIncidentTemplate(): string {
  const templatePath = path.join(
    process.env.GITHUB_WORKSPACE || ".",
    ".github/templates/issue-description.md",
  );

  try {
    return fs.readFileSync(templatePath, "utf8");
  } catch {
    throw new Error(`Incident template not found at: ${templatePath}.`);
  }
}

export function buildIncidentTemplateData(
  issue: IssueData,
  repository: RepositoryData,
  incidentData: IncidentFieldData,
  docUrl: string,
): Record<string, string> {
  return {
    "{{DESCRIPTION}}": issue.body || "",
    "{{INCIDENT_NUMBER}}": incidentData.incidentNumber,
    "{{REPO_NAME}}": repository.full_name || "",
    "{{ISSUE_NUMBER}}": issue.number.toString(),
    "{{ISSUE_URL}}": issue.html_url,
    "{{AUTHOR}}": issue.user || "Unknown",
    "{{GOOGLE_DOC_URL}}": docUrl,
  };
}

/**
 * Replaces template placeholders in the issue body with actual values.
 */
export function applyTemplateReplacements(
  template: string,
  templateData: Record<string, string>,
): string {
  let result = template;
  for (const [placeholder, value] of Object.entries(templateData)) {
    result = result.split(placeholder).join(value || "");
  }
  return result;
}
