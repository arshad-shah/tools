// src/components/SortableList.tsx

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

// Types for drag and drop attributes and listeners
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

type DragAttributes = Partial<DraggableAttributes>;
type DragListeners = SyntheticListenerMap | undefined;

export interface SortableListProps<T> {
  /** Array of items to be sorted */
  items: T[];
  /** Function to get unique ID from item */
  getItemId: (item: T) => string;
  /** Callback when items are reordered */
  onReorder: (items: T[]) => void;
  /** Render function for each item */
  renderItem: (item: T, index: number, isDragging: boolean, attributes: DragAttributes, listeners: DragListeners) => React.ReactNode;
  /** Additional className for the list container */
  className?: string;
  /** Whether drag and drop is disabled */
  disabled?: boolean;
  /** Custom drag handle component */
  dragHandle?: boolean;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Enable mobile-friendly reorder buttons */
  mobileReorderButtons?: boolean;
  /** Touch sensor configuration for mobile devices */
  touchConfig?: {
    /** Delay in milliseconds before drag starts on touch devices (default: 150) */
    delay?: number;
    /** Tolerance in pixels for touch movement during delay (default: 12) */
    tolerance?: number;
  };
}

/**
 * Individual sortable item component
 */
interface SortableItemProps<T> {
  item: T;
  index: number;
  getItemId: (item: T) => string;
  renderItem: (item: T, index: number, isDragging: boolean, attributes: DragAttributes, listeners: DragListeners) => React.ReactNode;
  dragHandle?: boolean;
  mobileReorderButtons?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  totalItems?: number;
}

function SortableItem<T>({ 
  item, 
  index, 
  getItemId, 
  renderItem, 
  dragHandle = true,
  mobileReorderButtons = true,
  onMoveUp,
  onMoveDown,
  totalItems,
}: SortableItemProps<T>) {
  const id = getItemId(item);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: dragHandle ? 'manipulation' : 'none', // Allow scrolling when drag handle is used, prevent when not
      }}
      className={cn(
        'relative group transition-all duration-200',
        isDragging ? 'z-50 opacity-75 scale-105 shadow-xl sortable-item-dragging' : 'z-auto opacity-100 scale-100'
      )}
      data-dnd-kit-draggable
      {...(dragHandle ? {} : { ...attributes, ...listeners })}
    >
      {renderItem(item, index, isDragging, attributes, dragHandle ? undefined : listeners)}
      
      {/* Default drag handle if enabled */}
      {dragHandle && (
        <div
          className={cn(
            'absolute left-1 top-1/2 -translate-y-1/2 p-2 rounded-md cursor-grab active:cursor-grabbing',
            'opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200',
            'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80',
            'select-none z-10',
            'min-w-[44px] min-h-[44px] flex items-center justify-center', // Larger touch target for mobile
            'touch-none' // Prevent browser touch behaviors
          )}
          style={{ touchAction: 'none' }} // Ensure touch events work properly
          data-dnd-kit-drag-handle
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} className="md:w-4 md:h-4" />
        </div>
      )}

      {/* Mobile reorder buttons */}
      {mobileReorderButtons && (
        <div className="md:hidden absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
          <button
            onClick={() => onMoveUp?.(index)}
            disabled={index === 0}
            className={cn(
              'p-1 rounded-md bg-white shadow-md border border-slate-300',
              'text-slate-600 hover:text-slate-800 hover:bg-slate-50 active:bg-slate-100',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'transition-all duration-200 min-w-[28px] min-h-[28px] flex items-center justify-center',
              'select-none' // Prevent text selection
            )}
            style={{ touchAction: 'manipulation' }} // Allow fast tap without zoom
            aria-label="Move up"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={() => onMoveDown?.(index)}
            disabled={index === (totalItems || 0) - 1}
            className={cn(
              'p-1 rounded-md bg-white shadow-md border border-slate-300',
              'text-slate-600 hover:text-slate-800 hover:bg-slate-50 active:bg-slate-100',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'transition-all duration-200 min-w-[28px] min-h-[28px] flex items-center justify-center',
              'select-none' // Prevent text selection
            )}
            style={{ touchAction: 'manipulation' }} // Allow fast tap without zoom
            aria-label="Move down"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Professional drag and drop sortable list component
 * Uses @dnd-kit for excellent mobile and accessibility support
 */
export function SortableList<T>({
  items,
  getItemId,
  onReorder,
  renderItem,
  className,
  disabled = false,
  dragHandle = true,
  gap = 'md',
  mobileReorderButtons = true,
  touchConfig,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mobile reorder functions
  const moveItemUp = (index: number) => {
    if (index > 0) {
      const newItems = arrayMove(items, index, index - 1);
      onReorder(newItems);
    }
  };

  const moveItemDown = (index: number) => {
    if (index < items.length - 1) {
      const newItems = arrayMove(items, index, index + 1);
      onReorder(newItems);
    }
  };

  const sensors = useSensors(
    // Mouse/Pointer sensor for desktop
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    // Touch sensor for mobile devices with configurable settings
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: touchConfig?.delay ?? 150, // Configurable delay for mobile
        tolerance: touchConfig?.tolerance ?? 12, // Configurable tolerance for mobile touch precision
      },
    }),
    // Keyboard sensor for accessibility
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => getItemId(item) === active.id);
      const newIndex = items.findIndex(item => getItemId(item) === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Get the currently dragged item for overlay
  const activeItem = activeId ? items.find(item => getItemId(item) === activeId) : null;
  const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

  const gapClasses = {
    sm: 'space-y-1',
    md: 'space-y-2',
    lg: 'space-y-4',
  };

  if (disabled) {
    return (
      <div className={cn('space-y-2', className)}>
        {items.map((item, index) => (
          <div key={getItemId(item)}>
            {renderItem(item, index, false, {}, undefined)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext 
        items={items.map(getItemId)} 
        strategy={verticalListSortingStrategy}
      >
        <div className={cn(gapClasses[gap], 'sortable-list-container', className)}>
          {items.map((item, index) => (
            <SortableItem
              key={getItemId(item)}
              item={item}
              index={index}
              getItemId={getItemId}
              renderItem={renderItem}
              dragHandle={dragHandle}
              mobileReorderButtons={mobileReorderButtons}
              onMoveUp={moveItemUp}
              onMoveDown={moveItemDown}
              totalItems={items.length}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? (
          <div className="bg-white shadow-2xl rounded-xl border-2 border-blue-200 opacity-90">
            {renderItem(activeItem, activeIndex, true, {}, undefined)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default SortableList;