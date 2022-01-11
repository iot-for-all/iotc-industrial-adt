import { Dropdown, Icon, List, mergeStyleSets, PrimaryButton, Stack, TextField } from '@fluentui/react';
import React, { useCallback, useContext } from 'react';
import { StepWizardChildProps } from 'react-step-wizard';
import { AssignmentKey, assignments, ConditionParam, OperatorKey, operators, strings, useArrayState, VariableKey, variables } from './common';
import { SetupContext } from './context';



const classNames = mergeStyleSets({
    dropDown: {
        width: 150
    },
    stack: {
        marginBottom: 30
    }
});

const Conditions = React.memo<Partial<StepWizardChildProps>>(({ nextStep, previousStep }) => {
    const { state: conditions, add, remove, update } = useArrayState<ConditionParam>([]);
    const { setConditions } = useContext(SetupContext);
    const onRenderCell = useCallback((item, index) =>
    (
        <Stack key={`stack-${index}`} horizontal tokens={{ childrenGap: 20 }} verticalAlign='end' className={classNames.stack}>
            <Dropdown label={index === 0 ? 'Items' : undefined} placeholder='Select item' options={variables as any} onChange={(e, item) => update(index, { variable: item?.key as VariableKey })} className={`${index === 0 ? 'height-60' : 'height-30'} ${classNames.dropDown}`} />
            <Dropdown label={index === 0 ? 'Condition' : undefined} placeholder='Select condition' options={operators as any} onChange={(e, item) => update(index, { operator: item?.key as OperatorKey })} className={`${index === 0 ? 'height-60' : 'height-30'} ${classNames.dropDown}`} />
            <TextField onChange={(e, text) => update(index, { compare: text })} />
            <Icon iconName='FastForward' className='icon-30' />
            <Dropdown label={index === 0 ? 'Assignment' : undefined} placeholder='Select assignment' options={assignments as any} onChange={(e, item) => update(index, { assignment: item?.key as AssignmentKey })} className={`${index === 0 ? 'height-60' : 'height-30'} ${classNames.dropDown}`} />
            <TextField label={index === 0 ? 'Value' : undefined} onChange={(e, text) => update(index, { value: text })} />
            <Icon iconName='Cancel' onClick={() => remove(index)} className='icon-30 link' />
        </Stack>), [remove, update]);

    return (
        <div>
            <h1 className='text-center'>Transform data</h1>
            <div className='padding-vertical'>{strings.transformData}</div>
            <List onRenderCell={onRenderCell} items={conditions} style={{ marginBottom: 30, textAlign: 'start' }} />
            <div className='vertical-center-text link'><Icon iconName='Add' onClick={add} /> Add condition</div>
            <div className='flex-center'>
                <div className='wizard-buttons'>
                    <PrimaryButton text='Previous' onClick={previousStep} />
                    <PrimaryButton text='Next' onClick={() => {
                        nextStep?.();
                        setConditions(conditions);
                    }} />
                </div>
            </div>
        </div>
    )
});

export default Conditions;