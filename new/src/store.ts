import { combineReducers, createStore } from 'redux';

export interface AppState {}

const reducers = combineReducers({
    empty: () => ({})
});

const devTools = (window as any).devToolsExtension ? (window as any).devToolsExtension() : f => f;

const store = createStore(reducers, devTools);

export default store;
