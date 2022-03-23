import { SelectableOptionMenuItemType } from '@fluentui/react';

export type DropdownOption<T = any> = {
    displayName: string;
    title?: string;
    value: T;
};

export type EnumValue<T = any> = DropdownOption<T> & {
    hidden?: boolean;
    disabled?: boolean;

    /** Describes the type of option. */
    itemType?: SelectableOptionMenuItemType;

    /* Add subtext to radio option */
    subText?: string;

    [extraField: string]: any;
};