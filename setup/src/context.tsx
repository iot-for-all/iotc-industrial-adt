import { AccountInfo } from "@azure/msal-browser";
import { createContext, useCallback, useState } from "react";
import { ConditionParam } from "./common";


type ISetupState = {
    currentStep: number,
    conditions: ConditionParam[] | null,
    user: AccountInfo | null
}

type ISetupContext = ISetupState & {
    setCurrentStep: (index: number) => void,
    setConditions: (conditions: ConditionParam[]) => void,
    setUser: (user: AccountInfo & { image?: string } | null) => void
};

const SetupContext = createContext<ISetupContext>({} as ISetupContext);
const { Provider } = SetupContext;

const SetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ISetupState>({ currentStep: 1, conditions: null, user: null });

    const setCurrentStep = useCallback((currentStep: number) => {
        setState(current => ({ ...current, currentStep }))
    }, [setState]);

    const setConditions = useCallback((conditions: ConditionParam[]) => {
        setState(current => ({ ...current, conditions }))
    }, [setState]);

    const setUser = useCallback((user: AccountInfo | null) => {
        setState(current => ({ ...current, user }))
    }, [setState]);


    const value = {
        ...state,
        setCurrentStep,
        setConditions,
        setUser
    };

    return <Provider value={value}>{children}</Provider>;
};

export { SetupProvider as default, SetupContext };
