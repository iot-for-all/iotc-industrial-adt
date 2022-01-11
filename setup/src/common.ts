import { useCallback, useState } from "react";

export const strings = {
    transformData: 'Add conditions to assign the desired values for "Model Id" and "Parent-Child relation Id".'
}

export const variables = [
    { key: 'name', text: 'Name' },
    { key: 'parent', text: 'Parent' },
    { key: 'id', text: 'Id' },
    { key: 'value', text: 'Value' },
] as const;


export const operators = [
    { key: 'equals', text: 'Equals' },
    { key: 'notequals', text: 'Not Equals' },
    { key: 'contains', text: 'Contains' },
    { key: 'startswith', text: 'Starts with' },
    { key: 'endswith', text: 'Ends with' },
    { key: 'match', text: 'Match Regex' }
] as const;

export const assignments = [
    { key: 'model', text: 'Model Id' },
    { key: 'twinId', text: 'Twin Id' },
    { key: 'parentTwinId', text: 'Parent Twin Id' },
    { key: 'relId', text: 'Parent-Child Id' }
] as const;

export type VariableKey = typeof variables[number]['key'];
export type OperatorKey = typeof operators[number]['key'];
export type AssignmentKey = typeof assignments[number]['key'];


export type ConditionParam = {
    variable: VariableKey,
    operator: OperatorKey,
    compare: string,
    value: string,
    assignment: AssignmentKey
}

export function useArrayState<T>(initial?: Array<T>): { state: Array<T>, add: () => void, remove: (index: number) => void, update: (index: number, data: Partial<T>) => void } {
    const [state, setState] = useState(initial || []);

    const add = useCallback(() => {
        setState(current => [...current, {} as T]);
    }, [setState]);

    const remove = useCallback((index: number) => {
        setState(current => [...current.slice(0, index), ...current.slice(index + 1)]);
    }, [setState]);

    const update = useCallback((index: number, data: Partial<T>) => {
        setState(current => (current.map((obj, ix) => {
            if (ix === index) {
                return {
                    ...obj,
                    ...data
                }
            }
            return obj;
        })));
    }, [setState]);


    return { state, add, remove, update };
}