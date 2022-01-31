import { useMsal } from "@azure/msal-react";
import { mergeStyleSets, PrimaryButton, ProgressIndicator } from "@fluentui/react";
import { useBoolean } from "@fluentui/react-hooks";
import axios from "axios";
import React, { useCallback, useEffect } from "react";
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
    const [loading] = useBoolean(true);
    const { instance, accounts } = useMsal();

    const loadApplications = useCallback(async () => {
        let token;
        // try {
        //     token = (await instance.acquireTokenSilent({ account: accounts[0], scopes: ['https://apps.azureiotcentral.com/user_impersonation'] })).accessToken;
        // } catch (ex) {
        //     token = (await instance.acquireTokenPopup({ account: accounts[0], scopes: ['https://apps.azureiotcentral.com/user_impersonation'] })).accessToken;
        // }
        try {
            token = (await instance.acquireTokenSilent({ account: accounts[0], scopes: ['https://management.azure.com/user_impersonation'] })).accessToken;
        } catch (ex) {
            token = (await instance.acquireTokenPopup({ account: accounts[0], scopes: ['https://management.azure.com/user_impersonation'] })).accessToken;
            console.log(ex);
        }
        const tenants = await axios.get<any>(`https://management.azure.com/tenants?api-version=2020-01-01`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        // await Promise.all(tenants.data.value.map(async (tenant: any) => {
        //     debugger
        //     const token = (await instance.acquireTokenSilent({ account: accounts[0], scopes: ['https://management.azure.com/user_impersonation'] })).accessToken;
        // }));

    }, []);

    useEffect(() => {
        loadApplications();
    }, []);

    if (loading) {
        return (<div className="flex-center">
            <ProgressIndicator label='Loading applications' />
        </div>)
    }
    return (
        <>
            <h1 className='text-center'>Select IoT Central application</h1>
            <div className="flex-center"><PrimaryButton text='Login' onClick={login} /></div>
            <div className='wizard-buttons'>
                <PrimaryButton text='Next' onClick={nextStep} className="flex-align-right" />
            </div>
        </>
    )
}
);

export default Central;