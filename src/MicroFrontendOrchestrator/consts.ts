import { LIFECYCLE } from '../consts';

export const LIFECYCLE_HOOKS = {
  onError: LIFECYCLE.ERROR,
  onInitialized: LIFECYCLE.INITIALIZE,
  onReady: LIFECYCLE.READY,
  onTerminate: LIFECYCLE.TERMINATE
};
