import type { UniqueIdentifier } from "@dnd-kit/core";
import type { FlattenedItem, TreeItem, TreeItems } from "./types";

function flatten(
  items: TreeItems,
  parentId: UniqueIdentifier | null = null,
  depth = 0
): FlattenedItem[] {
  return items.reduce<FlattenedItem[]>((acc, item, index) => {
    return [
      ...acc,
      { ...item, parentId, depth, index },
      ...flatten(item.children, item.id, depth + 1),
    ];
  }, []);
}

export function flattenTree(items: TreeItems): FlattenedItem[] {
  return flatten(items);
}

export function buildTree(flattenedItems: FlattenedItem[]): TreeItems {
  const root: TreeItem = { id: 'root', children: [] };
  const nodes: Record<string, TreeItem> = { [root.id]: root };
  const items = flattenedItems.map((item) => ({ ...item, children: [] }));

  for (const item of items) {
    const { id, children, collapsed } = item;
    const parentId = item.parentId ?? root.id;
    const parent = nodes[parentId] ?? findItem(items, parentId);

    nodes[id] = { id, children };
    parent.children.push({ id, children, collapsed });
  }

  return root.children;
}

export function buildIdMapByDepth(flattenedItems: FlattenedItem[]) {
  const map: Record<UniqueIdentifier, UniqueIdentifier[]>[] = [];

  for (const item of flattenedItems) {
    const { id, children, depth, collapsed } = item;
    if (!(depth in map)) {
      map[depth] = {};
    }
    if (!(id in map[depth])) {
      map[depth][id] = [];
    }
    map[depth][id].push(...pluckItemIds(children));
  }

  return map;
}

export function findItem(flattenItems: FlattenedItem[], itemId: UniqueIdentifier) {
  return flattenItems.find(({ id }) => id === itemId);
}

export function findItemDeep(
  items: TreeItem[],
  itemId: UniqueIdentifier
): TreeItem | undefined {
  for (const item of items) {
    const { id, children } = item;

    if (id === itemId) {
      return item;
    }

    if (children.length) {
      const child = findItemDeep(children, itemId);

      if (child) {
        return child;
      }
    }
  }

  return undefined;
}

export function setProperty<T extends keyof TreeItem>(
  items: TreeItems,
  id: UniqueIdentifier,
  property: T,
  setter: (value: TreeItem[T]) => TreeItem[T]
) {
  for (const item of items) {
    if (item.id === id) {
      item[property] = setter(item[property]);
      continue;
    }

    if (item.children.length) {
      item.children = setProperty(item.children, id, property, setter);
    }
  }

  return [...items];
}

export function pluckItemIds(items: FlattenedItem[] | TreeItems) {
  return items.map((item) => item.id);
}

function countChildren(items: TreeItem[], count = 0): number {
  return items.reduce((acc, { children }) => {
    if (children.length) {
      return countChildren(children, acc + 1);
    }

    return acc + 1;
  }, count);
}

export function getChildCount(items: TreeItems, id: UniqueIdentifier) {
  const item = findItemDeep(items, id);

  return item ? countChildren(item.children) : 0;
}

export function removeChildrenOf(
  items: FlattenedItem[],
  ids: UniqueIdentifier[]
) {
  const excludeParentIds = [...ids];

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.includes(item.parentId)) {
      if (item.children.length) {
        excludeParentIds.push(item.id);
      }
      return false;
    }

    return true;
  });
}

export function getTopParentId(
  items: TreeItem[], 
  itemId: UniqueIdentifier,
  currentTopParentId: UniqueIdentifier | null = null,
): UniqueIdentifier | undefined {
  for (const item of items) {
    const { id, children } = item;

    // Queried item is already top parent
    if (id === itemId && currentTopParentId === null) {
      return itemId;
    }

    // Queried item is child of current top parent
    if (id === itemId && currentTopParentId !== null) {
      return currentTopParentId;
    }

    if (children.length) {
      const childTopParentId = getTopParentId(
        children, 
        itemId,
        currentTopParentId || id
      );

      if (childTopParentId) {
        return childTopParentId;
      }
    }
  }

  return undefined;
}
