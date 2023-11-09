import React, { forwardRef } from 'react';
import classNames from 'classnames';

import CaretDown from 'phosphor-react/src/icons/CaretDown';
import CaretRight from 'phosphor-react/src/icons/CaretRight';

import { Action, Handle } from '../Item';

export interface Props {
  children: React.ReactNode;
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
          'flex flex-col box-border outline-none m-2.5 rounded transition duration-300 ease-in-out border border-solid border-black/[.05] relative pb-5 focus-visible:shadow-sm focus-visible:border-none',
          hover ? 'bg-neutral-200' : 'bg-neutral-100',
          shadow && 'shadow-2xl'
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
      >
        {label ? (
          <div className='flex items-center justify-between bg-white py-1.5 pr-5 pl-2 border-b border-solid border-black/[.08]'>
            <Action
              onClick={onCollapse}
            >
              {collapsed ? <CaretRight size={20} /> : <CaretDown size={20} />}
            </Action>
            {label}
            <div className='flex'>
              <Handle {...handleProps} />
            </div>
            {clone && childCount && childCount > 1 ? (
              <span className='absolute -top-2.5 -right-2.5 flex items-center justify-center w-6 h-6 rounded-full bg-[#2389ff] text-white'>{childCount}</span>
            ) : null}
          </div>
        ) : null}
        <ul className={classNames(
          'flex flex-col gap-2.5 list-none p-5 overflow-y-auto'
        )}>{children}</ul>
      </div>
    );
  }
);