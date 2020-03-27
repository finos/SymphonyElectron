import * as robot from 'robotjs';
import { isMac } from '../../src/common/env';
import { Timeouts } from './spectron-setup';

class RobotActions {

    constructor() {
        robot.setKeyboardDelay(Timeouts.oneSec);
        robot.setMouseDelay(Timeouts.oneSec);
    }

    /**
     * Closes window via keyboard action
     */
    public closeWindow(): void {
        const modifier = isMac ? [ 'command' ] : [ 'control' ];
        robot.keyToggle('w', 'down', modifier);
        robot.keyToggle('w', 'up', modifier);
    }

    /**
     * Makes the application fullscreen via keyboard
     */
    public toggleFullscreen(): void {
        robot.keyToggle('f', 'down', [ 'command', 'control' ]);
        robot.keyToggle('f', 'up', [ 'command', 'control' ]);
    }

    /**
     * Zoom in via keyboard Command/Ctrl +
     */
    public zoomIn(): void {
        const modifier = isMac ? [ 'command' ] : [ 'control' ];
        robot.keyToggle('+', 'down', modifier);
        robot.keyToggle('+', 'up', modifier);
    }

    /**
     * Zoom out via keyboard
     */
    public zoomOut(): void {
        const modifier = isMac ? [ 'command' ] : [ 'control' ];
        robot.keyToggle('-', 'down', modifier);
        robot.keyToggle('-', 'up', modifier);
    }

    /**
     * Zoom reset via keyboard
     */
    public zoomReset(): void {
        const modifier = isMac ? [ 'command' ] : [ 'control' ];
        robot.keyToggle('0', 'down', modifier);
        robot.keyToggle('0', 'up', modifier);
    }

    /**
     * Click the App menu
     */
    public clickAppMenu(point?: Electron.Point): void {
        if (isMac) {
            robot.moveMouse(83, 14);
            robot.mouseClick();
        } else {
            if (!point) {
                throw new Error('browser window points are required');
            }
            robot.moveMouse(point.x + 10, point.y + 14);
            robot.mouseClick();
        }
    }
}

const robotActions = new RobotActions();

export {
    robotActions,
};
