import { PresenceStatus } from './presence-status-store';
import { WindowStore } from './window-store';

const winStore = new WindowStore();
const presenceStatusStore = new PresenceStatus();

export { winStore, presenceStatusStore };
