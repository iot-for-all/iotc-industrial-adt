import { mergeStyleSets, Spinner, SpinnerSize, TextField } from "@fluentui/react";
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

const Configure = React.memo<Partial<StepWizardChildProps>>(() => {
    const [loading] = useBoolean(true);
    const { conditions } = useContext(SetupContext);
    if (loading) {
        return (<div className="flex-center">
            <h1 className='text-center'>Configure IoT Central application</h1>
            {!conditions && <><h4>Generating transformation queries...</h4>
                <Spinner size={SpinnerSize.large} /></>}
            {conditions && <TextField multiline={true} value={generateQuery(conditions)} autoAdjustHeight className={classNames.editor} />}
        </div>)
    }
    return (
        <div>
            <h1 className='text-center'>Select IoT Central application</h1>
            <div className='wizard-buttons'>
            </div>
        </div>
    )
});

function generateQuery(conditions: ConditionParam[]) {
    let defaultq = 'import "iotc" as iotc;\n\
    (.telemetry | iotc::find(.name=="name").value) as $name | empty,\n\
    (.telemetry | iotc::find(.name=="nodeid").value) as $twinId | empty,\n\
    (.telemetry | iotc::find(.name=="parent").value) as $parentTwinId | empty,\n\
    (.telemetry | iotc::find(.name=="value").value) as $value | empty,\n';
    const assignments = conditions.reduce<{ [assignmentName in AssignmentKey]: ConditionParam[] }>((obj, condition) => {
        if (!obj[condition.assignment]) {
            obj[condition.assignment] = [];
        }
        obj[condition.assignment].push(condition);
        return obj;
    }, {} as { [assignmentName in AssignmentKey]: ConditionParam[] });

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
            query += `"$${condition.variable}"${getOperator(condition.operator)}("${condition.compare}") then "${condition.value}"\n`
        });
        query += `else empty end) as $${assignment} | empty,\n`;
        defaultq += query;
    });

    // add defaults for unassigned
    if (!assignments['relId']) {
        defaultq += `"contains" as $relId | empty,\n`;
    }

    defaultq += `{\n  applicationId: .applicationId,\n   parentChildRel: $relId,\n   id: $parent | gsub(";";","),\n   model: $model,\n   properties: {\n  ($name):$value\n  }\n}`
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