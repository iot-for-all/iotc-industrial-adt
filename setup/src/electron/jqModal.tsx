import * as React from 'react';
import { useId } from '@fluentui/react-hooks';
import {
  getTheme,
  mergeStyleSets,
  FontWeights,
  Modal,
  IIconProps,
} from '@fluentui/react';
import { IconButton, IButtonStyles, PrimaryButton } from '@fluentui/react/lib/Button';
import { MappingGridItem } from './mappingGrid';

export const JqModal = React.memo(function JqModal({ jq, isModalOpen, onDismiss }: { 
    jq: MappingGridItem[], 
    isModalOpen: boolean,
    onDismiss: () => void 
}) {

  // Use useId() to ensure that the IDs are unique on the page.
  // (It's also okay to use plain strings and manually ensure uniqueness.)
  const titleId = useId('title');
  const jqText = generateQuery(jq);
  const [copyResult, setCopyResult] = React.useState<string>();
  const [resultClass, setResultClass] = React.useState<string>();

  const copyAppInfo = React.useCallback(() => {
    navigator.clipboard.writeText(jqText).then(function() {
      /* clipboard successfully set */
      setCopyResult('Copied!');
      setResultClass('success');
    }, function(e) {
      /* clipboard write failed */
      setCopyResult(`Copy failed ${e}`);
      setResultClass('fail');
    });
  }, []);

  return (
    <div>
      <Modal
        titleAriaId={titleId}
        isOpen={isModalOpen}
        onDismiss={onDismiss}
        isBlocking={false}
        containerClassName={contentStyles.container}
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
          <div className='jq-modal'>
            <div>{jqText}</div>
          </div>
          <div className='horizontal-group copy-footer'>
            <div className='copy-button'>
              <PrimaryButton
                  text='Copy Jq'
                  className='margin-start-xsmall'
                  onClick={copyAppInfo}
                  title='Copy Jq transformation' 
              />
            </div>
            <div className={`margin-start-xsmall ${resultClass}`}>{copyResult}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
});

const cancelIcon: IIconProps = { iconName: 'Cancel' };

const theme = getTheme();
const contentStyles = mergeStyleSets({
  container: {
    display: 'flex',
    flexFlow: 'column nowrap'
  },
  header: [
    theme.fonts.xLargePlus,
    {
      flex: '1 1 auto',
      borderTop: `4px solid ${theme.palette.themePrimary}`,
      color: theme.palette.neutralPrimary,
      display: 'flex',
      alignItems: 'center',
      fontWeight: FontWeights.semibold,
      padding: '12px 12px 14px 24px',
    },
  ],
  body: {
    flex: '4 4 auto',
    padding: '0 24px 24px 24px',
    width: '75%',
    selectors: {
      p: { margin: '14px 0' },
      'p:first-child': { marginTop: 0 },
      'p:last-child': { marginBottom: 0 },
    },
  },
});

const iconButtonStyles: Partial<IButtonStyles> = {
  root: {
    color: theme.palette.neutralPrimary,
    marginLeft: 'auto',
    marginTop: '4px',
    marginRight: '2px',
  },
  rootHovered: {
    color: theme.palette.neutralDark,
  },
};

export function generateQuery(mappings: MappingGridItem[]) {
  let query = `import "iotc" as iotc;
(.telemetry | iotc::find(.name=="name").value) as $name |empty,
(.telemetry | iotc::find(.name=="nodeid").value) as $id | empty,
(.telemetry | iotc::find(.name=="value").value) as $value | empty,
(`;
  mappings.forEach((mapping, index) => {
    query += `${index === 0 ? "if" : "elif"} $id=="${mapping["opcuaNodeId"]}" then "${mapping["dtId"]}/${mapping.dtComponent ? mapping.dtComponent + '/' : ''}${mapping.dtPropertyName}" `;
  });
  query += `else $id end) as $id | empty,
  {
      twinRawId:$id,
      value:$value
  }
  `;
  return query;
}