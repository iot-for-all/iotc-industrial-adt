import * as React from "react";
import { useId } from "@fluentui/react-hooks";
import {
  getTheme,
  mergeStyleSets,
  FontWeights,
  Modal,
  IIconProps,
  ContextualMenu,
  IDragOptions,
} from "@fluentui/react";
import {
  IconButton,
  IButtonStyles,
  PrimaryButton,
  DefaultButton,
} from "@fluentui/react/lib/Button";
import { MappingGridItem } from "./mappingGrid";
import { downloadFile } from "./core/controls/downloadFile";

export const JqModal = React.memo(function JqModal({
  jq,
  isModalOpen,
  onDismiss,
  onCopyJq,
  copyResult,
  resultClass,
}: {
  jq: MappingGridItem[];
  isModalOpen: boolean;
  onDismiss: () => void;
  onCopyJq: (jq: string) => void;
  copyResult?: string;
  resultClass?: string;
}) {
  // Use useId() to ensure that the IDs are unique on the page.
  // (It's also okay to use plain strings and manually ensure uniqueness.)
  const titleId = useId("title");
  const jqText = generateQuery(jq);

  // Normally the drag options would be in a constant, but here the toggle can modify keepInBounds
  const dragOptions = React.useMemo(
    (): IDragOptions => ({
      moveMenuItemText: "Move",
      closeMenuItemText: "Close",
      menu: ContextualMenu,
      keepInBounds: true,
    }),
    []
  );

  const onDownload = React.useCallback(() => {
    downloadFile(jqText, "text/plan", "opcua2dt-mapping.jq");
  }, [jqText]);

  return (
    <div>
      <Modal
        titleAriaId={titleId}
        isOpen={isModalOpen}
        onDismiss={onDismiss}
        isBlocking={false}
        containerClassName={contentStyles.container}
        dragOptions={dragOptions}
      >
        <div className={contentStyles.header}>
          <span id={titleId}>JQ Transformation</span>
          <IconButton
            styles={iconButtonStyles}
            iconProps={cancelIcon}
            ariaLabel="Close popup modal"
            onClick={onDismiss}
          />
        </div>
        <div className={contentStyles.body}>
          <div className="jq-modal">
            <div>
              <pre>{jqText}</pre>
            </div>
          </div>
          <div className="horizontal-group copy-footer">
            <div className="download-button">
              <PrimaryButton
                text="Download"
                className="margin-start-xsmall"
                onClick={onDownload}
                title="Download Jq transformation"
              />
            </div>
            <div className="copy-button">
              <DefaultButton
                text="Copy"
                className="margin-start-xsmall"
                onClick={() => onCopyJq(jqText)}
                title="Copy Jq transformation"
              />
            </div>
            <div className={`margin-start-xsmall ${resultClass}`}>
              {copyResult}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
});

const cancelIcon: IIconProps = { iconName: "Cancel" };

const theme = getTheme();
const contentStyles = mergeStyleSets({
  container: {
    display: "flex",
    flexFlow: "column nowrap",
    maxHeight: "80%",
    overflowY: "auto",
  },
  header: [
    theme.fonts.xLargePlus,
    {
      flex: "1 1 auto",
      borderTop: `4px solid ${theme.palette.themePrimary}`,
      color: theme.palette.neutralPrimary,
      display: "flex",
      alignItems: "center",
      fontWeight: FontWeights.semibold,
      padding: "12px 12px 14px 24px",
    },
  ],
  body: {
    flex: "4 4 auto",
    padding: "0 24px 24px 24px",
    width: "75%",
    selectors: {
      p: { margin: "14px 0" },
      "p:first-child": { marginTop: 0 },
      "p:last-child": { marginBottom: 0 },
      button: { cursor: "pointer" },
    },
  },
});

const iconButtonStyles: Partial<IButtonStyles> = {
  root: {
    color: theme.palette.neutralPrimary,
    marginLeft: "auto",
    marginTop: "4px",
    marginRight: "2px",
  },
  rootHovered: {
    color: theme.palette.neutralDark,
  },
};

// don't change indentation of the following code.
// the indentation below is intentional for display using <pre> in UI.
export function generateQuery(mappings: MappingGridItem[]) {
  let query = `import "iotc" as iotc;
(.telemetry | iotc::find(.name=="name").value) as $name |empty,
(.telemetry | iotc::find(.name=="nodeid").value) as $id | empty,
(.telemetry | iotc::find(.name=="value").value) as $value | empty,
(`;
  mappings.forEach((mapping, index) => {
    query += `${index === 0 ? "if" : "elif"} $id=="${
      mapping["opcuaNodeId"]
    }" then {twinRawId:"${mapping["dtId"]}/${
      mapping.dtComponent ? mapping.dtComponent + "/" : ""
    }${mapping.dtPropertyName}",modelId:"${mapping["dtModelId"]}"${
      mapping["dtName"] ? `, twinName:"${mapping["dtName"]}"` : ""
    }${
      mapping["dtParentRelationships"] &&
      mapping["dtParentRelationships"].length > 0
        ? `, parentRelationships:${JSON.stringify(
            mapping["dtParentRelationships"]
          )}`
        : ""
    }}`;
  });
  query += ` else { twinRawId:$id} end
) as $twinInfo | empty,
$twinInfo+
{
    value:$value
}
`;
  return query;
}
