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
import { GraphQLFunction } from "./project-v2-types";

/**
 * Minimal shape for a GitHub issue returned by the REST API.
 */
export interface IssueDetails {
  number: number;
  html_url: string;
  node_id: string;
  state: "open" | "closed";
}

/**
 * Minimal shape for a GitHub issue comment returned by the REST API.
 */
export interface IssueCommentData {
  user: { login: string } | null;
  body: string | undefined;
}

export interface IssueUser {
  login: string;
}

/**
 * Type definitions for GitHub issue data used in the project.
 */
export interface IssueData {
  number: number;
  title: string;
  body: string | null;
  user: string | null;
  html_url: string;
  assignees: string[];
  state: string;
  updated_at: string;
  closed_at: string | null;
  labels: string[];
}

export interface RepositoryData {
  full_name: string;
}

/**
 * Raw GitHub webhook issue payload shape — object arrays before normalization.
 */
interface RawIssueLabel {
  name: string;
}

interface RawIssue {
  number: number;
  title: string;
  body: string | null;
  user: IssueUser | null;
  html_url: string;
  assignees: IssueUser[];
  state: string;
  updated_at: string;
  closed_at: string | null;
  labels: RawIssueLabel[];
}

export interface IssuePayload {
  issue: RawIssue;
  repository: RepositoryData;
}

/**
 * Type definitions for Octokit REST API
 */
export interface OctokitClient {
  rest: {
    issues: {
      create: (params: {
        owner: string;
        repo: string;
        title: string;
        body: string;
        labels?: string[];
        assignees?: string[];
      }) => Promise<{
        data: { node_id: string; html_url: string; number: number };
      }>;

      createComment: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }) => Promise<unknown>;

      getLabel: (params: {
        owner: string;
        repo: string;
        name: string;
      }) => Promise<unknown>;

      createLabel: (params: {
        owner: string;
        repo: string;
        name: string;
        color: string;
        description: string;
      }) => Promise<unknown>;

      update: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        state?: "open" | "closed";
        state_reason?: string;
        body?: string;
        labels?: string[];
      }) => Promise<{ data: unknown }>;

      get: (params: {
        owner: string;
        repo: string;
        issue_number: number;
      }) => Promise<{ data: IssueDetails }>;

      listComments: (params: {
        owner: string;
        repo: string;
        issue_number: number;
      }) => Promise<{ data: IssueCommentData[] }>;
    };
  };
  graphql: GraphQLFunction;
  paginate: (method: Function, params: object) => Promise<any[]>;
}
