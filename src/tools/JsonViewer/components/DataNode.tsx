/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  Info,
} from 'lucide-react';
import {
  Badge,
  Box,
  Code,
  IconButton,
  Inline,
  Text,
  Tooltip,
} from '@arshad-shah/cynosure-react';

type NodeColor = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const getNodeTypeInfo = (
  data: any,
): { icon: typeof FileText; color: NodeColor; label: string } => {
  if (data === null) return { icon: AlertCircle, color: 'neutral', label: 'null' };
  if (Array.isArray(data))
    return { icon: FolderOpen, color: 'accent', label: `Array (${data.length})` };
  if (typeof data === 'object')
    return {
      icon: Folder,
      color: 'accent',
      label: `Object (${Object.keys(data).length})`,
    };
  if (typeof data === 'string')
    return { icon: FileText, color: 'success', label: 'string' };
  if (typeof data === 'number')
    return { icon: Info, color: 'accent', label: 'number' };
  if (typeof data === 'boolean')
    return { icon: Info, color: 'warning', label: data ? 'true' : 'false' };
  return { icon: FileText, color: 'neutral', label: typeof data };
};

const formatValue = (value: any): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
};

const DataNode: React.FC<{
  name: string;
  data: any;
  depth: number;
  onToggle: () => void;
  isExpanded: boolean;
  isMatched: boolean;
  onCopyPath: () => void;
  onCopyValue: () => void;
}> = ({
  name,
  data,
  depth,
  onToggle,
  isExpanded,
  isMatched,
  onCopyPath,
  onCopyValue,
}) => {
  const { icon: TypeIcon, color, label } = getNodeTypeInfo(data);
  const isExpandable = data !== null && typeof data === 'object';
  const nodeValue = !isExpandable ? formatValue(data) : null;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <Inline
      align="center"
      gap="2"
      paddingY="1"
      paddingX="2"
      style={{
        paddingLeft: `${depth * 1.25 + 0.5}rem`,
        borderLeft: isMatched ? '2px solid currentColor' : '2px solid transparent',
      }}
    >
      <Box width="4">
        {isExpandable ? (
          <IconButton
            variant="ghost"
            colorScheme="neutral"
            size="sm"
            label={isExpanded ? 'Collapse' : 'Expand'}
            icon={<ChevronIcon size={14} />}
            onClick={onToggle}
          />
        ) : null}
      </Box>

      <Badge variant="soft" colorScheme={color} size="xs">
        <TypeIcon size={12} aria-hidden />
      </Badge>

      {name !== 'root' && (
        <Text size="sm" weight="medium">
          {name}
        </Text>
      )}

      {isExpandable && (
        <Badge variant="soft" colorScheme="neutral" size="xs">
          {label}
        </Badge>
      )}

      {nodeValue && <Code size="sm">{nodeValue}</Code>}

      <Box flex="1" />

      <Inline gap="1">
        <Tooltip content="Copy path">
          <IconButton
            variant="ghost"
            colorScheme="neutral"
            size="sm"
            label="Copy path"
            icon={<ExternalLink size={12} />}
            onClick={onCopyPath}
          />
        </Tooltip>
        <Tooltip content="Copy value">
          <IconButton
            variant="ghost"
            colorScheme="neutral"
            size="sm"
            label="Copy value"
            icon={<Copy size={12} />}
            onClick={onCopyValue}
          />
        </Tooltip>
      </Inline>
    </Inline>
  );
};

export default DataNode;
