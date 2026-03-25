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
import { GoogleApis } from "../types/google-api-types";
import { validateEnv } from "../utils/issue-helpers";

/**
 * Authenticates with Google Drive API and exports a Google Doc as Markdown.
 * Uses OAuth2 with a refresh token for server-to-server authentication.
 */
export async function fetchGoogleDocContent(
  docId: string,
  google: GoogleApis,
): Promise<string> {
  try {
    // Validate Environment
    const config = {
      CLIENT_ID: (process.env.GCP_CLIENT_ID || "").trim(),
      CLIENT_SECRET: (process.env.GCP_CLIENT_SECRET || "").trim(),
      REFRESH_TOKEN: (process.env.GCP_REFRESH_TOKEN || "").trim(),
    };

    validateEnv(config);

    const auth = new google.auth.OAuth2(config.CLIENT_ID, config.CLIENT_SECRET);
    auth.setCredentials({ refresh_token: config.REFRESH_TOKEN });
    const drive = google.drive({ version: "v3", auth });
    const response = await drive.files.export({
      fileId: docId,
      mimeType: "text/markdown",
    });

    console.log("Google doc content fetched.");
    return response.data;
  } catch (error: unknown) {
    console.error(`Google Error Details:`);
    if (error && typeof error === "object" && "response" in error) {
      const errorWithResponse = error as {
        response: { status: number; data: unknown };
      };
      console.error(`   Status: ${errorWithResponse.response.status}`);
      console.error(
        `   Data: ${JSON.stringify(errorWithResponse.response.data)}`,
      );
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`   Message: ${errorMessage}`);
    }
    throw error;
  }
}
