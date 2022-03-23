import { SearchBox, Toggle } from "@fluentui/react";
import { useBoolean } from "@fluentui/react-hooks";
import React, { Dispatch, SetStateAction } from "react";
import { FileUpload } from "./core/controls/fileUpload";
import { OpcuaViewer, OpcuaStyleScheme, TagNode } from "./opcuaViewer";
import { TooltipIconButton } from "./core/controls/tooltipIconButton";

import "./inputContainer.css";
import { HideSearch } from "./hideSearchSvg";

export interface OpcuaInputContainerProps {
  jsonFile: File;
  setJsonFile: Dispatch<SetStateAction<File>>;
  jsonContent: object;
  onSelect: (selectedNode: TagNode) => void;
  selectedItemKey: string;
  styles?: OpcuaStyleScheme;
}

export function OpcuaInputContainer(props: OpcuaInputContainerProps) {
  const {
    jsonFile,
    setJsonFile,
    jsonContent,
    onSelect,
    selectedItemKey,
    styles,
  } = props;

  const [flattened, setFlattened] = useBoolean(false);
  const [showSearch, setShowSearch] = useBoolean(false);
  const [searchFilter, setSearchFilter] = React.useState<string>();

  const onChange = React.useCallback(
    (e: React.MouseEvent<HTMLElement>, checked: boolean) => {
      if (checked) {
        setFlattened.setTrue();
      } else {
        setFlattened.setFalse();
      }
    },
    [setFlattened]
  );

  return (
    <div className="file-viewer-container group-wrapper opcua-wrapper margin-end-xsmall">
      <div className="section-header group-header">OPC-UA Node Hierarchy</div>
      <div className="flatten-toggle horizontal-group justify-ends">
        <Toggle
          label="Flattened"
          inlineLabel
          onText="On"
          offText="Off"
          onChange={onChange}
        />
        <div className="vertical-group search-toggle">
          <TooltipIconButton
            onClick={setShowSearch.toggle}
            iconProps={{ iconName: `${!showSearch ? "search" : undefined}` }}
            title={`${!showSearch ? "Show" : "Hide"} search field`}
            tooltip={`${!showSearch ? "Show" : "Hide"} search field`}
            className="search-toggle"
            img={showSearch ? <HideSearch /> : undefined}
          />
        </div>
      </div>
      <div className="horizontal-group margin-bottom-xsmall">
        <FileUpload
          onChange={setJsonFile}
          iconOnly
          iconProps={{ iconName: "openFile" }}
          className="icon-button margin-end-xsmall"
          tooltip="Upload OPC-UA nodes json"
        />
        <div
          className="margin-start-xsmall font-small ellipsis-left"
          title={jsonFile?.path || "No file selected"}
        >
          {jsonFile?.path || "No file selected"}
        </div>
      </div>
      <div className="viewer-container">
        {showSearch && (
          <SearchBox
            placeholder={"Search"}
            className="margin-bottom-xsmall search"
            onChange={(_, value) => setSearchFilter(value)}
          />
        )}
        <OpcuaViewer
          jsonContent={jsonContent}
          flatten={flattened}
          onSelect={onSelect}
          styles={styles}
          selectedItemKey={selectedItemKey}
          searchFilter={searchFilter}
        />
      </div>
    </div>
  );
}
