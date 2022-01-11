import { createContext, useCallback, useState } from "react";
import { ConditionParam } from "./common";


type ISetupState = {
    currentStep: number,
    conditions: ConditionParam[] | null
}

type ISetupContext = ISetupState & {
    setCurrentStep: (index: number) => void,
    setConditions: (conditions: ConditionParam[]) => void
};

const SetupContext = createContext<ISetupContext>({} as ISetupContext);
const { Provider } = SetupContext;

const SetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ISetupState>({ currentStep: 1, conditions: null });

    const setCurrentStep = useCallback((currentStep: number) => {
        setState(current => ({ ...current, currentStep }))
    }, [setState]);

    const setConditions = useCallback((conditions: ConditionParam[]) => {
        setState(current => ({ ...current, conditions }))
    }, [setState]);


    const value = {
        ...state,
        setCurrentStep,
        setConditions
    };

    return <Provider value={value}>{children}</Provider>;
};

export { SetupProvider as default, SetupContext };
