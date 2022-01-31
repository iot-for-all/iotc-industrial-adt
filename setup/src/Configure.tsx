import { mergeStyleSets, PrimaryButton, Spinner, SpinnerSize, TextField } from "@fluentui/react";
import { useBoolean } from "@fluentui/react-hooks";
import React, { useContext } from "react";
import { StepWizardChildProps } from "react-step-wizard";
import { AssignmentKey, ConditionParam, OperatorKey } from "./common";
import { SetupContext } from "./context";

const classNames = mergeStyleSets({
    editor: {
        width: '60%'
    }
})

const Configure = React.memo<Partial<StepWizardChildProps>>(({ previousStep }) => {
    // const [loading] = useBoolean(false);
    const { conditions } = useContext(SetupContext);
    return (
        <div className="flex-center">
            <h1 className='text-center'>Mapping Query</h1>
            {!conditions && <><h4>Generating transformation queries...</h4>
                <Spinner size={SpinnerSize.large} /></>}
            {conditions && <TextField multiline={true} value={generateQuery(conditions)} autoAdjustHeight className={classNames.editor} contentEditable={false} />}
            <div className='wizard-buttons'>
                <PrimaryButton text='Previous' onClick={previousStep} />
            </div>
        </div>
    )
});

function generateQuery(conditions: ConditionParam[]) {
    let defaultq = 'import "iotc" as iotc;\n\
(.telemetry | iotc::find(.name=="name").value) as $name | $name as $twinId |empty,\n\
(.telemetry | iotc::find(.name=="nodeid").value) as $id | empty,\n\
(.telemetry | iotc::find(.name=="parent").value) as $parent | empty,\n\
(.telemetry | iotc::find(.name=="value").value) as $value | empty,\n';
    const assignments = conditions.reduce<{ [assignmentName in AssignmentKey]: ConditionParam[] }>((obj, condition) => {
        if (!obj[condition.assignment]) {
            obj[condition.assignment] = [];
        }
        obj[condition.assignment].push(condition);
        return obj;
    }, {} as { [assignmentName in AssignmentKey]: ConditionParam[] });

    // add defaults for unassigned
    if (!assignments['relId']) {
        defaultq += `null as $relId | empty,\n`;
    }
    if (!assignments['model']) {
        defaultq += `null as $model | empty,\n`;
    }
    if (!assignments['propertyId']) {
        defaultq += `$name as $propertyId | empty,\n`;
    }
    if (!assignments['propertyValue']) {
        defaultq += `$value as $propertyValue | empty,\n`;
    }

    // for each of the assignment create the condition statements in the form
    // if x then y elif z then w else t end
    (Object.keys(assignments) as AssignmentKey[]).forEach((assignment) => {
        let query = '(';
        assignments[assignment].forEach((condition, index) => {
            if (index === 0) {
                query += `if `
            }
            else {
                query += `elif `;
            }
            query += `$${condition.variable}${getOperator(condition.operator)}"${condition.compare}" then "${condition.value}"\n`
        });
        query += `else $${assignment} end) as $${assignment} | empty,\n`;
        defaultq += query;
    });


    // simplest object
    defaultq += `{\n
applicationId: .applicationId,\n
deviceId: .device.id,\n
} as $out | empty,\n`;

    // set other properties if have values
    // id must be cleaned as dt won't support some chars
    defaultq += `(if $twinId==null then $out+{id:$id|gsub(";";",")} else $out+{id:$twinId|gsub(";";",")} end) as $out | empty,`
    defaultq += `(if $model==null then $out else $out+{model:$model} end) as $out | empty,\n`;
    defaultq += `(if $parent==null then $out else $out+{parent:$parent} end) as $out | empty,\n`;

    defaultq += `$out`;
    return defaultq;
}

function getOperator(operatorKey: OperatorKey) {
    switch (operatorKey) {
        case 'contains':
            return ` | contains `;
        case 'startswith':
            return ` | startswith `;
        case 'endswith':
            return ` | endswith `;
        case 'equals':
            return ' == ';
        case 'notequals':
            return ' != ';
        default:
            return '';
    }
}

export default Configure;