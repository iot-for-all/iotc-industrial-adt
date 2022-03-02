import * as React from 'react';

import './mapping.css';
import { DefaultButton, MessageBar, MessageBarType, PrimaryButton, TextField, TooltipHost } from '@fluentui/react';
import { MappingGrid, MappingGridItem } from './mappingGrid';
import { generateId } from './core/generateId';
import { useBoolean, useId } from '@fluentui/react-hooks';
import { OpcuaStyleScheme, TagNode } from './opcuaViewer';
import { OpcuaInputContainer } from './opcuaInputContainer';
import { DtInputContainer } from './dtInputContainer';
import { DtNode, DtStyleScheme } from './dtModels';
import { JqModal } from './jqModal';

interface OpcuaItem {
    key: string;
    nodeId: string;
    nodeName: string;
    namespace: string[];
}

interface DtItem {
    key: string;
    twinId: string;
    twinName: string;
    modelId: string;
    propertyName: string;
    propertyId?: string;
}

export const Mapping = React.memo(function Mapping() {
    const [ opcuaFile, setOpcuaFile ] = React.useState<File>();  // json input file for opcua definitions
    const [ opcuaJson, setOpcuaJson ] = React.useState<object>({});  // json content from the opcua input file

    const [ dtTwinsFile, setDtTwinsFile ] = React.useState<File>();  // json input file for dt definitions
    const [ dtTwinsJson, setDtTwinsJson ] = React.useState<object>({});   // json content from the dt input file

    const [ dtModelsFile, setDtModelsFile ] = React.useState<File>();  // json input file for dt definitions
    const [ dtModelsJson, setDtModelsJson ] = React.useState<object>({});   // json content from the dt input file

    const [ selectedKey, setSelectedKey ] = React.useState<string|number>();  // tracks the selected row key in the grid (make sure item keys aren't changing)

    // Item is an object containing the base properties need to map the selected entry.
    // 'Selected entry' refers to the data transferred when clicking on the raw opcua or dt input in the viewer or
    // from selecting a grid row for update. The item contents are shown in the working row and stored in the grid
    // item when the working row is saved.
    const [ opcuaItem, setOpcuaItem] = React.useState<OpcuaItem>();
    const [ dtItem, setDtItem ] = React.useState<DtItem>();

    const [ isUpdate, setIsUpdate ] = useBoolean(false);  // is a row selected (and its values put in the working row)?
    const [ deselect, setDeselect ] = useBoolean(false);  // after update, does the grid row need to be unselected?
    const [ error, setError ] = React.useState<string>();  // did an error occur?

    const [ items, setItems ] = React.useState<MappingGridItem[]>([]); // rows for the grid
    const [ filter, setFilter ] = React.useState<string>();
    const [ showJqModal, setShowJqModal ] = useBoolean(false);

    // if a file has been selected, opcuaFile will be updated with the File object.
    // Get the content of the file as JSON
    React.useEffect(() => {
        if (opcuaFile) {
            (async () => {
                try {
                    const content = await window.electron.loadFile(opcuaFile.path);
                    setOpcuaJson(JSON.parse(content));
                } catch (e) {
                    setError(e.message);
                    setOpcuaJson(undefined);
                    setOpcuaFile(undefined)
                }
            })();
        }
    }, [opcuaFile]);

    React.useEffect(() => {
        if (dtTwinsFile) {
            (async () => {
                try {
                    const content = await window.electron.loadFile(dtTwinsFile.path);
                    setDtTwinsJson(JSON.parse(content));
                } catch (e) {
                    setError(e.message);
                    setDtTwinsJson(undefined);
                    setDtTwinsFile(undefined)
                }
            })();
        }
    }, [dtTwinsFile]);

    React.useEffect(() => {
        if (dtModelsFile) {
            (async () => {
                try {
                    const content = await window.electron.loadFile(dtModelsFile.path);
                    setDtModelsJson(JSON.parse(content));
                } catch (e) {
                    setError(e.message);
                    setDtModelsJson(undefined);
                    setDtModelsFile(undefined)
                }
            })();
        }
    }, [dtModelsFile]);

    // row is selected in grid so find the row item and put its values in the input fields
    React.useEffect(() => {
        if (selectedKey) {
            const item = items.find(item => item.key === selectedKey);
            if (item) {
                const opcua = createOpcuaItemFromSelectedRow(item);
                setOpcuaItem(opcua);
                const dt = createDtItemFromSelectedRow(item);
                setDtItem(dt);
                setIsUpdate.setTrue();
            }
        } else {
            if (opcuaItem) {
                setOpcuaItem(undefined);
            }
            if (dtItem) {
                setDtItem(undefined);
            }
            setDeselect.setFalse();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKey]);  // only run if a grid row is selected, not if an entry is clicked in the viewer

    // callback for click on JSON node
    const onSelectDTInput = React.useCallback((dtNode: DtNode) => {
        const dt: DtItem = dtNode 
            ? {
                key: `${dtNode.twinKey}-${dtNode.modelKey}`,
                twinId: dtNode.twinId,
                twinName: dtNode.twinName,
                modelId: dtNode.modelId,
                propertyName: dtNode.propertyName,
                propertyId: dtNode.propertyId
            }
            : undefined;
        setDtItem(dt);
    }, []);

    const onSelectOpcuaInput = React.useCallback((tagNode: TagNode) => {
        const opcua: OpcuaItem = tagNode 
            ? {
                key: tagNode.key,
                nodeId: tagNode.id,
                nodeName: tagNode.name,
                namespace: tagNode.namespace
            }
            : undefined;
        setOpcuaItem(opcua);
    }, []);

    const onDismiss = React.useCallback((row: MappingGridItem) => setItems([...items.filter(item => item.key !== row.key)]),
        [items]);

    // callback for confirming (button click) the entries in the node pair input fields
    const onUpdateGrid = React.useCallback(() => {
        if (opcuaItem && dtItem) {
            if (selectedKey) {
                // find and update existing row
                const item = items.find(item => item.key === selectedKey);
                setExistingItemFromEntries(item, opcuaItem, dtItem);
            } else {
                // create new row
                const entry = createNewItemFromEntries(opcuaItem, dtItem);
                items.push(entry);
            }
            setItems([...items]);

            // clear the working item state now that it has been added to the grid
            setOpcuaItem(undefined);
            setDtItem(undefined);
            if (selectedKey) {
                setDeselect.setTrue();
            }
        }
    }, [opcuaItem, dtItem, selectedKey, items, setDeselect]);

    const opcuaTooltipId = useId('opcuaEntry');
    const content: JSX.Element = (<>
            <div>Node id: {opcuaItem?.nodeId}</div>
            <div>Path: {opcuaItem?.namespace.join('.')}</div>
        </>);
    const opcuaStyles: OpcuaStyleScheme = React.useMemo(() => ({
        leafName: { color: 'crimson' },
        path: { color: 'orange'},
        type: { fontStyle: 'italic'}
    }), []);

    const dtStyles: DtStyleScheme = React.useMemo(() => ({
        interfaceId: { color: 'royalblue'},
        propertyName: { color: 'crimson'},
        propertySchema: {fontStyle: 'italic' },
        twinId: { color: 'crimson' },
        twinName: { color: 'slategray' },
        modelId: { color: 'royalblue'}
    }), []);

    const onGenerateJQ = React.useCallback(() => {
        setShowJqModal.setTrue();
    }, [setShowJqModal]);

    return (<>
        {error && <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={false}
            onDismiss={() => setError(undefined)}
            dismissButtonAriaLabel="Close"
            className='margin-bottom-xsmall'
        >
            {error}
        </MessageBar>}
        <div className='mapping-container'>
            <div className='horizontal-group'>
                <OpcuaInputContainer 
                    jsonFile={opcuaFile}
                    setJsonFile={setOpcuaFile}
                    jsonContent={opcuaJson}
                    onSelect={onSelectOpcuaInput}
                    styles={opcuaStyles}
                />
                <DtInputContainer 
                    twinJsonFile={dtTwinsFile}
                    setTwinJsonFile={setDtTwinsFile}
                    twinJsonContent={dtTwinsJson}
                    modelJsonFile={dtModelsFile}
                    setModelJsonFile={setDtModelsFile}
                    modelJsonContent={dtModelsJson}
                    onSelect={onSelectDTInput}
                    styles={dtStyles}
                />
            </div>
            <div className='mapping-wrapper group-wrapper'>
                <div className='section-header group-header'>Add/Update Mapping</div>
                <div className='horizontal-group margin-bottom-xsmall full-width justify-ends'>
                    <div className='horizontal-group margin-end-xsmall'>
                        <TooltipHost
                            content={content}
                            id={opcuaTooltipId}
                        >
                            <TextField
                                name='opcuaNode'
                                label='Opc UA Node'
                                className='margin-end-xsmall'
                                value={opcuaItem?.nodeName}
                                readOnly
                            /> 
                        </TooltipHost>
                        <span className='anchor-bottom'><span className='margin-bottom-xsmall arrow'>{'->'}</span></span>
                        <TextField
                            name='dtTwin'
                            label='Digital Twin Id'
                            className='margin-start-xsmall'
                            value={dtItem?.twinId}
                            title={`${dtItem?.twinId}: ${dtItem?.twinName}`}
                            readOnly
                        />
                        <TextField
                            name='dtProperty'
                            label='Property'
                            className='margin-start-xsmall'
                            value={dtItem?.propertyName}
                            title={`${dtItem?.propertyName} (${dtItem?.propertyId})`}
                            readOnly
                        />
                        <div className='anchor-bottom'>
                            <PrimaryButton
                                text={selectedKey ? 'Update' : 'Add'}
                                className='margin-start-xsmall'
                                onClick={onUpdateGrid}
                                disabled={!opcuaItem || !dtItem?.propertyName || !dtItem?.twinId || !dtItem?.modelId}
                            />
                        </div>
                    </div>
                    <div className='horizontal-group place-end'>
                        <TextField
                            className='margin-start-xsmall'
                            label="Filter:"
                            onChange={(_, value) => setFilter(value)}
                        />
                    </div>
                </div>
                <div className='grid'>
                    {<MappingGrid 
                        allItems={items} 
                        setSelectedKey={setSelectedKey}
                        onDismiss={onDismiss}
                        deselect={deselect}
                    />}
                </div>
            </div>
            <Footer disabled={!items?.length} onGenerateJQ={onGenerateJQ} onSaveMapping={null} />
            <JqModal jq={items} isModalOpen={showJqModal} onDismiss={setShowJqModal.setFalse} />
        </div>
    </>);
});

function setExistingItemFromEntries(item: MappingGridItem, opcuaItem: OpcuaItem, dtItem: DtItem) {
    if (item) {
        item.opcuaKey = opcuaItem.key;
        item.opcuaName = opcuaItem.nodeName;
        item.opcuaNodeId = opcuaItem.nodeId;
        item.opcuaPath = opcuaItem.namespace;
        item.dtKey = dtItem.key;
        item.dtPropertyName = dtItem.propertyName;
        item.dtPropertyId = dtItem.propertyId;
        item.dtId = dtItem.twinId;
        item.dtName = dtItem.twinName;
        item.dtModelId = dtItem.modelId;
    }
}

function createNewItemFromEntries(opcuaItem: OpcuaItem, dtItem: DtItem): MappingGridItem {
    return {
        key: generateId(),
        opcuaKey: opcuaItem.key,
        opcuaName: opcuaItem.nodeName,
        opcuaNodeId: opcuaItem.nodeId,
        opcuaPath: opcuaItem.namespace,
        dtKey: dtItem.key,
        dtPropertyName: dtItem.propertyName,
        dtPropertyId: dtItem.propertyId,
        dtId: dtItem.twinId,
        dtName: dtItem.twinName,
        dtModelId: dtItem.modelId
    };
}

function createOpcuaItemFromSelectedRow(item: MappingGridItem): OpcuaItem {
    return {
        key: item.opcuaKey,
        nodeId: item.opcuaNodeId,
        nodeName: item.opcuaName,
        namespace: item.opcuaPath
    };
}

function createDtItemFromSelectedRow(item: MappingGridItem): DtItem {
    return {
        key: item.dtKey,
        twinId: item.dtId,
        twinName: item.dtName,
        modelId: item.dtModelId,
        propertyName: item.dtPropertyName,
        propertyId: item.dtPropertyId
    };
}

interface FooterProps {
    disabled: boolean;
    onGenerateJQ: React.MouseEventHandler<HTMLButtonElement>;
    onSaveMapping: React.MouseEventHandler<HTMLButtonElement>;
}

const Footer = React.memo(function Footer({ disabled, onGenerateJQ, onSaveMapping } : FooterProps) {
    return (<div className='horizontal-group footer'>
      <PrimaryButton text='Generate JQ' disabled={disabled} onClick={onGenerateJQ} />
      <DefaultButton text='Save Mapping' className='margin-start-xsmall' disabled={disabled} onClick={onSaveMapping} />
    </div>);  
  })