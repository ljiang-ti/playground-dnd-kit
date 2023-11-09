import React, { useEffect } from 'react';
import classNames from 'classnames';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { Transform } from '@dnd-kit/utilities';
import {CSS} from '@dnd-kit/utilities';

import { Handle } from './components';

export interface Props {
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  handleProps?: any;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  value: React.ReactNode;
}

export const Item = React.memo(
  React.forwardRef<HTMLLIElement, Props>(
    (
      {
        dragOverlay,
        dragging,
        disabled,
        fadeIn,
        handleProps,
        height,
        index,
        listeners,
        sorting,
        transition,
        transform,
        value,
        wrapperStyle,
        ...props
      },
      ref
    ) => {
      useEffect(() => {
        if (!dragOverlay) {
          return;
        }

        document.body.style.cursor = 'grabbing';

        return () => {
          document.body.style.cursor = '';
        };
      }, [dragOverlay]);

      return (
        <li
          className={classNames(
            'flex box-border origin-top-left',
            fadeIn && 'transition-opacity duration-700 ease-in opacity-100',
            dragOverlay && 'z-[999]'
          )}
          style={{
            transition: transition ?? undefined,
            transform: transform ? CSS.Translate.toString(transform) : undefined,
          }}
          ref={ref}
        >
          <div
            className={classNames(
              'relative flex grow items-center justify-between transition ease-in-out duration-300 p-4 bg-white outline-none box-border rounded-sm origin-center text-neutral-700 whitespace-nowrap focus-visible:shadow-2xl',
              (!dragging && !dragOverlay) && 'opacity-100 scale-100 shadow-lg shadow-neutral-300',
              (dragging && !dragOverlay) && 'opacity-50 scale-100 shadow-xl shadow-neutral-500',
              (!dragging && dragOverlay) && 'opacity-100 scale-105 shadow-2xl shadow-neutral-700',
              disabled && 'text-[#999999] bg-[#f1f1f1] cursor-not-allowed',
            )}
            data-cypress="draggable-item"
            {...props}
          >
            {value}
            <Handle {...handleProps} {...listeners} />
          </div>
        </li>
      );
    }
  )
);
