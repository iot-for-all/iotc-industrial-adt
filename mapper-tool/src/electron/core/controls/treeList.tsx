import * as React from 'react';

import { get as _get } from 'lodash';
import {
    IColumn, ColumnActionsMode, Selection, ShimmeredDetailsList, ConstrainMode, CheckboxVisibility,
    IDetailsList, IDetailsRowProps, DetailsRow, IDetailsRowCheckProps, DetailsRowCheck, IDetailsHeaderProps,
    SelectAllVisibility, Sticky, StickyPositionType, SelectionMode
} from '@fluentui/react';
import { ImmutableDispatchers, useMutableReducer } from '../hooks/useMutableReducer';
import { useVisibility } from '../hooks/useVisibility';
import { EMPTY_OBJECT, EMPTY_ARRAY } from '../constants';
import { EnumValue } from '../model';
import { TooltipIconButton } from './tooltipIconButton';


const NumShimmerRows = 5;
const DefaultColumnWidth = 200;
const ICON_WIDTH = 24;
export const INDENT_SIZE = ICON_WIDTH;

export interface TreeRow {
    /**
     * An order-independent id for the row. It does not change if the sort order or visibility of the row changes.
     * When supplying the getRowId() option, this is the id value that should be returned.
     */
    id: string;

    /**
     * An array of the (row) ids of direct children of this row. Leaf row (nodes) should provide an empty array.
     */
    childrenIds: string[];

    /**
     * The depth of the row. Rows at the top level should have a depth of 0. This value will determine the indentation of the first column.
     */
    depth: number;

    /**
     * The id of the row that is the parent of the current row. Leave undefined it the current row has no parent row.
     */
    parentId: string;

    /**
     * Optional count of descendents
     */
    count?: number;

    /**
     * Optional boolean to disable selection of the field
     */
    disabled?: boolean;
}

type TreeDataRow<T = any> = T & TreeRow;

export enum MenuState {
    Expanded = 0,
    Collapsed
}

export interface ParentMenuState {
    [parentId: string]: MenuState;
}

// Internal row properties needed to manage collapse/expand
interface TreeRowProps {
    menuState: MenuState;
    isHidden: boolean;
}

interface CustomColumnOptions<T> {
    /**
     * Minimum width of the column, in pixels.
     * @defaultValue 200px
     */
    minWidth?: number;

    /**
     * Callback for setting a `data-test-hook` on each cell in the column.
     * This will not be used if a custom `onRender` function is provided.
     */
    dataTestHook?: (item: T) => string;

    /**
     * If provided uses this method to render custom cell content, rather than the default text rendering.
     */
    onRender?: (item?: T, index?: number, column?: FullGridColumn<T>) => React.ReactNode;

    /** Text to use in the HTML title attribute (for hover text) where appropriate */
    title?: string;
}

type TreeListColumn<T = any> = CustomColumnOptions<T> & Pick<IColumn, 'key' | 'name' | 'fieldName' | 'isResizable'>;

type InfiniteScrollTreeRow<T = any> = T & TreeRowProps;

export interface InfiniteScrollTreeOptions2<T = any> {
    /** Columns for the grid */
    columns: TreeListColumn<T>[];

    /** A text summary of the table set via `aria-label`. */
    ariaLabel: string;

    /** Custom test hook for grid container */
    dataTestHook: string;

    /** Gets a unique identifier for the row, also used for data-hooks
     * Note: getRowKey must return undefined if item or index parameters
     * are undefined (which usually happens for shimmer rows). Shimmer rows
     * cannot have a key or else the grid won't remove them upon loading the data.
    */
    getRowKey: (item?: T, index?: number) => string;

    /** Is individual row selection enabled? */
    canSelect?: boolean;

    /** Indicates whether to hide the header. Default is false. */
    noHeader?: boolean;

    /** Overrides default indentation width. Unit is pixels to match with Fluent UI DetailsRow.minWidth unit */
    indentWidth?: number;

    /** Indicates whether starting state of tree should only show root parent rows (so not fully expanded) */
    startCollapsed?: boolean;

    /**
     * Optional function that given the row's data and index, returns a data test hook string for the checkbox.
     * Supercedes the use of getRowKey option for the checkbox's data-test-hook.
    */
    getRowCheckboxTestHook?: (item?: T, index?: number) => string;

    /**
     * Indicate when selecting a parent should automatically select the descendents
     */
    selectDescendentsWithParent?: boolean;

    /**
     * Specify whether an item in the tree can be selected
     */
    canSelectItem?: (item?: T) => boolean;
}

type FullGridColumn<T> = CustomColumnOptions<T> & IColumn;

export interface TreeViewState<T = any> {
    options: InfiniteScrollTreeOptions2<T>;
    columns: FullGridColumn<T>[];

    // a map of the row keys for parent items whose menu
    // has been toggled to collapse their children rows
    parentMenuState: { [key: string]: MenuState };
    collapsedParents: string[];
    selectDescendentsWithParent: boolean;

    // indicators so grid knows when initialization (dispatch action) is complete
    collapseInitialized: {
        hasMenuColumn: boolean;
        hasCollapsedState: boolean;
    };

    // indicates whether to collapse the entire tree
    collapseTree?: boolean;

    // selection state:
    selection: Selection<T>;
    selectionCount: number; // hoisted from `selection` to trigger re-renders
    previousSelected: { [key: string]: boolean };

    /**
     * Grid Key, used as a last-ditch option because Office Fabric doesn't
     * honor new props automatically so we need to remount the entire grid.
     */
    key: number;
}

const reducers = {
    initialize(prevState: TreeViewState, dispatch: ImmutableDispatchers<TreeViewState, any>, options: InfiniteScrollTreeOptions2<any>): TreeViewState {

        const { columns: gridColumns, selectDescendentsWithParent, canSelectItem} = options;
        const parentMenuState: ParentMenuState = /* prevState?.collapsedParents ?? */ {};
        const collapsedParents: string[] = /* prevState?.collapsedParents ?? */[];
        const collapseInitialized = {
            hasMenuColumn: false,
            hasCollapsedState: false
        };

        const columns = gridColumns.map((gridCol, columnIndex) => {
            const { key, minWidth } = gridCol;
            const width = minWidth || DefaultColumnWidth;
            const iCol: IColumn = {
                // defaults:
                isResizable: true,
                isPadded: true,
                isMenuOpen: false,
                onRender: defaultRenderer,
                // incoming:
                ...gridCol,
                // overrides:
                minWidth: width,
                currentWidth: width,
                columnActionsMode: ColumnActionsMode.disabled
            };

            return iCol;
        });

        // selection state:
        const selection = prevState?.selection ?? new Selection({
            onSelectionChanged: dispatch.updateSelection,
            getKey: options.getRowKey as any,
            canSelectItem
        });
        const previousSelected = prevState?.previousSelected ?? {};

        return {
            options,
            columns,
            parentMenuState,
            collapsedParents,
            selectDescendentsWithParent,
            collapseInitialized,
            selection,
            selectionCount: selection.count,
            previousSelected,
            key: prevState ? prevState.key + 1 : 0,
        };
    },
    updateSelection(state: TreeViewState) {
        if (state.selectDescendentsWithParent) {
            selectChildren(state);
        }
        state.selectionCount = state.selection.count;
    },
    onSelect(state: TreeViewState, itemIndex: number) {
        const items = state.selection.getItems();
        if (items[itemIndex].childrenIds?.length) {

            // if any selected items are parents, make sure their descendants are also selected
            let lastIndex = itemIndex;
            const stack = [itemIndex];
            while (stack.length) {
                const idx = stack.pop();
                const item = items[idx];
                for (const _ of item.childrenIds) {
                    stack.push(++lastIndex);
                }
            }
            state.selection.toggleRangeSelected(itemIndex, lastIndex - itemIndex + 1);

        } else {
            const item = items[itemIndex];

            // only toggle the child if the parent is not selected
            const isParentSelected = state.selection.isKeySelected(item.parentId);
            if (!isParentSelected) {
                state.selection.toggleIndexSelected(itemIndex);
            }
        }
        state.selectionCount = state.selection.count;
    },
    onColumnResize(state: TreeViewState, { key }: IColumn, width: number) {
        const col = state.columns.find(col => col.key === key);
        col.currentWidth = width; // update the currentWidth so the filter inputs can resize
    },
    setCollapsed(state: TreeViewState, isCollapsed: boolean) {
        state.collapseTree = isCollapsed; // full tree expand/collapse
    },
    toggleParentMenuState(state: TreeViewState, parentRowKey: string) {
        // track collapse/expand state of menus (parents only)
        if (parentRowKey) {
            const currentMenuState = state.parentMenuState[parentRowKey];
            const newState = (!currentMenuState) ? MenuState.Collapsed : MenuState.Expanded;
            state.parentMenuState = { ...state.parentMenuState, [parentRowKey]: newState };
            state.collapsedParents = newState === MenuState.Expanded
                ? [...state.collapsedParents, parentRowKey]
                : state.collapsedParents.filter(key => key !== parentRowKey);
        }
    },
    initializeCollapsibleMenu(state: TreeViewState, menuColumn: IColumn) {
        state.columns.splice(0, 1, menuColumn);
        state.collapseInitialized.hasMenuColumn = true;
    },
    initializeCollapsedState(state: TreeViewState, parentStates: ParentMenuState) {
        state.parentMenuState = { ...parentStates };
        state.collapseInitialized.hasCollapsedState = true;
    },
    collapseAll(state: TreeViewState) {
        reducers.setCollapsed(state, true);
    },
    expandAll(state: TreeViewState) {
        reducers.setCollapsed(state, false);
    },
    setDefaultSelection(state: TreeViewState, itemIndex: number) {
        state.selection.toggleIndexSelected(itemIndex);
    }
};

/**
 * The root hook for Infinite Scroll Tree. Takes in the initial grid options and returns a fully hydrated
 * grid state that can be used to fetch the data and display it.
 * @param options {InfiniteScrollGridOptions}
 * @returns The grid state, to be passed to the Grid component.
 */
export function useTreeList<T>(options: InfiniteScrollTreeOptions2<T>) {
    const store = useMutableReducer<TreeViewState<T>, typeof reducers>(reducers, dispatch => reducers.initialize(null, dispatch, options));

    // reinitialize store on options change:
    const [, dispatch] = store;
    const isInitialRender = React.useRef<boolean>(true);
    React.useLayoutEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
        } else {
            dispatch.initialize(dispatch, options);
        }
    }, [options, dispatch]);

    return store;
}

/** The Infinite Scroll Grid component */
export function TreeList<T>(props: {
    state: TreeViewState;
    dispatch: ImmutableDispatchers<TreeViewState, typeof reducers>;
    loading?: boolean;
    items?: TreeDataRow<T>[];
    hasNextPage?: boolean;
    fetchNextPage?: () => void;
    onRenderRow?: (rowProps: IDetailsRowProps) => JSX.Element;
    onRenderDetailsHeader?: (headerProps: IDetailsHeaderProps) => JSX.Element;
    customEmptyPlaceholder?: React.ReactNode;
    hideCheckbox?: boolean;
    onItemSelect?: (selectedValue: EnumValue) => void;
    defaultSelectedItemId?: string;
}) {
    const { state, dispatch, loading, items: inputItems, hasNextPage, fetchNextPage, customEmptyPlaceholder, hideCheckbox, onItemSelect, defaultSelectedItemId } = props;
    const { options, columns, selection, key, collapseTree, parentMenuState } = state;
    const { ariaLabel, dataTestHook, getRowKey, canSelect, noHeader, indentWidth, startCollapsed,  getRowCheckboxTestHook, selectDescendentsWithParent } = options;

/*     const customStyles: Partial<GridStyles> = {
        root: {
            root: {
                selectors: {
                    // remove default min row height so collapsed rows don't reserve space
                    '.ms-List-cell': { minHeight: 0 }
                }
            }
        },
        row: {
            root: {
                selectors: {
                    '.ms-DetailsRow-call:not(.ms-DetailsRow-cellCheck': {
                        // menu icons cause parent rows to be slightly taller. Ensure that all row heights are the same.
                        paddingBottom: 0
                    }
                }
            }
        }
    };

    const styles = useFabricDetailsListStyles(canSelect, customStyles); */

    // get the maxDepth to compute the total width of columm 1, which will
    // contain indentation, possibly menu icon, and user's content for col 1.
    const { maxDepth, indentSize } = React.useMemo(() => {
        const maxDepth = inputItems?.reduce((max, item) => {
            return item.depth > max ? item.depth : max;
        }, 0);
        const indentSize = indentWidth || INDENT_SIZE;
        return { maxDepth, indentSize };
    }, [indentWidth, inputItems]);

    const onMenuRender = React.useCallback((item?: any) => {
        // use depth on the row to know how much to indent. Indentation width is based on menu icon width.
        const itemDepth = item.depth || 0;
        const containerWidth = indentSize * itemDepth + indentSize;
        const style: React.CSSProperties = { width: `${containerWidth}px` };

        return (
            <CollapsibleMenu row={item} style={style} options={options} dispatch={dispatch} />
        );
    }, [dispatch, indentSize, options]);

    React.useEffect(() => {
        // before adding collapsible menu, the state's collapse-related values must be initialized
        if (!state.collapseInitialized.hasMenuColumn) {
            // the CollapsibleMenu component in added into the first column (not counting the checkbox column)
            // by rendering it before the user's onRender for column 1 is called. That way, the overall width of
            // this column can be determined dynamically and maintained for all rows.
            const col1 = columns[0];
            const iCol: IColumn = { ...col1 };
            iCol.onRender = (item?: any) => {
                const itemDepth = item.depth || 0;
                const containerWidth = indentSize * itemDepth + indentSize;
                const style: React.CSSProperties = { width: `calc(100% - ${containerWidth}px)` };

                return (
                    <div className={'indented-container'}>
                        {onMenuRender(item)}
                        <div style={style} className={'inline-text-overflow'}>
                            {col1.onRender(item)}
                            {!!item?.count && <span className={'descendant-count'}> ({item.count})</span>}
                        </div>
                    </div>
                );
            };
            // set the overall width of the first column (not counting the checkbox column) to account
            // for the maximum indentation, the menu icon width and the column 1 content from the caller.
            iCol.minWidth = (col1.minWidth || DefaultColumnWidth) + (maxDepth * indentSize);
            dispatch.initializeCollapsibleMenu(iCol);  // refresh view
        }
    }, [columns, dispatch, indentSize, maxDepth, onMenuRender, state.collapseInitialized.hasMenuColumn]);

    React.useEffect(() => {
        // parent menu state settings require the itemProps to be available
        if (!state.collapseInitialized.hasCollapsedState && inputItems.length) {
            const parentStates: ParentMenuState = {};
            for (const item of inputItems) {
                if (item.childrenIds?.length) {
                    parentStates[item.id] = startCollapsed ? MenuState.Collapsed : MenuState.Expanded;
                }
            }
            dispatch.initializeCollapsedState(parentStates);
        }
    }, [dispatch, inputItems, startCollapsed, state.collapseInitialized.hasCollapsedState]);

    const collapsedItems = React.useMemo(() => getVisibleRows(inputItems, parentMenuState, collapseTree), [collapseTree, inputItems, parentMenuState]);
    const items = React.useMemo(() => collapsedItems && hasNextPage
        ? collapsedItems.concat(new Array(NumShimmerRows)) // add some placeholder shimmer rows at the end that'll trigger the next page fetch.
        : (collapsedItems || EMPTY_ARRAY)
        , [collapsedItems, hasNextPage]);

    React.useEffect(() => {
        if (defaultSelectedItemId !== undefined && !selection.getSelectedCount()) {
            const index = items.findIndex(item => item.id === defaultSelectedItemId);
            if (index >= 0) {
                dispatch.setDefaultSelection(index);
            }
        }
    }, [defaultSelectedItemId, dispatch, items, selection]);

    const numItems = items.length;
    const firstShimmerIndex = numItems - NumShimmerRows;
    const onRenderCustomPlaceholder = React.useCallback((rowProps: IDetailsRowProps, index: number, defaultRender?: (props: IDetailsRowProps) => React.ReactNode) => {
        const row = defaultRender?.(rowProps);
        return index === firstShimmerIndex && hasNextPage && !loading
            ? <FetchTriggerRow callback={fetchNextPage}>{row}</FetchTriggerRow>
            : row;
    }, [firstShimmerIndex, hasNextPage, loading, fetchNextPage]);

    const onRenderRow = React.useCallback((rowProps: IDetailsRowProps) => {
        let className = rowProps.item.isHidden ? 'collapsed ' : '';
        if (rowProps.item.disabled) {
            className += 'disabled';
        }
        const selectionProps = selectDescendentsWithParent
            ? {
                onClick: (e) => {
                    // if the selected row is a parent, stop default selection behavior;
                    // instead, find and select all descendents
                    if (!!rowProps.item.childrenIds.length) {
                        e.stopPropagation();
                        dispatch.onSelect(rowProps.itemIndex);
                    } else if (!!state.selection.isKeySelected(rowProps.item.parentId)) {
                        // if this row's parent is selected, stop default selection behavior
                        e.stopPropagation();
                    }
                    // this allowed shift-click to select a range but it would allow selecting a range
                }
            } : EMPTY_OBJECT;
        return (
            <DetailsRow
                {...rowProps}
                // styles={styles.row}
                className={className}
                onRenderCheck={(checkboxProps: IDetailsRowCheckProps) => (
                    !hideCheckbox && <DetailsRowCheck
                        {...checkboxProps}
                        {...selectionProps}
                        data-test-hook={getRowCheckboxTestHook?.(rowProps.item, rowProps.itemIndex) ?? getRowKey?.(rowProps.item, rowProps.itemIndex) ?? `checkbox-${rowProps.itemIndex}`}
                    />
                )}
            />
        );
    }, [dispatch, getRowCheckboxTestHook, getRowKey, selectDescendentsWithParent, hideCheckbox, state.selection]);

    // onActiveItemChanged is a prop of Fabric UI's IDetailsListProps interface. onItemSelect is called by the OrgPicker where
    // (unlike the Org admin page) there isn't a selection checkbox. If onItemSelect is called, Fabric stops click propogation
    // so a clickable element in the row never gets the click event. So we check here to make sure the target in the row where
    // the click occurred is not a clickable element before calling onItemSelect. If it is, we let the click event go to that element.
    const onActiveItemChanged = React.useCallback((item?: any, _?: number, ev?: React.FocusEvent<HTMLElement>) => {
        item && !item.disabled && !ev?.target.onclick && onItemSelect?.({
            displayName: item.displayName ?? item.id,
            value: item.id
        });
    }, [onItemSelect]);

    // compute loading states:
    const enableShimmer = loading && numItems === 0; // there's no data available
    const enableCrawlingAnts = loading && numItems !== 0; // there's some data available, but we're loading new stuff
    const enableEmptyPlaceholder = !loading && numItems === 0; // we finished loading and there are no rows

    const selectAllVisibility = SelectAllVisibility.hidden;
    const onRenderDetailsHeader = React.useCallback((headerProps: IDetailsHeaderProps, defaultRender?: (props: IDetailsHeaderProps) => React.ReactNode) => {
        const newProps: IDetailsHeaderProps = {
            ...headerProps,
            columns: headerProps.columns,
            selectAllVisibility
        };

        return (
            <Sticky
                isScrollSynced
                stickyPosition={StickyPositionType.Header}
                stickyClassName={'header-container'}
            >
                {defaultRender(newProps)}
                {/*enableCrawlingAnts && <CrawlingAnts className={cx('no-moving-margins', 'crawling-ants')} />*/}
            </Sticky>
        );

    }, [selectAllVisibility, enableCrawlingAnts, columns, dispatch]);


    // ShimmeredDetailsList doesn't listen to prop changes so we need to manually
    // trigger an update if the theme or columns are changed
    // BUG: https://github.com/microsoft/fluentui/issues/12368
    const gridRef = React.useRef<IDetailsList>();
    React.useEffect(() => {
        gridRef.current?.forceUpdate();
    }, []);

    return (
        typeof window !== 'undefined' && <div data-test-hook={dataTestHook}>
            <ShimmeredDetailsList
                isHeaderVisible={!noHeader}
                removeFadingOverlay
                selectionPreservedOnEmptyClick
                // Set the React Key so we remount the grid whenever the GridOption changes
                // This is specifically required for honoring width changes in column picker:
                key={key}
                // Set the Selection Key so items are not deselected when the filter
                // changes (The grid will automatically deselect items that are no
                // longer present in the new items array)
                setKey='grid'
                enableShimmer={enableShimmer}
                componentRef={gridRef}
                items={items}
                columns={columns}
                // detailsListStyles={styles.root}
                onRenderCustomPlaceholder={onRenderCustomPlaceholder}
                onRenderRow={props.onRenderRow || onRenderRow}
                getKey={getRowKey}
                onActiveItemChanged={onActiveItemChanged}
                onRenderDetailsHeader={props.onRenderDetailsHeader || onRenderDetailsHeader}
                selection={selection}
                selectionMode={SelectionMode.multiple}
                // layoutMode={layoutMode != null ? layoutMode : DetailsListLayoutMode.fixedColumns}
                constrainMode={ConstrainMode.unconstrained}
                onColumnResize={dispatch.onColumnResize}
                checkboxVisibility={CheckboxVisibility.always}
                checkButtonAriaLabel={'Row checkbox'}
                ariaLabelForSelectAllCheckbox={'Toggle selection for all items'}
                ariaLabelForSelectionColumn={'Toggle selection'}
                ariaLabelForListHeader={'Column headers'}
                ariaLabelForGrid={'Grid content'}
                ariaLabelForShimmer="Content is being fetched"
                ariaLabel={ariaLabel}
            />
            {enableEmptyPlaceholder && !collapseTree && (
                <div className={'inline-text-overflow no-rows-found'} data-test-hook='no-rows-found'>
                    {customEmptyPlaceholder ?? 'No rows found'}
                </div>
            )}
        </div>
    );
}

function selectChildren(state: TreeViewState) {
    // make sure any selected parents also have selected children -- this is needed
    // if user holds down SHIFT key and makes a selection from children of one parent to children of another.
    // it will also take effect if the row is selected by clicking on the row (not the checkbox)
    const selectedItems = state.selection.getSelection();
    if (selectedItems.length > 1) {
        const parents = selectedItems.filter(item => !!item.childrenIds.length);
        const parentIds = parents.map(parent => parent.id);
        // skip any parents whose parent is already in the parents list.
        const highestParents = parents.filter(parent => !parentIds.includes(parent.parentId));
        const items = state.selection.getItems();

        // get the selected indices as a map for lookup
        const selectedIndexes = state.selection.getSelectedIndices().reduce((map, idx) => {
            map[idx] = true;
            return map;
        }, {});

        for (const item of highestParents) {

            // if any selected items are parents, make sure their descendants are also selected.
            let shouldToggle = false;
            const parentIndex = items.indexOf(item);
            let lastIndex = parentIndex;
            const stack = [lastIndex];
            while (stack.length) {
                const idx = stack.pop();
                if (!selectedIndexes[idx]) {
                    shouldToggle = true;
                }
                const child = items[idx];
                for (const _ of child.childrenIds) {
                    stack.push(++lastIndex);
                }
            }
            if (shouldToggle) {
                state.selection.toggleRangeSelected(parentIndex, lastIndex - parentIndex + 1);
            }
        }
    }
}

// provides default menu column and tracks state of collapsed/expanded menus based
// on caller-provided functions that tell us which rows should have a menu and what rows are
// above the current row in the tree.
function getVisibleRows(items: any[], parentStateMenu: ParentMenuState, collapseTree: boolean) {
    if (!(parentStateMenu)) {
        return items;
    }
    if (collapseTree) {
        return items.map(row => ({ ...row, isHidden: true }));
    }

    // Set the menu state of every row. The menu state of a parent row determines which menu icon is shown.
    // For leaf rows, it will be undefined (so no menu will be displayed).
    const itemParentIdMap: { [key: string]: string } = {};
    const menuRows: InfiniteScrollTreeRow[] = items.map(row => {
        itemParentIdMap[row.id] = row.parentId;
        const menuState = parentStateMenu[row.id];
        return { ...row, menuState };
    });

    const rows = menuRows.map(item => {
        let parentId = item.parentId;
        let isHidden = false;
        while (parentId && !isHidden) {
            if (parentStateMenu[parentId] === MenuState.Collapsed) {
                isHidden = true;
            }
            parentId = itemParentIdMap[parentId];
        }
        return { ...item, isHidden };
    });

    return rows;
}

const CollapsibleMenu = React.memo(function CollapsibleMenu({ row, style, options, dispatch }: {
    row: any,
    style: React.CSSProperties,
    options: InfiniteScrollTreeOptions2,
    dispatch: ImmutableDispatchers<TreeViewState, typeof reducers>,
}) {
    const { getRowKey } = options;
    const isExpanded = row.menuState !== MenuState.Collapsed;
    const rowKey = getRowKey(row);
    const onClick = () => dispatch.toggleParentMenuState(rowKey);
    const iconProps = { iconName: isExpanded ? 'chevronDown' : 'chevronRight' };

    return (
        <div className={'collapse-menu-container'} style={style}>
            {!!row.childrenIds?.length && <div className={'collapse-menu'} data-selection-disabled>
                <TooltipIconButton
                    className={'expansion-icon'}
                    iconProps={iconProps}
                    onClick={onClick}
                    tooltip={isExpanded ? 'Collapse' : 'Expand'}
                />
            </div>}
        </div>
    );
});

function defaultRenderer<T>(item: T, _index: number, column: FullGridColumn<T>) {
    const { fieldName, dataTestHook } = column;
    const text = _get(item, fieldName);
    return text == null ? null : <span title={text} data-test-hook={dataTestHook?.(item)}>{text}</span>;
}

function FetchTriggerRow({ callback, children }: {
    callback: () => void;
    children: React.ReactNode;
}) {
    const target = React.useRef<HTMLDivElement>();
    useVisibility(React.useMemo(() => ({ target, callback }), [callback]));
    return <div ref={target}>{children}</div>;
}