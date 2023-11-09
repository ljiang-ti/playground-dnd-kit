# Example for multiple nested containers

Given a data structure of multiple-levelled parent-and-child hierarchy, this use case builds the sorting function to drag an item to swap positions with other items of the same level. The item can be dragged within its parent or into a different parent item. The example is limited to 3 levels maximum.

## Explaination with example data structure

For example, with a data structure like below:

```
[
  {
    id: 'Section 1',
    children: [],
  },
  {
    id: 'Section 2',
    children: [
      {
        id: 'Lesson 1',
        children: []
      }
    ],
  },
  {
    id: 'Section 3',
    children: [
      {
        id: 'Lesson 2',
        children: [
          { id: 'Topic 1', children: [] },
          { id: 'Topic 2', children: [] },
        ]
      },
      { id: 'Lesson 3', children: [] },
    ],
  },
]
```

We will refer to the top level items as section containers, the 2nd level items as lesson containers, and the 3rd level items as topics.

It renders 3 section containers and there are lesson containers nested within each section containers. The topic items are nested within its corresponding lesson containers.

During dragging:

- when dragging a section container:
  - it is limited to swapping positions with other section containers.
  - if the section contains any lesson or topic items, the section container is collapsed and an indicator shows the count of total items being dragged.
- when dragging a lesson container:
  - it is limited to swapping positions with other lesson containers or different section containers. The other lesson containers could be either its siblings under the same section container or ones nested in a different section container.
  - if the lesson contains any topics, the lesson container is collapsed and an indicator shows the count of total items being dragged.
- when dragging a topic:
  - it is limited to swapping positions with other topics or different lesson containers. The other topics could be either its siblings under the same lesson container or ones nested in a different lesson container.

When dragging ends:

- any collapsed section or lesson containers will be expanded.
- the initial data structure is updated to reflect the new sort order.

## Inspirations

This use case is inspired by two existing examples from the dnd kit library: sorting multiple containers (vertical) and sorting tree (collapsible).

### About dnd kit's example for sorting multiple containers (vertical)

The sorting multiple containers example uses a data structure of 2-levelled parent-and-child hierarchy. The example renders the parent level items as containers and child level items as items. The similar sorting rules apply where the item being dragged is limited to swap positions with ones of the same level or higher.

The example represents the data with id mappings. See example below:

```
{
  A: [ 'A1', 'A2' ],
  B: [ 'B1', 'B2' ]
}
```

It uses a custom collision detection strategy to apply the sorting rules:

- when dragging a parent container, limit its droppable items of other parent containers.
- when dragging a child item, optimize the collision detection to find first the interactions with pointer collision (likely colliding with another item), then it fallbacks to bounding box collision (likely colliding with a parent container). If it collides with a parent container which contains items, then optimize further the collision detection to find the closest item within the parent container.
- when dragging a child item and no collision is detected, account for the case when the child item is recently dragged into a different parent container. In this case, consider it colliding with itself. Refer to drag over handler.

It renders the UI with 2-levelled nested `SortableContext`. The parent `SortableContext` is configured with all parent container ids as the sorting items. Nested within the context are all droppable parent containers that implement the `useSortable` hooks. For each parent container, a 2nd level `SortableContext` is used and configured with all its item ids as the sorting items. Nested within the 2nd level context are all its items which implement the `useSortable` hooks.

Given the layout of 2-levelled nested `SortableContext`, it uses a custom drag over handler to handle the cases when dragging items into different parent containers. In such cases, it updates the initial data structure. The drag end handler takes care of the cases when swapping positions of the dragged item and its sibling items under the same parent container.

### About dnd kit's example for sorting tree (collapsible)

The sorting tree example uses a data structure of multiple-levelled parent-and-child hierarchy, following the same data structure as the current use case. The example flattens the tree-like data structure to a list and renders the list items with various indentation levels. The sorting rules allow swapping an item with any other items in the list, with a projected indentation level relevant to the neihgboring items of the droppable item.

It uses the default collision detection strategy to allow swapping positions of the dragged item with any other items in the list.

It renders the UI with a single `SortableContext`, which is configured with all items in the flatten list. Nested within the context are the same items that implement the `useSortable` hooks. When dragging an item, its projected indentation level is computed according to the dragging cursor's position and the neighboring items' indentation levels in the droppable item's position.

The flatten list data structure is suitable for this example. The drag over handler does not require additional logics. The drag end handler takes care of re-arranging the flatten list by the updated sortings and update the initial data structure.

## Notes on implementations

The implementation takes the ideas from the existing examples above, with some adjustments.

For various data accesses, it uses a flatten list data structure and a depth-based id map, which, both are derived from the initial tree-like data structure.

On the custom collision detection strategy, it uses a similar approach to the one from multiple containers example. When dragging a non-top parent item, it is limited to be dropped into another item of a parent or the same level.

On the drag over and drag end handler, they also use similar approaches to the ones from multiple containers example.
