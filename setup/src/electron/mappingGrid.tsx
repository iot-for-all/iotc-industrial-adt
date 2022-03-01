import * as React from 'react';
import { DetailsList, DetailsRow, IDetailsRowStyles, DetailsListLayoutMode, Selection, SelectionMode, IDetailsRowProps  } from '@fluentui/react/lib/DetailsList';
import { getTheme } from '@fluentui/react/lib/Styling';
import { TextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { MarqueeSelection } from '@fluentui/react/lib/MarqueeSelection';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useBoolean, useId } from '@fluentui/react-hooks';

import './mappingGrid.css';
import { TooltipHost } from '@fluentui/react';

const theme = getTheme();

const exampleChildClass = mergeStyles({
    display: 'block',
    marginBottom: '10px',
});
  
const textFieldStyles: Partial<ITextFieldStyles> = { root: { maxWidth: '300px' } };

export interface MappingGridItem {
    key: number|string;
    // opcua
    opcuaKey: string;  // key of the corresponding entry in the opcua viewer
    opcuaName: string;  // opcua node name
    opcuaNodeId: string; // opcua node id
    opcuaPath: string[]; // opcua namespace
    // dt
    dtId: string; // twin id
    dtName?: string; // name of twin instance
    dtKey: string;  // key of the corresponding entry in the dt viewer
    dtPropertyName: string; // name of DT property being mapped
    dtPropertyId?: string; // id of DT property being mapped, if available
    dtModelId: string; // model id of twin instance
    dtComponent?: string; // name of component, if applicable
}

export interface MappingGridProps {
    allItems: MappingGridItem[];
    setSelectedKey: (key: number|string) => void;
    onDismiss: (row: MappingGridItem) => void;
    deselect: boolean;
}

export const MappingGrid = React.memo(function MappingGrid( props : MappingGridProps ) {
    const { setSelectedKey, allItems, onDismiss, deselect } = props;
    const [ filter, setFilter ] = React.useState<string>();
    const [ selectionChanged, setSelectionChanged ] = useBoolean(false);

    const selection = React.useMemo(() => new Selection({ 
        selectionMode: SelectionMode.single,
        onSelectionChanged: setSelectionChanged.setTrue
    }), [setSelectionChanged.setTrue]);

    React.useEffect(() => {
        if (selectionChanged) {
            setSelectedKey(selection.getSelection()[0]?.key)
            setSelectionChanged.setFalse();
        }
    }, [selection, selectionChanged, setSelectedKey, setSelectionChanged]);

    React.useEffect(() => {
        if (deselect) {
            // deselect the current row and turn off the deselect flag
            selection.toggleAllSelected();
        }
    }, [selection, deselect]);
    

    const items = useFilteredItems(filter, allItems);

    const columns = React.useMemo(() => [
        { key: 'opcua', name: 'OpcUA', fieldName: 'opcua', minWidth: 100, maxWidth: 200, isResizable: true, onRender: (item: MappingGridItem) => <MappedItemDetail name={`${item.opcuaNodeId} | ${item.opcuaName}`} detail={item} />},
        { key: 'arrow', name: '', fieldName: 'arrow', minWidth: 20, maxWidth: 20, isResizable: false, onRender: _ => '->' },
        { key: 'dttwin', name: 'Twin Id', fieldName: 'twin', minWidth: 100, maxWidth: 200, isResizable: true, onRender: (item: MappingGridItem) => <MappedItemDetail name={item.dtId} detail={item} />},
        { key: 'dtprop', name: 'Property', fieldName: 'prop', minWidth: 100, maxWidth: 200, isResizable: true, onRender: (item: MappingGridItem) => <MappedItemDetail name={item.dtPropertyName} detail={item} />},
        { key: 'delete', name: '', fieldName: 'delete', minWidth: 20, maxWidth: 20, isResizable: false, 
            onRender: (item: MappingGridItem) => <button onClick={() => onDismiss(item)} className='dismiss-button margin-end-xsmall'>x</button> }
    ], [onDismiss]);    

    // Force update when item objects change but not item array
    // const gridRef = React.useRef<IDetailsList>();
    
    return (
        <div>
            <TextField
                className={exampleChildClass}
                label="Filter:"
                onChange={(_, value) => setFilter(value)}
                styles={textFieldStyles}
            />
            <MarqueeSelection selection={selection}>
                <DetailsList
                    // componentRef={gridRef}
                    items={items}
                    columns={columns}
                    setKey="set"
                    layoutMode={DetailsListLayoutMode.justified}
                    selection={selection}
                    selectionPreservedOnEmptyClick={true}
                    ariaLabelForSelectionColumn="Toggle selection"
                    ariaLabelForSelectAllCheckbox="Toggle selection for all items"
                    checkButtonAriaLabel="select row"
                    onRenderRow={onRenderRow}
                />
            </MarqueeSelection>
        </div>
    );
});
  
function onRenderRow(props: IDetailsRowProps) {
    const customStyles: Partial<IDetailsRowStyles> = {};
    if (props) {
        if (props.itemIndex % 2 === 0) {
            // Every other row renders with a different background color
            customStyles.root = { backgroundColor: theme.palette.themeLighterAlt };
        }
        return <DetailsRow {...props} styles={customStyles} />;
    }
    return null;
}
  
function useFilteredItems(text: string, items: MappingGridItem[]): MappingGridItem[] {
    const normalizeText = text?.toLowerCase();
    return React.useMemo(
        () => normalizeText ? items.filter(i => i.opcuaNodeId.toLowerCase().indexOf(normalizeText) > -1 || i.dtId.toLowerCase().indexOf(normalizeText) > -1 || i.dtPropertyName.toLowerCase().indexOf(normalizeText) > -1) : items, 
    [items, normalizeText]);
}

interface MappedItemDetailProps {
    name: string;
    detail: MappingGridItem;
}

function MappedItemDetail({ name, detail }: MappedItemDetailProps) {
    // Use useId() to ensure that the ID is unique on the page.
    // (It's also okay to use a plain string and manually ensure uniqueness.
    const tooltipId = useId('mapItem');
    const content: JSX.Element = (<>
        <div>Node name: {detail.opcuaName}</div>
        <div>Node id: {detail.opcuaNodeId}</div>
        <div>Twin id: {detail.dtId}</div>
        <div>Twin Name: {detail.dtName}</div>
        <div>Property: {detail.dtPropertyName}</div>
        <div>Property id: {detail.dtPropertyId}</div>
        <div>Model id: {detail.dtModelId}</div>
    </>);
  
    return (
        <TooltipHost
          content={content}
          // This id is used on the tooltip itself, not the host
          // (so an element with this id only exists when the tooltip is shown)
          id={tooltipId}
        >
            <span>{name}</span>
        </TooltipHost>
    );
}