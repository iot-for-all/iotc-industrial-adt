import * as React from 'react';
import { IIconProps } from '@fluentui/react';
import { TooltipHost, ITooltipHostStyles } from '@fluentui/react/lib/Tooltip';
import { IconButton } from '@fluentui/react/lib/Button';
import { useId } from '@fluentui/react-hooks';

export interface IButtonProps {
  iconProps: IIconProps;
  onClick: React.MouseEventHandler<HTMLInputElement>;
  tooltip: string;
  title?: string;
  disabled?: boolean;
  checked?: boolean;
  className?: string;
}

const calloutProps = { gapSpace: 0 };
// The TooltipHost root uses display: inline by default.
// If that's causing sizing issues or tooltip positioning issues, try overriding to inline-block.
const hostStyles: Partial<ITooltipHostStyles> = { root: { display: 'inline-block' } };

export const TooltipIconButton = React.memo(function TooltipIconButton(props: IButtonProps) {
  // Use useId() to ensure that the ID is unique on the page.
  // (It's also okay to use a plain string and manually ensure uniqueness.
  const tooltipId = useId('tooltip');

  const { iconProps, tooltip, disabled, checked, className, onClick, title } = props;

  return (
    <div>
      <TooltipHost
        content={tooltip || 'button'}
        // This id is used on the tooltip itself, not the host
        // (so an element with this id only exists when the tooltip is shown)
        id={tooltipId}
        calloutProps={calloutProps}
        styles={hostStyles}
      >
        <IconButton 
          iconProps={iconProps} 
          title={title} 
          ariaLabel={title}
          disabled={disabled} 
          checked={checked} 
          className={className} 
          onClick={onClick}
        />
      </TooltipHost>
    </div>
  );
});