import { PresenceStatus } from './presence-status-store';
import { SDAMenuStore } from './sda-menu-store';
import { WindowStore } from './window-store';

const winStore = new WindowStore();
const presenceStatusStore = new PresenceStatus();
const sdaMenuStore = new SDAMenuStore();

export { winStore, presenceStatusStore, sdaMenuStore };
