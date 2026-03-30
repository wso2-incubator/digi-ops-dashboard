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

export interface GoogleAuth {
  OAuth2: new (clientId: string, clientSecret: string) => GoogleOAuth2Client;
}

export interface GoogleOAuth2Client {
  setCredentials: (credentials: { refresh_token: string }) => void;
}

export interface GoogleDriveFiles {
  export: (params: {
    fileId: string;
    mimeType: string;
  }) => Promise<{ data: string }>;
}

export interface GoogleDrive {
  files: GoogleDriveFiles;
}

export interface GoogleApis {
  auth: GoogleAuth;
  drive: (config: { version: string; auth: GoogleOAuth2Client }) => GoogleDrive;
}
