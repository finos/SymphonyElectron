import { MenuStore } from './menu-store';
import { PresenceStatus } from './presence-status-store';
import { WindowStore } from './window-store';

const winStore = new WindowStore();
const presenceStatusStore = new PresenceStatus();
const menuStore = new MenuStore();

export { winStore, presenceStatusStore, menuStore };
