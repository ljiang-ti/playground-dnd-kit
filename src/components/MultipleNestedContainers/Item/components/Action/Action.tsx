import React, {forwardRef, CSSProperties} from 'react';
import classNames from 'classnames';

export interface Props extends React.HTMLAttributes<HTMLButtonElement> {
  active?: {
    fill: string;
    background: string;
  };
  cursor?: CSSProperties['cursor'];
}

export const Action = forwardRef<HTMLButtonElement, Props>(
  ({active, className, cursor, style, ...props}, ref) => {
    // stylings
    const buttonClassnames = 'flex items-center justify-center p-1 rounded-full border-none outline-none text-[#919eab] bg-transparent hover:bg-black/[.05] active:bg-black/[.05] focus-visible:outline-none focus-visible:shadow-md';

    return (
      <button
        ref={ref}
        {...props}
        className={classNames(buttonClassnames, className)}
        tabIndex={0}
        style={
          {
            ...style,
            cursor,
            '--fill': active?.fill,
            '--background': active?.background,
          } as CSSProperties
        }
      />
    );
  }
);
