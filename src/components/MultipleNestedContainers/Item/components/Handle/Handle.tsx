import React, {forwardRef} from 'react';

import {Action, ActionProps} from '../Action';
import DotsSixVertical from 'phosphor-react/src/icons/DotsSixVertical';

export const Handle = forwardRef<HTMLButtonElement, ActionProps>(
  (props, ref) => {
    return (
      <Action
        ref={ref}
        cursor="grab"
        data-cypress="draggable-handle"
        {...props}
      >
        <DotsSixVertical size={20} />
      </Action>
    );
  }
);
