import { Dropdown, IDropdownOption, IDropdownProps, SearchBox, Spinner, SpinnerSize, Stack, Toggle } from '@fluentui/react';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { FileUpload } from './core/controls/fileUpload';
import { CustomTwin, DtItem, DtStyleScheme } from './models';
import { DtModelViewer, Node as ModelNode, Interface } from './dtModelViewer';
import { DtTwinsViewer, Node as TwinNode, Twin } from './dtTwinsViewer';

import './inputContainer.css';
import { useBoolean } from '@fluentui/react-hooks';
import { API_VERSIONS, TOKEN_AUDIENCES } from './core/constants';

export interface NodeViewerProps {
    twinJsonFile: File;
    modelJsonFile: File;
    setTwinJsonFile: Dispatch<SetStateAction<File>>;
    setModelJsonFile: Dispatch<SetStateAction<File>>;
    setModelJsonContent: Dispatch<SetStateAction<Interface[]>>;
    setTwinJsonContent: Dispatch<SetStateAction<Twin[]>>;
    twinJsonContent: Twin[];
    modelJsonContent: Interface[];
    onSelect: (selectedNode: DtItem) => void;
    dtItem: DtItem;
    styles?: DtStyleScheme;
    customTwin: CustomTwin;
}

export function DtInputContainer(props: NodeViewerProps) {
    const { twinJsonFile, setTwinJsonFile, modelJsonFile, setModelJsonFile, setTwinJsonContent, twinJsonContent, modelJsonContent, setModelJsonContent, onSelect, dtItem, styles, customTwin } = props;
    const [adtItems, setAdtItems] = useState<IDropdownOption[]>([]);
    const [loadingInstances, { setTrue: startLoadInstances, setFalse: stopLoadInstances }] = useBoolean(false);
    const [useFiles, { toggle: toggleFiles }] = useBoolean(false);
    const [modelsLoading, { setTrue: startLoadModels, setFalse: stopLoadModels }] = useBoolean(false);
    const [twinsLoading, { setTrue: startLoadTwins, setFalse: stopLoadTwins }] = useBoolean(false);

    const [selectedTwinKey, selectedModelKey] = React.useMemo(() => {
        const hyphenIdx = dtItem?.key.indexOf('-');
        const selectedTwinKey = hyphenIdx > 0 ? dtItem.key.substring(0, hyphenIdx) : undefined;
        const selectedModelKey = hyphenIdx > 0 ? dtItem.key.substring(hyphenIdx + 1) : undefined;
        return [selectedTwinKey, selectedModelKey];
    }, [dtItem]);

    const onTwinSelect = React.useCallback((twinNode: TwinNode) => {
        onSelect({
            ...dtItem,
            key: `${twinNode?.key}-${selectedModelKey}`,
            twinKey: twinNode?.key,
            twinId: twinNode?.id,
            twinName: twinNode?.name,
            modelId: twinNode?.modelId
        });
    }, [dtItem, onSelect, selectedModelKey]);

    const onModelSelect = React.useCallback((modelNode: ModelNode) => {
        onSelect({
            ...dtItem,
            key: `${selectedTwinKey}-${modelNode?.key}`,
            modelKey: modelNode?.key,
            propertyName: modelNode?.name,
            propertyId: modelNode?.id
        });
    }, [dtItem, onSelect, selectedTwinKey]);

    const onInstancesLoading = React.useCallback((props) => {
        return <Stack horizontal verticalAlign='center' horizontalAlign='space-between'>
            <span>Select Azure Digital Twins instance</span>
            <Spinner size={SpinnerSize.small} style={{ visibility: loadingInstances ? 'visible' : 'hidden' }} />
        </Stack>;
    }, [loadingInstances]);

    const onInstanceSelected = React.useCallback(async (event: React.FormEvent<HTMLDivElement>, item: IDropdownOption) => {
        startLoadModels();
        startLoadTwins();
        const armParams: RequestInit = {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${await window.electron.getToken(TOKEN_AUDIENCES.Arm)}`
            }
        };
        const instanceResp = await fetch(`https://management.azure.com${item.key}?api-version=${API_VERSIONS.DigitalTwinsControl}`, armParams);
        const adtHostname = (await instanceResp.json()).properties.hostName;
        const getModels = async () => {
            return await window.electron.getModels(adtHostname);
        }
        const getTwins = async () => {
            return await window.electron.getTwins(adtHostname);
        }
        const data = await Promise.all([getModels(), getTwins()]);

        if (data[0]) {
            setModelJsonContent(data[0]);
            stopLoadModels();
        }
        if (data[1]) {
            setTwinJsonContent(data[1]);
            stopLoadTwins();
        }
    }, []);

    return (
        <div className='file-viewer-container group-wrapper twins-wrapper'>
            <div className='section-header group-header'>Digital Twins</div>

            {!useFiles &&
                <div className='margin-bottom-xsmall'>
                    <Dropdown label='Load from instance' options={adtItems} onClick={async (e) => {
                        startLoadInstances();
                        const armToken = await window.electron.getToken('https://management.azure.com/user_impersonation');
                        const params = {
                            method: 'GET',
                            headers: {
                                Authorization: `Bearer ${armToken}`
                            }
                        };
                        const subResp = await fetch(`https://management.azure.com/subscriptions?api-version=${API_VERSIONS.ResourceManager}`, params);
                        const subs = (await subResp.json()).value;
                        const resources = await Promise.all(subs.map(async (sub) => {
                            const resResp = await fetch(`https://management.azure.com/subscriptions/${sub.subscriptionId}/resources?api-version=${API_VERSIONS.ResourceManager}&$filter=resourceType eq 'Microsoft.DigitalTwins/digitalTwinsInstances'`, params);
                            const resources = (await resResp.json()).value;
                            return resources;
                        }));
                        stopLoadInstances();
                        setAdtItems(resources.flat().map(r => ({
                            key: r.id,
                            text: r.name,
                            data: r
                        })));
                    }} onRenderPlaceholder={onInstancesLoading}
                        onChange={onInstanceSelected}
                    />
                </div>
            }
            <div className='option-toggle'>
                <Toggle label="Load from files" inlineLabel onText="On" offText="Off" onChange={toggleFiles} />
            </div>
            <div className='horizontal-group expand no-scroll-parent'>
                <div className='vertical-group twins-viewer margin-end-xsmall'>
                    <div className='section-header'>Twin Instances</div>
                    {useFiles &&
                        <div className='horizontal-group margin-bottom-xsmall'>
                            <FileUpload
                                onChange={setTwinJsonFile}
                                iconOnly
                                iconProps={{ iconName: 'openFile' }}
                                className='icon-button margin-end-xsmall'
                            />
                            <div className='margin-start-xsmall font-small ellipsis-left' title={twinJsonFile?.path || 'No file selected'}>
                                {twinJsonFile?.path || 'No file selected'}
                            </div>
                        </div>
                    }
                    <div className='viewer-container'>
                        {twinsLoading ? <div className='loader'>
                            <Spinner size={SpinnerSize.large} />
                        </div> : <>
                            <SearchBox
                                placeholder={'Search'}
                                className='margin-bottom-xsmall'
                            />
                            <DtTwinsViewer jsonContent={twinJsonContent} onSelect={onTwinSelect} selectedTwinKey={selectedTwinKey} styles={styles} selectedModelId={dtItem?.modelId} customTwin={customTwin} />
                        </>}
                    </div>
                </div>
                <div className='vertical-group twins-viewer'>
                    <div className='section-header'>Models</div>
                    {useFiles &&
                        <div className='horizontal-group margin-bottom-xsmall'>
                            <FileUpload
                                onChange={setModelJsonFile}
                                iconOnly
                                iconProps={{ iconName: 'openFile' }}
                                className='icon-button margin-end-xsmall'
                            />
                            <div className='margin-start-xsmall font-small ellipsis-left' title={modelJsonFile?.path || 'No file selected'}>
                                {modelJsonFile?.path || 'No file selected'}
                            </div>
                        </div>
                    }
                    <div className='viewer-container'>
                        {modelsLoading ? <div className='loader'>
                            <Spinner size={SpinnerSize.large} />
                        </div> : <>
                            <SearchBox
                                placeholder={'Search'}
                                className='margin-bottom-xsmall'
                            />
                            <DtModelViewer jsonContent={modelJsonContent} onSelect={onModelSelect} selectedModelKey={selectedModelKey} styles={styles} />
                        </>}
                    </div>
                </div>
            </div>
        </div>
    );
}