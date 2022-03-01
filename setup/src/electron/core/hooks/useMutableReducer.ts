import * as React from 'react';
import { Draft, produce } from 'immer';

/** Describes a state reducer. */
export type MutableReducer<S, A extends any[]> = (state: S, ...args: A) => S | void;

/** Returns the reducer function type without the state argument */
export type ExcludeState<S, R> = R extends MutableReducer<S, infer A> ? ((...args: A) => void) : never;

/** A collection of reducers */
export type MutableReducers<S> = {
    [type: string]: MutableReducer<S, any>;
};

/** A collection of dispatchers, one for each reducer */
export type ImmutableDispatchers<S, R extends MutableReducers<S>> = {
    [T in keyof R]: ExcludeState<S, R[T]>
};

export type MutableReducerResult<S, R extends MutableReducers<S>> = [S, ImmutableDispatchers<S, R>];

/**
 * An alternative to React's `useReducer` with built-in support for immutability
 * and user-journey tracking. Accepts reducers of type `(state, action) => newState | void`,
 * which can either mutate the state or return a brand new state.
 * @param reducers {R} A collection of reducers
 * @param initialState {S} The initial state, or a function that returns an initial state. 
 *        This function has access to the dispatchers in case we need to store callbacks inside the state.
 * @returns [<current state>, <dispatchers>]
 * @example
 * interface State { foo?: string;  }
 * const reducers = {
 *   setFoo: (state: State, foo: string) => { state.foo = foo },
 *   setBar: (state: State, bar: string, baz: string) => { state.foo = bar + baz; },
 *   reset: () => { return {}; },
 * };
 *
 * let [state, dispatch] = useMutableReducer('Foo', reducers, { foo: '' } as State);
 * <form onReset={dispatch.reset}>
 *    <TextInput value={state.foo} onChange={dispatch.setFoo} />
 * </form>
 */
export function useMutableReducer<S, R extends MutableReducers<S>>(reducers: R, initialState: S | ((dispatch?: ImmutableDispatchers<S, R>) => S)) {
    const [state, setState] = React.useState<MutableReducerResult<S, R>>(() => {
        function dispatchAction(type: string, ...args: any[]) {
            const reducer = reducers[type];
            setState(prevState => {
                const [prev, dispatch] = prevState;
                const next = produce(prev, draft => reducer(draft as S, ...args) as Draft<S>) as S;
                return Object.is(prev, next) ? prevState : [next, dispatch];
            });
        }

        const dispatch: ImmutableDispatchers<S, R> = {} as any;
        for (const type in reducers) {
            dispatch[type] = dispatchAction.bind(null, type);
        }

        const state = initialState instanceof Function ? initialState(dispatch) : initialState;
        return [state, dispatch];
    });

    return state;
}

/** Creates a React context to track a MutableReducer state and dispatchers. */
export function createMutableReducerContext<S, R extends MutableReducers<S>>() {
    return React.createContext<MutableReducerResult<S, R>>(undefined);
}
