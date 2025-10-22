import { IdentityState, IdentityLifecycle } from '../constants';

export const IdentityStateList = [
    { value: IdentityState.SYNCED, text: 'Synchronized' },
    { value: IdentityState.TO_SYNC, text: 'To sync' },
    { value: IdentityState.TO_VALIDATE, text: 'To validate' },
    { value: IdentityState.UNKNOWN, text: 'Unknown' },
    { value: IdentityState.TO_CREATE, text: 'To create' },
    { value: IdentityState.TO_COMPLETE, text: 'To complete' },
    { value: IdentityState.ON_ERROR, text: 'On error' },
];

export const IdentityLifecycleList = [
    { value: IdentityLifecycle.IMPORTED, text: 'Imported' },
    { value: IdentityLifecycle.OFFICIAL, text: 'Official' },
    { value: IdentityLifecycle.ACTIVE, text: 'Active' },
    { value: IdentityLifecycle.PROVISIONAL, text: 'Provisional' },
    { value: IdentityLifecycle.INACTIVE, text: 'Inactive' },
    { value: IdentityLifecycle.DELETED, text: 'Deleted' },
];