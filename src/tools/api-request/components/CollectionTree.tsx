import React, { useState } from 'react';
import {
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconTrash2,
} from '@/shared/ui/icons';

import {
  Badge,
  Box,
  Card,
  CardBody,
  IconButton,
  Indent,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { CollectionType, FolderItemType, RequestItemType } from '../types';

const methodColor = (
  method: string,
): 'success' | 'warning' | 'accent' | 'danger' | 'neutral' => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'success';
    case 'POST':
      return 'accent';
    case 'PUT':
      return 'warning';
    case 'PATCH':
      return 'warning';
    case 'DELETE':
      return 'danger';
    default:
      return 'neutral';
  }
};

interface CollectionItemProps {
  item: RequestItemType | FolderItemType;
  depth: number;
  selectedRequest: string | null;
  onSelectRequest: (req: RequestItemType) => void;
  onDelete: (id: string, type: 'folder' | 'request') => void;
}

const CollectionItem: React.FC<CollectionItemProps> = ({
  item,
  depth,
  selectedRequest,
  onSelectRequest,
  onDelete,
}) => {
  const [open, setOpen] = useState(true);
  if (item.type === 'folder') {
    return (
      <Stack gap="1">
        <Indent level={depth} step={12}>
          <Inline align="center" gap="2">
            <IconButton
              variant="ghost"
              size="sm"
              label={open ? 'Collapse' : 'Expand'}
              icon={
                open ? (
                  <IconChevronDown size="sm" />
                ) : (
                  <IconChevronRight size="sm" />
                )
              }
              onClick={() => setOpen(!open)}
            />
            <IconFolder size="sm" />
            <Text size="sm" weight="medium">
              {item.name}
            </Text>
            <Box className="flex-1" />
            <IconButton
              variant="ghost"
              size="sm"
              label="Delete folder"
              icon={<IconTrash2 size="sm" />}
              onClick={() => onDelete(item.id, 'folder')}
            />
          </Inline>
        </Indent>
        {open && (
          <Stack gap="1">
            {item.children.map((child) => (
              <CollectionItem
                key={child.id}
                item={child}
                depth={depth + 1}
                selectedRequest={selectedRequest}
                onSelectRequest={onSelectRequest}
                onDelete={onDelete}
              />
            ))}
          </Stack>
        )}
      </Stack>
    );
  }

  const isSelected = selectedRequest === item.id;
  return (
    <Indent level={depth} step={12}>
      <Card
        interactive
        onClick={() => onSelectRequest(item)}
        className={isSelected ? 'border-accent' : undefined}
      >
        <CardBody>
          <Inline justify="between" align="center" gap="2" wrap>
            <Inline align="center" gap="2">
              <Badge variant="solid" tone={methodColor(item.method)} size="xs">
                {item.method}
              </Badge>
              <Text size="sm" weight="medium" className="truncate">
                {item.name}
              </Text>
            </Inline>
            <IconButton
              variant="ghost"
              size="sm"
              label="Delete request"
              icon={<IconTrash2 size="sm" />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id, 'request');
              }}
            />
          </Inline>
        </CardBody>
      </Card>
    </Indent>
  );
};

interface CollectionTreeProps {
  collections: CollectionType[];
  selectedRequest: string | null;
  onSelectRequest: (req: RequestItemType) => void;
  onDelete: (id: string, type: 'folder' | 'request') => void;
}

export const CollectionTree: React.FC<CollectionTreeProps> = ({
  collections,
  selectedRequest,
  onSelectRequest,
  onDelete,
}) => (
  <Stack gap="2">
    {collections.length === 0 ? (
      <Text size="sm" tone="subtle" className="text-center">
        No collections yet. Click + to create one.
      </Text>
    ) : (
      collections.map((c) => (
        <CollectionItem
          key={c.id}
          item={c}
          depth={0}
          selectedRequest={selectedRequest}
          onSelectRequest={onSelectRequest}
          onDelete={onDelete}
        />
      ))
    )}
  </Stack>
);
