import { mergeStyleSets, PrimaryButton } from "@fluentui/react";
import React from "react";
import { StepWizardChildProps } from "react-step-wizard";
import { login } from "./auth";

const classNames = mergeStyleSets({
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    listGrid: {
        width: "90%",
        height: 600,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        overflowY: "auto",
    },
    listGridItem: {
        padding: 5,
        width: 200,
        height: 180,
        alignItems: "center",
        textAlign: "center",
        display: "inline-flex",
        justifyContent: "center",
        border: "1px solid black",
    },
    selected: {
        backgroundColor: "#f3f2f1",
    },
    clickable: {
        "&:hover": {
            backgroundColor: "#FFFFFF",
            cursor: "pointer",
        },
    },
    button: {
        display: "flex",
        flexDirection: "column",
    },
    description: {
        margin: "5%",
    },
});

const Central = React.memo<Partial<StepWizardChildProps>>(({ nextStep }) => {
    return (
        <div>
            <h1 className='text-center'>Select IoT Central application</h1>
            <PrimaryButton text='Login' onClick={login} />
            <div className='wizard-buttons'>
                <PrimaryButton text='Next' onClick={nextStep} />
            </div>
        </div>
    )
}
);

export default Central;