import React, { forwardRef } from 'react';
import classNames from 'classnames';

import CaretDown from 'phosphor-react/src/icons/CaretDown';

import { Action, Handle } from '../Item';

export interface Props {
  children?: React.ReactNode;
  label?: string;
  collapsed?: boolean;
  clone?: boolean;
  childCount?: number;
  style?: React.CSSProperties;
  hover?: boolean;
  handleProps?: React.HTMLAttributes<any>;
  shadow?: boolean;
  onClick?(): void;
  onCollapse?(): void;
}

export const Container = forwardRef<HTMLDivElement, Props>(
  (
    {
      childCount,
      children,
      clone,
      collapsed,
      handleProps,
      hover,
      onClick,
      onCollapse,
      label,
      style,
      shadow,
      ...props
    }: Props,
    ref
  ) => {
    return (
      <div
        {...props}
        ref={ref}
        style={style}
        className={classNames(
          'flex flex-col box-border outline-none m-2.5 rounded transition duration-300 ease-in-out border border-solid border-black/[.05] relative focus-visible:shadow-sm focus-visible:border-none',
          hover ? 'bg-neutral-200' : 'bg-neutral-50',
          shadow && 'shadow-2xl'
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
      >
        {label ? (
          <div 
            className={classNames(
              'flex gap-2 items-center py-4 px-2.5 border-x-0 border-t-0 border-solid border-[#E5E5E5]',
              hover ? 'bg-neutral-200' : 'bg-neutral-100',
              clone ? 'bg-neutral-800' : 'bg-neutral-100',
              collapsed ? 'rounded border-b-0' : 'rounded-t border-b'
            )}
          >
            <Action
              className={classNames(
                'bg-transparent hover:bg-neutral-200 text-neutral-800 border-none'
              )}
              onClick={onCollapse}
            >
              <CaretDown className={classNames('transition', collapsed ? '-rotate-90' : '')} size={20} />
            </Action>
            <div className="grow flex flex-col items-start">
              <span
                className={classNames(
                  'px-1.5 text-lg leading-7 font-bold cursor-pointer rounded hover:bg-neutral-200',
                  clone ? 'text-neutral-50' : 'text-neutral-800'
                )}
              >
                {label}
              </span>
            </div>
            <Handle 
              className={classNames(
                'rounded-full transition border-none',
                clone
                  ? 'text-neutral-50 bg-neutral-200'
                  : 'text-neutral-800 bg-transparent'
              )}
              {...handleProps} 
            />
            {clone && childCount && childCount > 1 ? (
              <span className='absolute -top-2.5 -right-2.5 flex items-center justify-center w-6 h-6 rounded-full bg-[#2389ff] text-white'>{childCount}</span>
            ) : null}
          </div>
        ) : null}
        {children && !collapsed ? (
          <ul className={classNames(
            'flex flex-col gap-2.5 list-none p-5 overflow-y-auto'
          )}>{children}</ul>
        ) : null}
      </div>
    );
  }
);