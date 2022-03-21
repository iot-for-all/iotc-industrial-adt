import {
  Dropdown,
  IconButton,
  IDropdownOption,
  SearchBox,
  Spinner,
  SpinnerSize,
  Stack,
  TextField,
  Toggle,
} from "@fluentui/react";
import React, { Dispatch, SetStateAction, useCallback, useState } from "react";
import { FileUpload } from "./core/controls/fileUpload";
import { CustomTwin, DtItem, DtStyleScheme } from "./models";
import { DtModelViewer, Interface, Node as ModelNode } from "./dtModelViewer";
import { DtTwinsViewer, Node as TwinNode, Twin } from "./dtTwinsViewer";

import "./inputContainer.css";
import { useBoolean } from "@fluentui/react-hooks";
import { TooltipIconButton } from "./core/controls/tooltipIconButton";
import { ErrorBoundary } from "./core/controls/errorBoundary";
import { HideSearch } from "./hideSearchSvg";
import { API_VERSIONS, TOKEN_AUDIENCES } from "./core/constants";

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
  onAddNewTwin: (twinId: string) => void;
  customTwin: CustomTwin;
}

export function DtInputContainer(props: NodeViewerProps) {
  const {
    twinJsonFile,
    setTwinJsonFile,
    modelJsonFile,
    setModelJsonFile,
    setModelJsonContent,
    setTwinJsonContent,
    twinJsonContent,
    modelJsonContent,
    onSelect,
    dtItem,
    styles,
    onAddNewTwin,
    customTwin,
  } = props;

  // loadings
  const [
    loadingInstances,
    { setTrue: startLoadInstances, setFalse: stopLoadInstances },
  ] = useBoolean(false);
  const [useFiles, { toggle: toggleFiles }] = useBoolean(false);
  const [adtItems, setAdtItems] = React.useState<IDropdownOption[]>([]);
  const [
    modelsLoading,
    { setTrue: startLoadModels, setFalse: stopLoadModels },
  ] = useBoolean(false);
  const [twinsLoading, { setTrue: startLoadTwins, setFalse: stopLoadTwins }] =
    useBoolean(false);
  const [showAdd, setShowAdd] = useBoolean(false);
  const [newTwin, setNewTwin] = React.useState<string>();
  const [invalidName, setInvalidName] = useBoolean(false);
  const [hostname, setHostname] = useState(null);

  // search
  const [showModelSearch, setShowModelSearch] = useBoolean(false);
  const [modelSearchFilter, setModelSearchFilter] = React.useState<string>();
  const [showTwinSearch, setShowTwinSearch] = useBoolean(false);
  const [twinSearchFilter, setTwinSearchFilter] = React.useState<string>();

  const [selectedTwinKey, selectedModelKey] = React.useMemo(() => {
    const hyphenIdx = dtItem?.key?.indexOf("-");
    const selectedTwinKey =
      hyphenIdx > 0 ? dtItem.key.substring(0, hyphenIdx) : undefined;
    const selectedModelKey =
      hyphenIdx > 0 ? dtItem.key.substring(hyphenIdx + 1) : undefined;
    return [selectedTwinKey, selectedModelKey];
  }, [dtItem]);

  // fetch
  const getModels = useCallback(
    async (hostname) => {
      const models = await window.electron.getModels(hostname);
      setModelJsonContent(models);
      stopLoadModels();
    },
    [setModelJsonContent, stopLoadModels]
  );

  const getTwins = useCallback(
    async (hostname) => {
      const twins = await window.electron.getTwins(hostname);
      setTwinJsonContent(twins);
      stopLoadTwins();
    },
    [setTwinJsonContent, stopLoadTwins]
  );

  const onTwinSelect = React.useCallback(
    (twinNode: TwinNode) => {
      // note: 'twinNode' will become undefined when the current twin selection is clicked off
      // don't allow twin selection from a different model if model is already selected
      const currModelId = twinNode?.modelId;
      if (currModelId && dtItem?.modelId && dtItem.modelId !== currModelId) {
        return;
      }
      onSelect({
        ...dtItem,
        key: `${twinNode?.key}-${selectedModelKey}`,
        twinKey: twinNode?.key,
        twinId: twinNode?.id,
        twinName: twinNode?.name,
        modelId: twinNode?.modelId,
      });
    },
    [dtItem, onSelect, selectedModelKey]
  );

  const onModelSelect = React.useCallback(
    (modelNode: ModelNode) => {
      // note: 'modelNode' will become undefined when the current model selection is clicked off
      const currModelId = dtItem?.modelId;
      const newItem = {
        ...dtItem,
        key: `${selectedTwinKey}-${modelNode?.key}`,
        modelKey: modelNode?.key,
        propertyName: modelNode?.name,
        propertyId: modelNode?.id,
        modelId: modelNode?.modelId,
      };
      if (modelNode?.modelId !== currModelId) {
        (newItem.key = `undefined-${modelNode?.key}`),
          (newItem.twinKey = undefined);
        newItem.twinId = undefined;
        newItem.twinName = undefined;
      }
      onSelect(newItem);
    },
    [dtItem, onSelect, selectedTwinKey]
  );

  const onInstancesLoading = React.useCallback(
    (props) => {
      return (
        <Stack
          horizontal
          verticalAlign="center"
          horizontalAlign="space-between"
        >
          <span>Select Azure Digital Twins instance</span>
          <Spinner
            size={SpinnerSize.small}
            style={{ visibility: loadingInstances ? "visible" : "hidden" }}
          />
        </Stack>
      );
    },
    [loadingInstances]
  );

  const onInstanceSelected = React.useCallback(
    async (event: React.FormEvent<HTMLDivElement>, item: IDropdownOption) => {
      startLoadModels();
      startLoadTwins();
      const armParams: RequestInit = {
        method: "GET",
        headers: {
          Authorization: `Bearer ${await window.electron.getToken(
            TOKEN_AUDIENCES.Arm
          )}`,
        },
      };
      const instanceResp = await fetch(
        `https://management.azure.com${item.key}?api-version=${API_VERSIONS.DigitalTwinsControl}`,
        armParams
      );
      const adtHostname = (await instanceResp.json()).properties.hostName;
      await Promise.all([getModels(adtHostname), getTwins(adtHostname)]);
      setHostname(adtHostname);
    },
    [setHostname]
  );

  const onDropDownOpen = React.useCallback(
    async (e) => {
      startLoadInstances();
      const armToken = await window.electron.getToken(
        "https://management.azure.com/user_impersonation"
      );
      const params = {
        method: "GET",
        headers: {
          Authorization: `Bearer ${armToken}`,
        },
      };
      const subResp = await fetch(
        `https://management.azure.com/subscriptions?api-version=${API_VERSIONS.ResourceManager}`,
        params
      );
      const subs = (await subResp.json()).value;
      const resources = await Promise.all(
        subs.map(async (sub) => {
          const resResp = await fetch(
            `https://management.azure.com/subscriptions/${sub.subscriptionId}/resources?api-version=${API_VERSIONS.ResourceManager}&$filter=resourceType eq 'Microsoft.DigitalTwins/digitalTwinsInstances'`,
            params
          );
          const resources = (await resResp.json()).value;
          return resources;
        })
      );
      stopLoadInstances();
      setAdtItems(
        resources.flat().map((r) => ({
          key: r.id,
          text: r.name,
          data: r,
        }))
      );
    },
    [startLoadInstances, stopLoadInstances, setAdtItems]
  );

  // relationships
  const getRelationships = React.useCallback((modelId, twinId) => {
    modelJsonContent;
  }, []);

  const simpleIconStyles = {
    root: {
      width: "24px",
      height: "24px",
      alignSelf: "center",
      marginBottom: "0.25rem", // moves vertical centering up by half the margin below the row
      icon: {
        fontSize: "smaller",
      },
    },
  };

  const addDisabled = !newTwin || !dtItem?.modelId || invalidName;
  const onAdd = React.useCallback(() => {
    onAddNewTwin(newTwin);
    setNewTwin("");
  }, [newTwin, onAddNewTwin]);

  const onSubmit = React.useCallback(
    (e: React.SyntheticEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!addDisabled) {
        onAdd();
      }
    },
    [addDisabled, onAdd]
  );

  const onTwinNameError = React.useCallback(
    (value) => {
      if ((value as string)?.match(".*[\\s].*")) {
        setInvalidName.setTrue();
        return "Name cannot contain spaces";
      }
      setInvalidName.setFalse();
      return "";
    },
    [setInvalidName]
  );

  const modelSearchTitle = `${!showModelSearch ? "Show" : "Hide"} search field`;
  const twinSearchTitle = `${!showTwinSearch ? "Show" : "Hide"} search field`;

  return (
    <ErrorBoundary>
      <div className="file-viewer-container group-wrapper twins-wrapper">
        <div className="section-header group-header">Digital Twins</div>
        {!useFiles && (
          <div className="margin-bottom-xsmall">
            <Dropdown
              label="Load from instance"
              options={adtItems}
              onClick={onDropDownOpen}
              onRenderPlaceholder={onInstancesLoading}
              onChange={onInstanceSelected}
            />
          </div>
        )}
        <div className="option-toggle">
          <Toggle
            label="Load from files"
            inlineLabel
            onText="On"
            offText="Off"
            onChange={toggleFiles}
          />
        </div>
        <div className="horizontal-group expand no-scroll-parent">
          <div className="vertical-group twins-viewer margin-end-xsmall">
            <div className="flatten-toggle horizontal-group justify-ends">
              <div className="section-header align-bottom">Models</div>
              <div className="horizontal-group search-toggle margin-end-xsmall">
                <IconButton
                  iconProps={{ iconName: "Sync" }}
                  onClick={async () => {
                    startLoadModels();
                    await getModels(hostname);
                  }}
                />
                <TooltipIconButton
                  onClick={setShowModelSearch.toggle}
                  iconProps={{
                    iconName: `${!showModelSearch ? "search" : undefined}`,
                  }}
                  title={modelSearchTitle}
                  tooltip={modelSearchTitle}
                  className="search-toggle"
                  img={showModelSearch ? <HideSearch /> : undefined}
                />
              </div>
            </div>
            {useFiles && (
              <div className="horizontal-group margin-bottom-xsmall">
                <FileUpload
                  onChange={setModelJsonFile}
                  iconOnly
                  iconProps={{ iconName: "openFile" }}
                  className="icon-button margin-end-xsmall"
                  tooltip="Upload Device Twin models json"
                />
                <div
                  className="margin-start-xsmall font-small ellipsis-left"
                  title={modelJsonFile?.path || "No file selected"}
                >
                  {modelJsonFile?.path || "No file selected"}
                </div>
              </div>
            )}
            <div className="viewer-container">
              {showModelSearch && (
                <SearchBox
                  placeholder={"Search"}
                  className="margin-bottom-xsmall search"
                  onChange={(_, value) => setModelSearchFilter(value)}
                />
              )}
              {modelsLoading ? (
                <div className="loader">
                  <Spinner size={SpinnerSize.large} />
                </div>
              ) : (
                <DtModelViewer
                  models={modelJsonContent}
                  onSelect={onModelSelect}
                  selectedModelKey={selectedModelKey}
                  styles={styles}
                  searchFilter={modelSearchFilter}
                />
              )}
            </div>
          </div>
          <div className="vertical-group twins-viewer">
            <div className="flatten-toggle horizontal-group justify-ends">
              <div className="section-header align-bottom">Twin Instances</div>
              <div className="horizontal-group place-end">
                <div className="horizontal-group">
                  <TooltipIconButton
                    onClick={setShowAdd.toggle}
                    iconProps={{ iconName: `${!showAdd ? "add" : "remove"}` }}
                    title="Show/hide add twin"
                    tooltip="Show/hide add input field"
                    className="add"
                  />
                  <IconButton
                    iconProps={{ iconName: "Sync" }}
                    onClick={async () => {
                      startLoadTwins();
                      await getTwins(hostname);
                    }}
                  />
                </div>
                <div className="vertical-group search-toggle margin-end-xsmall">
                  <TooltipIconButton
                    onClick={setShowTwinSearch.toggle}
                    iconProps={{
                      iconName: `${!showTwinSearch ? "search" : undefined}`,
                    }}
                    title={twinSearchTitle}
                    tooltip={twinSearchTitle}
                    className="search-toggle"
                    img={showTwinSearch ? <HideSearch /> : undefined}
                  />
                </div>
              </div>
            </div>
            {useFiles && (
              <div className="horizontal-group margin-bottom-xsmall">
                <FileUpload
                  onChange={setTwinJsonFile}
                  iconOnly
                  iconProps={{ iconName: "openFile" }}
                  className="icon-button margin-end-xsmall"
                />
                <div
                  className="margin-start-xsmall font-small ellipsis-left"
                  title={twinJsonFile?.path || "No file selected"}
                >
                  {twinJsonFile?.path || "No file selected"}
                </div>
              </div>
            )}
            <div className="viewer-container">
              {showAdd && (
                <form className="horizontal-group" onSubmit={onSubmit}>
                  <TextField
                    name="newTwin"
                    label=""
                    title={
                      !dtItem?.modelId
                        ? "Choose model first, then enter new twin name"
                        : "Enter name of new twin"
                    }
                    className="margin-bottom-xsmall add-input margin-end-xsmall"
                    value={newTwin}
                    onChange={(_, twinId) => setNewTwin(twinId)}
                    placeholder={
                      !dtItem?.modelId
                        ? "Choose from Models first"
                        : "Enter name of new twin"
                    }
                    disabled={!dtItem?.modelId}
                    onGetErrorMessage={onTwinNameError}
                    autoFocus
                  />
                  <IconButton
                    iconProps={{ iconName: "add" }}
                    title="Add entry"
                    ariaLabel="add"
                    disabled={addDisabled}
                    className="simple-icon-button-small margin-end-xsmall"
                    styles={simpleIconStyles}
                    onClick={onAdd}
                  />
                  <IconButton
                    iconProps={{ iconName: "cancel" }}
                    title="Clear entry"
                    ariaLabel="cancel"
                    disabled={!newTwin}
                    className="simple-icon-button-small"
                    styles={simpleIconStyles}
                    onClick={() => setNewTwin("")}
                  />
                </form>
              )}
              {showTwinSearch && (
                <SearchBox
                  placeholder={"Search"}
                  className="margin-bottom-xsmall search"
                  onChange={(_, value) => setTwinSearchFilter(value)}
                />
              )}
              {twinsLoading ? (
                <div className="loader">
                  <Spinner size={SpinnerSize.large} />
                </div>
              ) : (
                <DtTwinsViewer
                  twins={twinJsonContent}
                  onSelect={onTwinSelect}
                  getRelationships={getRelationships}
                  selectedModelId={dtItem?.modelId}
                  selectedTwinKey={selectedTwinKey}
                  styles={styles}
                  customTwin={customTwin}
                  searchFilter={twinSearchFilter}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
