import * as React from 'react';
import * as ReactDOM from 'react-dom';

import WindowsTitleBar from '../renderer/windows-title-bar';

document.addEventListener('DOMContentLoaded', load);

/**
 * Injects custom title bar to the document body
 */
function load() {
    const element = React.createElement(WindowsTitleBar);
    ReactDOM.render(element, document.body);
}