import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMountedState } from 'react-use';
import {
  closestCenter,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  DndContext,
  DragOverlay,
  DropAnimation,
  getFirstCollision,
  UniqueIdentifier,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  Container,
  ContainerProps
} from './Container';

import { Item } from './Item';
import type { ItemType, FlattenedItem, TreeItems } from './types';
import {
  buildIdMapByDepth,
  buildTree,
  flattenTree,
  getChildCount,
  pluckItemIds,
  removeChildrenOf,
  setProperty
} from './utilities';

function DroppableContainer({
  children,
  depth,
  disabled,
  id,
  items,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
  depth: number;
  collapsed?: boolean;
}) {
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    transform,
  } = useSortable({
    id,
    data: {
      depth
    }
  });

  const isOverSameType = !!over && active?.data.current?.depth === over?.data.current?.depth;
  const isOverParentType = !!over && active?.data.current?.depth === over?.data.current?.depth + 1;
  const isOverCollapsedParentType = !!over && active?.data.current?.depth === undefined;
  const isOverContainer = over
    ? (isOverSameType && items.includes(over.id)) || (isOverParentType && id === over.id) || (isOverCollapsedParentType && !!active?.id && items.includes(active.id))
    : false;

  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverContainer}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      {...props}
    >
      {children}
    </Container>
  );
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

interface Props {
  wrapperStyle?(args: { index: number }): React.CSSProperties;
  defaultItems?: TreeItems;
}

const initialItems: TreeItems = [
  {
    id: 'Section 1',
    children: [],
  },
  {
    id: 'Section 2',
    children: [
      {
        id: 'Lesson 1',
        children: [
          { id: 'Topic 1', children: [] },
          { id: 'Topic 2', children: [] },
          { id: 'Topic 3', children: [] },
          { id: 'Topic 4', children: [] },
        ]
      },
      { id: 'Lesson 2', children: [] },
      { id: 'Lesson 3', children: [] },
      { id: 'Lesson 4', children: [] },
    ],
  },
  {
    id: 'Section 3',
    children: [],
  },
  {
    id: 'Section 4',
    children: [
      { id: 'Lesson 5', children: [] },
      {
        id: 'Lesson 6',
        children: [
          { id: 'Topic 5', children: [] },
          { id: 'Topic 6', children: [] },
        ]
      },
    ],
  },
];

const MEASURE_STRATEGY = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

function getItemType(depth: number): string {
  if (depth === 0) {
    return 'section';
  }

  if (depth === 1) {
    return 'lesson';
  }

  return 'topic';
}

export function MultipleNestedContainers({
  defaultItems = initialItems,
  wrapperStyle = () => ({}),
}: Props) {
  const [items, setItems] = useState<TreeItems>(
    () => defaultItems
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(items);

    // // Option 1) collapse items of the same depth of active item (causing strange UX)
    // const activeItem = flattenedTree.find(({ id }) => id === activeId)
    // const collapsedItems = flattenedTree.reduce<UniqueIdentifier[]>(
    //   (acc, { children, collapsed, id, depth }) =>
    //     (collapsed || activeItem?.depth === depth) && children.length ? [...acc, id] : acc,
    //   []
    // );

    // // Option 2) collapse already-collapsed items
    // const collapsedItems = flattenedTree.reduce<UniqueIdentifier[]>(
    //   (acc, { children, collapsed, id }) =>
    //     collapsed && children.length ? [...acc, id] : acc,
    //   []
    // );

    // Option 3) keep children of collapsed item
    const collapsedItems = []

    return removeChildrenOf(
      flattenedTree,
      activeId ? [activeId, ...collapsedItems] : collapsedItems
    );
  }, [activeId, items]);
  const idMapByDepth = useMemo(() => buildIdMapByDepth(flattenedItems), [flattenedItems]);
  const getDirectChildren = useCallback((id: UniqueIdentifier | null) =>
    flattenedItems.filter((item) => item.parentId === id), [flattenedItems]);
  const getItem = useCallback((id: UniqueIdentifier) =>
    flattenedItems.find((item) => item.id === id), [flattenedItems]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // cached previous over id, used to optimize transition to diff container
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  // indicator when dragged over diff container, reset upon items update on each frame refresh
  const recentlyMovedToNewContainer = useRef(false);
  // used to disable item sort when sorting container
  const isSortingSection = activeId ? idMapByDepth[0] && activeId in idMapByDepth[0] : false;
  const isSortingLesson = activeId ? idMapByDepth[1] && activeId in idMapByDepth[1] : false;

  /**
   * Custom collision detection strategy optimized for multiple containers
   *
   * - First, find any droppable containers intersecting with the pointer.
   * - If there are none, find intersecting containers with the active draggable.
   * - If there are no intersecting containers, return the last matched intersection
   *
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (!idMapByDepth.length) {
        return [];
      }

      // When dragging a section, limit droppables to other sections
      if (activeId && activeId in idMapByDepth[0]) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in idMapByDepth[0]
          ),
        });
      }

      /**
       * Use same detection when dragging lesson and topic with one exception, which 
       * topic can not be dropped directly in section but only nesting lessons.
       */
      const isDraggingLesson = activeId && idMapByDepth[1] && activeId in idMapByDepth[1];
      const isDraggingTopic = activeId && idMapByDepth[2] && activeId in idMapByDepth[2];
      const collisionArgs = { ...args };
      if (isDraggingTopic) {
        collisionArgs.droppableContainers = collisionArgs.droppableContainers.filter(
          (container) => !(container.id in idMapByDepth[0])
        );
      }

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(collisionArgs);
      const intersections =
        pointerIntersections.length > 0
          ? // If there are droppables intersecting with the pointer, return those
          pointerIntersections
          : rectIntersection(collisionArgs);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        // Limit droppable containers to parent containers
        const isDraggingLessonOverSection = isDraggingLesson && overId in idMapByDepth[0];
        const isDraggingTopicOverLesson = isDraggingTopic && overId in idMapByDepth[1];
        if (isDraggingLessonOverSection || isDraggingTopicOverLesson) {
          const containerItemsIndex = isDraggingLessonOverSection ? 0 : 1;
          const containerItems = idMapByDepth[containerItemsIndex][overId];

          // If a parent container is matched and it contains items
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              ),
            })[0]?.id || overId;
          }
        }

        lastOverId.current = overId;

        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }
      
      // If no droppable is matched, return the last match
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, idMapByDepth]
  );
  const [clonedItems, setClonedItems] = useState<TreeItems | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  return (
    <DndContext
      collisionDetection={collisionDetectionStrategy}
      measuring={MEASURE_STRATEGY}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={wrapperRef}
        style={{
          width: '500px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: 20
        }}
      >
        <SortableContext
          items={getDirectChildren(null)}
          strategy={verticalListSortingStrategy}
        >
          {getDirectChildren(null).map((section) => {
            const lessons = getDirectChildren(section.id);
            return (
              <DroppableContainer
                key={section.id}
                id={section.id}
                depth={section.depth}
                label={`${section.id}`}
                items={pluckItemIds(lessons)}
                collapsed={section.collapsed}
                onCollapse={() => handleCollapse(section.id)}
              >
                <SortableContext items={lessons} strategy={verticalListSortingStrategy}>
                  {lessons.map((lesson) => {
                    const topics = getDirectChildren(lesson.id);
                    return (
                      <DroppableContainer
                        key={lesson.id}
                        id={lesson.id}
                        depth={lesson.depth}
                        label={`${lesson.id}`}
                        items={pluckItemIds(topics)}
                        disabled={isSortingSection}
                        collapsed={lesson.collapsed}
                        onCollapse={() => handleCollapse(lesson.id)}
                      >
                        <SortableContext items={topics} strategy={verticalListSortingStrategy}>
                          {topics.map((topic, index) => (
                            <SortableItem
                              disabled={isSortingSection || isSortingLesson}
                              key={topic.id}
                              id={topic.id}
                              depth={topic.depth}
                              index={index}
                              wrapperStyle={wrapperStyle}
                            />
                          ))}
                        </SortableContext>
                      </DroppableContainer>
                    );
                  })}
                </SortableContext>
              </DroppableContainer>
            );
          })}
        </SortableContext>
      </div>
      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeId
            ? isSortingSection || isSortingLesson
              ? renderContainerDragOverlay(activeId)
              : renderSortableItemDragOverlay(activeId)
            : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );

  function renderSortableItemDragOverlay(id: UniqueIdentifier) {
    return (
      <Item
        value={id}
        wrapperStyle={wrapperStyle({ index: 0 })}
        dragOverlay
      />
    );
  }

  function renderContainerDragOverlay(containerId: UniqueIdentifier) {
    return (
      <Container
        label={`${containerId}`}
        style={{
          height: '100%',
        }}
        shadow
        clone
        collapsed
        childCount={getChildCount(items, containerId) + 1}
      />
    );
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id);
    setClonedItems(items);

    // set wrapper height to maintain scroll position
    if (wrapperRef.current) {
      const tmpHeight = wrapperRef.current.clientHeight;
      wrapperRef.current.style.setProperty('height', `${tmpHeight}px`);
    }
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (over == null || !idMapByDepth.length || active.id in idMapByDepth[0]) {
      return;
    }

    const overId = over.id;
    const activeItem = getItem(active.id);
    const overItem = getItem(overId);

    if (!activeItem || !overItem) {
      return;
    }

    const isDraggingOverSameDepthInDifferentParent =
      activeItem.depth === overItem.depth &&
      activeItem.parentId !== overItem.parentId;
    const isDraggingOverDifferentParent =
      activeItem.depth === overItem.depth + 1 &&
      activeItem.parentId !== overItem.id;

    if (isDraggingOverSameDepthInDifferentParent || isDraggingOverDifferentParent) {
      const clonedItems: FlattenedItem[] = JSON.parse(
        JSON.stringify(flattenTree(items))
      );

      const activeIndex = clonedItems.findIndex(({ id }) => id === active.id);
      const activeTreeItem = clonedItems[activeIndex];
      const overIndex = clonedItems.findIndex(({ id }) => id === overId);
      const overTreeItem = clonedItems[overIndex];
      const overChildCount = getChildCount(clonedItems, overId);

      let newIndex: number;
      let newParentId: UniqueIdentifier | null;

      // Dragging over a parent container (collapsed or empty container)
      if (isDraggingOverDifferentParent) {
        newIndex = overIndex + overChildCount + 1;
        newParentId = overId;
      } else {
        // Dragging over item of same depth in different parent container
        const isBelowOverItem =
          active.rect.current.translated &&
          active.rect.current.translated.top >
          over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 + overChildCount : 0;

        newIndex = overIndex + modifier;
        newParentId = overTreeItem.parentId;
      }

      recentlyMovedToNewContainer.current = true;

      clonedItems[activeIndex] = { ...activeTreeItem, parentId: newParentId };

      const sortedItems = arrayMove(clonedItems, activeIndex, newIndex);
      const newItems = buildTree(sortedItems);
      setItems(newItems);
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    /**
     * [handleDragOver] updates items when dragging item into different parent,
     * that includes uses cases of: 
     * 1. dragging into a collapsed parent (will place item as the last child)
     * 2. dragging into an empty parent
     * 3. dragging over an item in a different parent
     * But it does not include use case of when user continue dragging to change
     * order with items of the same depth.
     * For use cases [handleDragOver] does not cover, mostly sorting with other 
     * items within the same parent, the [handleDragEnd] will cover these and
     * update items.
     */
    if (over?.id && clonedItems) {
      const clonedItemsCurrent: FlattenedItem[] = JSON.parse(
        JSON.stringify(flattenTree(items))
      );
      const clonedItemsOriginal: FlattenedItem[] = JSON.parse(
        JSON.stringify(flattenTree(clonedItems))
      );
      const activeIndex = clonedItemsCurrent.findIndex(({ id }) => id === active.id);
      const activeTreeItem = clonedItemsCurrent[activeIndex];
      const overIndex = clonedItemsCurrent.findIndex(({ id }) => id === over.id);
      const overTreeItem = clonedItemsCurrent[overIndex];
      const activeIndexOriginal = clonedItemsOriginal.findIndex(({ id }) => id === active.id);
      const activeTreeItemOriginal = clonedItemsOriginal[activeIndexOriginal];

      const isDraggedIntoDifferentParent = activeTreeItem.parentId !== activeTreeItemOriginal.parentId;
      const isDraggedOverSibling = activeTreeItem.parentId === overTreeItem.parentId && active.id !== over.id;

      let newIndexOfParent = activeTreeItem.index;
      if (isDraggedOverSibling) {
        const sortedItems = arrayMove(clonedItemsCurrent, activeIndex, overIndex);
        const newItems = buildTree(sortedItems);

        const clonedNewItems: FlattenedItem[] = JSON.parse(
          JSON.stringify(flattenTree(newItems))
        );
        const newActiveTreeItem = clonedNewItems.find(({ id }) => id === active.id)!;
        newIndexOfParent = newActiveTreeItem.index;

        setItems(newItems);
      }

      if (isDraggedIntoDifferentParent || isDraggedOverSibling) {
        const payload = {
          id: active.id,
          type: getItemType(activeTreeItem.depth),
          newParentId: isDraggedIntoDifferentParent ? activeTreeItem.parentId : undefined,
          newIndex: newIndexOfParent
        }

        // TODO: call mutation to save sort. reset to original state if call fails.
        // Example: saveSort(payload).fail((err) => handleDragCancel());
      }
    }

    resetState();
  }

  function handleDragCancel() {
    if (clonedItems) {
      // Reset items to their original state in case items have been
      // Dragged across containers
      setItems(clonedItems);
    }

    resetState();
  };

  function handleCollapse(id: UniqueIdentifier) {
    setItems((items) =>
      setProperty(items, id, 'collapsed', (value) => {
        return !value;
      })
    );
  }

  function resetState() {
    setActiveId(null);
    setClonedItems(null);

    // reset wrapper height
    if (wrapperRef.current) {
      wrapperRef.current.style.setProperty('height', 'auto');
    }
  }
}

interface SortableItemProps {
  id: UniqueIdentifier;
  index: number;
  depth: number;
  disabled?: boolean;
  wrapperStyle({ index }: { index: number }): React.CSSProperties;
}

function SortableItem({
  depth,
  disabled,
  id,
  index,
  wrapperStyle,
}: SortableItemProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    isSorting,
    transform,
    transition,
  } = useSortable({
    id,
    data: {
      depth
    }
  });
  const mounted = useMountedState();
  const mountedWhileDragging = isDragging && !mounted;

  return (
    <Item
      ref={disabled ? undefined : setNodeRef}
      value={id}
      dragging={isDragging}
      sorting={isSorting}
      handleProps={{ ref: setActivatorNodeRef }}
      index={index}
      wrapperStyle={wrapperStyle({ index })}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
    />
  );
}
