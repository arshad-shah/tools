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

export type BodyType = "none" | "json" | "form-data" | "x-www-form-urlencoded";
export type RequestTypeMode = "rest" | "graphql";
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

// Request and collection types
export interface RequestItemType {
  id: string;
  type: "request";
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
  type: "folder";
  name: string;
  children: (RequestItemType | FolderItemType)[];
  description?: string; // Enhanced: Added description field
}

export type CollectionType = FolderItemType

// Environment variables support
export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

// Component Props
export type HeaderProps = object;

export interface TabProps {
  active: boolean;
  label: string;
  onClick: () => void;
  icon?: React.FC<{ className?: string }>;
}

export interface HeaderInputProps {
  header: HeaderType;
  index: number;
  onChange: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}

export interface ParamInputProps {
  param: ParamType;
  index: number;
  onChange: (index: number, field: string, value: unknown) => void;
  onRemove: (index: number) => void;
}

export interface CodeEditorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  language?: string;
  readOnly?: boolean;
}

export interface ResponseSectionProps {
  response: ResponseType | null;
  isLoading: boolean;
}

export interface CollectionItemProps {
  item: RequestItemType | FolderItemType;
  onSelect: (request: RequestItemType) => void;
  isSelected: string | null;
  onEdit?: (item: RequestItemType | FolderItemType) => void;
  onDelete?: (id: string, type: string) => void;
  onDuplicate?: (item: RequestItemType) => void;
}

export interface SaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  name: string;
  setName: (name: string) => void;
  collections?: CollectionType[]; // Enhanced: Allow selecting collection
  selectedCollection?: string;
  setSelectedCollection?: (id: string) => void;
}

export interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  description?: string;
  setDescription?: (description: string) => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export interface SidebarProps {
  collections: CollectionType[];
  selectedRequest: string | null;
  onSelectRequest: (request: RequestItemType) => void;
  onCreateRequest: () => void;
  onCreateCollection: () => void;
  onEditCollection?: (collection: CollectionType) => void;
  onDelete?: (id: string,type:string) => void;
}

export interface RequestPanelProps {
  requestType: RequestTypeMode;
  method: string;
  url: string;
  headers: HeaderType[];
  params: ParamType[];
  bodyType: BodyType;
  body: string;
  graphqlQuery: string;
  graphqlVariables: string;
  buildUrl: () => string;
  onMethodChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHeaderChange: (index: number, field: string, value: string) => void;
  onAddHeader: () => void;
  onRemoveHeader: (index: number) => void;
  onParamChange: (index: number, field: string, value: unknown) => void;
  onAddParam: () => void;
  onRemoveParam: (index: number) => void;
  onBodyTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBodyChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onGraphqlQueryChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onGraphqlVariablesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSendRequest: () => Promise<void>;
}
