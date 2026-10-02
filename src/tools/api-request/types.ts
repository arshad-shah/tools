// Type definitions for the API Tester application

// Basic types
export interface HeaderType {
  key: string;
  value: string;
}

export interface ParamType {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ResponseType {
  status: number;
  statusText: string;
  time?: number;
  headers: Record<string, string>;
  data: unknown;
}

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded';
export type RequestTypeMode = 'rest' | 'graphql';

// Request and collection types
export interface RequestItemType {
  id: string;
  type: 'request';
  name: string;
  method: string;
  url: string;
  requestType?: RequestTypeMode;
  headers?: HeaderType[];
  params?: ParamType[];
  bodyType?: BodyType;
  body?: string;
  graphqlQuery?: string;
  graphqlVariables?: string;
  description?: string; // Enhanced: Added description field
  tags?: string[]; // Enhanced: Added tags for organization
  createdAt?: number; // Enhanced: Timestamp tracking
  updatedAt?: number; // Enhanced: Timestamp tracking
}

export interface FolderItemType {
  id: string;
  type: 'folder';
  name: string;
  children: (RequestItemType | FolderItemType)[];
  description?: string; // Enhanced: Added description field
}

export type CollectionType = FolderItemType;

export type RequestTab = 'params' | 'headers' | 'body';
export type ResponseTab = 'body' | 'headers';
