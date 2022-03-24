import { SelectableOptionMenuItemType } from "@fluentui/react";

export type DropdownOption<T = unknown> = {
  displayName: string;
  title?: string;
  value: T;
};

export type EnumValue<T = unknown> = DropdownOption<T> & {
  hidden?: boolean;
  disabled?: boolean;

  /** Describes the type of option. */
  itemType?: SelectableOptionMenuItemType;

  /* Add subtext to radio option */
  subText?: string;

  [extraField: string]: unknown;
};
