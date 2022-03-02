import React from 'react';
import { generateId } from './core/generateId';
import { DtStyleScheme } from './dtModels';

import './dtViewer.css';

export interface TwinsViewerProps {
    jsonContent: object | Array<object>;
    theme?: 'light' | 'dark';
    className?: string;
    collapsed?: boolean |  number;
    noWrap?: boolean;
    styles?:  DtStyleScheme;
    onSelect?: (selectedNode: Node) => void;
}

export interface Node {
    key: string;
    id: string;  // model or twin id
    name: string;
    modelId: string;
    isModel: boolean;
    collapsed?: boolean;
    hide?: boolean; // for descendents, set to true if an ancestor has collapsed === true; used in render to determine whether to show the row
}

// List Twins shapes
interface Twin {
    '$dtId': string;
    '$metadata': TwinMetaData;
    'name': string;
}

interface TwinMetaData {
    '$model': string;
}

interface ProcessedInput {
    models: Set<string>;
    modelTwinsMap: Map<string, Node[]>;
}

export const DtTwinsViewer = React.memo(function DtTwinsViewer({ jsonContent, onSelect, styles }: TwinsViewerProps) {

    const [ nodeRows, setNodeRows ] = React.useState([]);
    const processedInput = useProcessJson(jsonContent);
    const inputRows = useGetRows(processedInput);
    
    // update the rows when a new file is selected (brings in new content)
    React.useEffect(() => {
        setNodeRows(inputRows);
    }, [inputRows]);

    const onMenuClick = React.useCallback((e: MouseEvent, nodeKey: string, collapse: boolean) => {
        // create a new array object but return existing node objects
        // since their references are used in the node.children array
        const newRows = [...nodeRows]; 
        
        // update the menu setting for the clicked row
        const node = inputRows.find(node => node.key === nodeKey);
        node.collapsed = collapse;

        // toggle the hide prop of the descendents until either you find a descendent menu that is 'collapsed' or reach all descendents
        const twins = processedInput.modelTwinsMap.get(node.modelId);
        for (const twin of twins) {
            twin.hide = collapse;
        }
        setNodeRows(newRows);
    }, [inputRows, nodeRows, processedInput?.modelTwinsMap]);

    return <TwinsList nodeRows={nodeRows} onSelect={onSelect} onMenuClick={onMenuClick} styles={styles}/>;

});

function useProcessJson(jsonContent: object | Array<object>): ProcessedInput {
    return React.useMemo(() => {
        if (!jsonContent) { 
            return undefined; 
        }

        // we expect the input to be an object with 'value' property that holds an array of interface objects
        const rawArray: Twin[] = !Array.isArray(jsonContent) 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (jsonContent as { value: Twin[]}).value  
                ?? ((jsonContent as Twin)['@$dtId'] && [ (jsonContent as Twin) ])
                ?? null
            : jsonContent as Twin[];
        
        if (!rawArray || !Array.isArray(rawArray)) {
            return undefined;
        }
        // create a rootArray containing only Interface objects
        const rawTwinArray: Twin[] = rawArray.filter(rawObj => rawObj['$dtId']);
        
        const models = new Set<string>();
        const modelTwinsMap = new Map<string, Node[]>();
        
        // we'll assume there's a depth limit built into DTDL so we won't go
        // to deep and blow the stack. All top-level models should be interfaces.
        for (const rawNode of rawTwinArray) {
            const modelId = rawNode.$metadata.$model;
            if (!models.has(modelId)) {
                models.add(modelId);
            }
            if (!modelTwinsMap.has(modelId)) {
                modelTwinsMap.set(modelId, []);
            }
            const key = generateId();
            modelTwinsMap.get(modelId).push({
                key,
                id: rawNode.$dtId,
                modelId: rawNode.$metadata.$model,
                name: rawNode.name ?? rawNode.$dtId,
                isModel: false,
                hide: true
            });
        }

        if (models.size === 1) {
            // expand the twins
            models.forEach(modelId => {
                for (const twin of modelTwinsMap.get(modelId)) {
                    twin.hide = false;
                }
            });
        }
        
        return { models, modelTwinsMap };
    }, [jsonContent]);
}

function useGetRows(processedInput: ProcessedInput): Node[] {
    return React.useMemo(() => {
        const rows: Node[] = [];
        if (!processedInput) {
            return rows;
        }
        const { models, modelTwinsMap } = processedInput; 
        const collapsed = models.size > 1;

        models.forEach(model => {
            rows.push({
                key: generateId(),
                id: model,
                modelId: model,
                name: model,
                isModel: true,
                collapsed: collapsed,
            });
            const twins = modelTwinsMap.get(model);
            rows.push(...twins);
        })
        return rows;
    }, [processedInput]);
}

interface TwinsListProps {
    nodeRows: Node[];
    onSelect?: (selectedNode: Node) => void;
    onMenuClick: (e: MouseEvent, nodeKey: string, collapse: boolean) => void;
    styles?: DtStyleScheme;
}

function TwinsList({ nodeRows, onSelect, onMenuClick, styles }: TwinsListProps) {
    const [ selectedNode, setSelectedNode ] = React.useState<string>();
    const content = nodeRows.map(node => {
        const icon = node.collapsed ? '+' : '-';
        const onClick = (event) => onMenuClick(event, node.key, !node.collapsed);
        const MenuIcon = React.memo(() => <div className='menu-icon icon-button margin-end-xsmall clickable' onClick={onClick}>{icon}</div>);
        const select = !node.isModel
            ? () => {
                setSelectedNode(selectedNode === node.key ? undefined : node.key);
                onSelect(selectedNode === node.key ? undefined : node);
            }
            : undefined;
        if (!node.hide) {
            return (
                <div key={node.key} className={`row font-small margin-bottom-xsmall ${node.isModel ? 'model' : ''}`}>
                    {node.isModel && <MenuIcon />}
                    <div 
                        className={`${select ? ' clickable selectable' : ''} ${selectedNode === node.key ? 'selected' : 'unselected'}`} 
                        onClick={select}>
                            {node.isModel && <div>Model: <span style={styles?.modelId}>{node.id}</span></div>}
                            {!node.isModel && <div>
                                <div>TwinId: <span style={styles?.twinId}>{node.id}</span></div>
                                <div style={styles?.twinName}>{node.name}</div>
                            </div>}
                    </div>
                </div>
            );
        }
    });
    return (<div className='inner-viewer'>
        {content}
    </div>);
}