import React from 'react';
import { generateId } from './core/generateId';
import { CustomTwin, DtStyleScheme } from './models';

import './dtViewer.css';
import { TooltipHost } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';

export interface TwinsViewerProps {
    jsonContent: object | Array<object>;
    theme?: 'light' | 'dark';
    className?: string;
    collapsed?: boolean |  number;
    noWrap?: boolean;
    styles?:  DtStyleScheme;
    onSelect: (selectedNode: Node) => void;
    selectedModelId: string;
    selectedTwinKey: string;
    customTwin: CustomTwin;
}

export interface Node {
    key: string;
    id: string;  // model or twin id
    name: string;
    modelId: string;
    isModel: boolean;
    collapsed?: boolean;
    hide?: boolean; // for descendents, set to true if an ancestor has collapsed === true; used in render to determine whether to show the row
    isNew?: boolean;
    isSeparator?: boolean;
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

export const DtTwinsViewer = React.memo(function DtTwinsViewer({ jsonContent, onSelect, selectedModelId, selectedTwinKey, styles, customTwin }: TwinsViewerProps) {

    const [ nodeRows, setNodeRows ] = React.useState([]);
    let processedInput;
    let error;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        processedInput = useProcessJson(jsonContent);
    } catch (e) {
        processedInput = undefined;
        error = `Invalid input file (${e?.message})`;
    }
    const inputRows = useGetRows(processedInput);

    // add any custom twins after the JSON has been processed and memoized
    const allRows = useGetCustomRows(inputRows, customTwin, processedInput);

    const filteredRows = React.useMemo(() => {
        if (selectedModelId) {
            return allRows.filter(row => row.modelId === selectedModelId);
        }
        return allRows;
    }, [allRows, selectedModelId]);

    // update the rows when a new file is selected (brings in new content)
    React.useEffect(() => {
        setNodeRows(filteredRows);
    }, [filteredRows]);

    const onMenuClick = React.useCallback((e: MouseEvent, nodeKey: string, collapse: boolean) => {
        // create a new array object but return existing node objects
        // since their references are used in the node.children array
        const newRows = [...nodeRows];

        // update the menu setting for the clicked row
        const node = allRows.find(node => node.key === nodeKey);
        node.collapsed = collapse;

        // if clicked menu is on a model, collapse/expand twins, separator and new twins.
        // if the clicked menu is on the separator, only collapse/expand the separator and its twins.
        if (node.isModel) {
            const twins = processedInput.modelTwinsMap.get(node.modelId);
            for (const twin of twins) {
                twin.hide = collapse;
            }
        }

        const separator = node.isSeparator ? node : allRows.find(row => row.isSeparator && row.modelId === node.modelId);
        if (separator) {
            const twins = processedInput.modelTwinsMap.get(separator.key);
            for (const twin of twins) {
                twin.hide = collapse;
            }
        }

        setNodeRows(newRows);
    }, [allRows, nodeRows, processedInput?.modelTwinsMap]);

    if (error) {
        return (<div className='viewer'>
            {error}
        </div>);
    }
    return (
        <TwinsList
            nodeRows={nodeRows}
            onSelect={onSelect}
            selectedTwinKey={selectedTwinKey}
            onMenuClick={onMenuClick}
            styles={styles}
        />
    );

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

function useGetCustomRows(inputRows: Node[], customTwin: CustomTwin, processedInput: ProcessedInput): Node[] {
    return React.useMemo(() => {
        const allRows: Node[] = [...inputRows];

        if (customTwin?.modelId && customTwin.twinId) {
            const { modelId, twinId } = customTwin;
            const { models, modelTwinsMap } = processedInput;

            // if the model already exists, we'll add the twin immediately after it; otherwise, we'll
            // add a new model row followed by the twin
            let modelRowIdx = allRows.findIndex(node => node.isModel && node.modelId === modelId);
            if (modelRowIdx < 0) {
                allRows.push({
                    key: generateId(),
                    id: modelId,
                    modelId: modelId,
                    name: modelId,
                    isModel: true,
                    collapsed: false
                });
                modelRowIdx = allRows.length - 1;
            }

            // update the model-twin map for collapse/expand menu clicks
            if (!models.has(modelId)) {
                models.add(modelId);
            }
            if (!modelTwinsMap.has(modelId)) {
                modelTwinsMap.set(modelId, []);
            }

            // find last twin under the current model
            let separatorNode: Node;
            while (allRows[++modelRowIdx]?.modelId === modelId) {
                if (allRows[modelRowIdx].isSeparator) {
                    separatorNode = allRows[modelRowIdx];
                }
            }

            // if there aren't any new twins yet, add a separator between existing twins
            // for the model and the new twin
            if (!separatorNode) {
                separatorNode = {
                    key: generateId(),
                    id: `newtwins-${modelId}`,
                    modelId: modelId,
                    name: 'separator',
                    isModel: false,
                    collapsed: false,
                    isNew: true,
                    isSeparator: true
                };
                allRows[modelRowIdx] = separatorNode;
                modelRowIdx++;
            }

            // add a group for collapse/expand menu clicks on separator
            if (!models.has(separatorNode.key)) {
                models.add(separatorNode.key);
            }
            if (!modelTwinsMap.has(separatorNode.key)) {
                modelTwinsMap.set(separatorNode.key, []);
            }

            // create the row for the twin
            const twinRow: Node = {
                key: generateId(),
                id: twinId,
                modelId: modelId,
                name: twinId,
                isModel: false,
                collapsed: separatorNode.collapsed,
                isNew: true
            };
            allRows.splice(modelRowIdx, 0, twinRow);
            modelTwinsMap.get(separatorNode.key).push(twinRow);
        }
        return allRows;
    }, [inputRows, customTwin, processedInput]);
}

interface TwinsListProps {
    nodeRows: Node[];
    onSelect?: (selectedNode: Node) => void;
    selectedTwinKey: string;
    onMenuClick: (e: MouseEvent, nodeKey: string, collapse: boolean) => void;
    styles?: DtStyleScheme;
}

function TwinsList({ nodeRows, onSelect, selectedTwinKey, onMenuClick, styles }: TwinsListProps) {
    const tooltipId = useId('newTwin');
    const content = nodeRows.map(node => {
        const icon = node.collapsed ? '+' : '-';
        const onClick = (event) => onMenuClick(event, node.key, !node.collapsed);
        const MenuIcon = React.memo(() => <div className='menu-icon icon-button margin-end-xsmall clickable' onClick={onClick}>{icon}</div>);
        const select = !(node.isModel || node.isSeparator)
            ? () => onSelect(selectedTwinKey === node.key ? undefined : node)
            : undefined;
        const content: JSX.Element = (<div key={`${generateId()}`}>
            The twin ids under this menu do NOT exist and will be created when mapped OPC-UA telemetry is sent.
        </div>);
        if (!node.hide) {
            return (
                <div key={node.key} className={`row font-small margin-bottom-xsmall ${node.isModel || node.isSeparator ? 'model' : ''} ${node.isNew ? 'new-twin' : ''} \
                    ${node.isSeparator ? 'new-twin-separator' : ''} ${selectedTwinKey === node.key ? 'selected' : 'unselected'}`} >
                    {(node.isModel || node.isSeparator) && <MenuIcon />}
                    <div
                        className={`viewer-row-label ${select ? ' clickable selectable' : ''}`}
                        onClick={select}>
                            {node.isModel && <div>Model: <span style={styles?.modelId}>{node.id}</span></div>}
                            {!(node.isModel || node.isSeparator) && <div>
                                <div>TwinId: <span style={styles?.twinId}>{node.id}</span></div>
                                <div style={styles?.twinName}>{node.name}</div>
                            </div>}
                            {node.isSeparator &&
                                <TooltipHost
                                content={content}
                                // This id is used on the tooltip itself, not the host
                                // (so an element with this id only exists when the tooltip is shown)
                                id={tooltipId}
                                >
                                    <div>Future Twins for <span style={styles?.modelId}>{node.modelId}</span></div>
                            </TooltipHost>}
                    </div>
                </div>
            );
        }
    });
    return (<div className='inner-viewer'>
        {content}
    </div>);
}