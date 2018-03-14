const titleBar = (`
<div id="title-bar">
    <div class="title-bar-button-container">
        <button title="Menu" id='hamburger-menu-button'>
            <svg x='0px' y='0px' viewBox='0 0 15 10'>
                    <rect fill="rgba(255, 255, 255, 0.9)" width='15' height='1'/>
                    <rect fill="rgba(255, 255, 255, 0.9)" y='4' width='15' height='1'/>
                    <rect fill="rgba(255, 255, 255, 0.9)" y='8' width='152' height='1'/>
              </svg>
        </button>
    </div>
    <div id="title-container">
        <?xml version="1.0" encoding="utf-8"?>
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100px" height="32px" x="0px" y="0px"
                 viewBox="0 0 121 24" enable-background="new 0 0 121 24" xml:space="preserve">
            <g>
                <path fill="#FFFFFF" d="M36.7,10c-0.6-0.5-1.8-1.1-3.4-1.1c-1.1,0-2,0.4-2,1.3c0,1,1.3,1,2.7,1.1c1.7,0.1,4.5,0.3,4.5,3
                    c0,2.4-2,3.3-4.3,3.3c-2.5,0-4.2-1-5.3-2l1.1-1.3c0.8,0.7,2.2,1.7,4.2,1.7c1.3,0,2.4-0.5,2.4-1.5c0-1.1-1-1.3-2.6-1.4
                    c-2.1-0.2-4.6-0.3-4.6-2.7c0-2.3,2.1-3,3.9-3c2,0,3.7,0.8,4.5,1.3L36.7,10z"/>
                <path fill="#FFFFFF" d="M59.4,17.2v-6.1h-0.1l-2.9,4.9h-0.4L53,11.2h-0.1v6.1h-1.8V7.6h1.9l3.3,5.5h0l3.2-5.5h1.8v9.6H59.4z"/>
                <path fill="#FFFFFF" d="M75.6,17.2V7.6h1.9v3.8h4.9V7.6h1.9v9.6h-1.9v-4.2h-4.9v4.2H75.6z"/>
                <path fill="#FFFFFF" d="M91.9,15.9c1.9,0,3.3-1.6,3.3-3.5c0-1.9-1.5-3.4-3.3-3.4c-1.8,0-3.3,1.5-3.3,3.4
                    C88.7,14.3,90.1,15.9,91.9,15.9z M91.9,7.3c2.9,0,5.3,2.3,5.3,5.1c0,2.9-2.3,5.1-5.3,5.1c-2.9,0-5.2-2.3-5.2-5.1
                    C86.7,9.6,89,7.3,91.9,7.3z"/>
                <path fill="#FFFFFF" d="M108.3,7.6v9.6h-1.6l-5.2-6.3h0v6.3h-1.9V7.6h1.6l5.2,6.3h0V7.6H108.3z"/>
                <polygon fill="#FFFFFF" points="120.1,7.6 117.9,7.6 115.2,12.2 115.1,12.2 112.4,7.6 110.1,7.6 114.2,14 114.2,17.2 116,17.2 
                    116,14 	"/>
                <polygon fill="#FFFFFF" points="49.3,7.6 47.1,7.6 44.4,12.2 44.3,12.2 41.6,7.6 39.3,7.6 43.4,14 43.4,17.2 45.2,17.2 45.2,14 	
                    "/>
                <path fill="#FFFFFF" d="M66.2,14.1l3.1,0c1.4,0,2.3-0.4,2.9-1c0.6-0.6,1-1.4,1-2.3c0-0.8-0.3-1.5-0.8-2.1c-0.7-0.7-1.6-1.1-3.1-1.1
                    h-5v9.6h1.9V14.1z M66.2,9.2h3.1c0.5,0,1.1,0.1,1.5,0.5c0.3,0.3,0.4,0.7,0.4,1.1c0,0.4-0.2,0.8-0.5,1.1c-0.5,0.4-1,0.5-1.5,0.5
                    l-3.1,0V9.2z"/>
            </g>
            <g>
                <g>
                    <path fill="#F48DA1" d="M4,12.2c-0.1,0.5-0.1,0.9-0.1,1.4c0,1.5,0.4,2.9,1,4.1l8.1-4.1L4,12.2z"/>
                </g>
                <g>
                    <path fill="#33B9E6" d="M9.7,18.2c0.9,0.7,2.1,1.1,3.3,1.1c0.3,0,0.6,0,0.9-0.1L13,13.6L9.7,18.2z"/>
                </g>
                <g>
                    <path fill="#90D095" d="M18.2,1.1c-1.6-0.7-3.4-1-5.2-1c-0.7,0-1.4,0.1-2.1,0.2L13,13.6L18.2,1.1z"/>
                </g>
                <g>
                    <path fill="#FED05F" d="M13,13.6h11.3c0-2.5-0.8-4.8-2.2-6.7L13,13.6z"/>
                </g>
                <g>
                    <path fill="#727376" d="M2.9,7.4c-1.1,1.8-1.8,3.9-1.8,6.2H13L2.9,7.4z"/>
                </g>
                <g>
                    <path fill="#A1A2A3" d="M13,5.7c-1.7,0-3.4,0.6-4.7,1.5l4.7,6.4V5.7z"/>
                </g>
                <g>
                    <path fill="#8A8B8C" d="M13,23.8c2.2,0,4.3-0.7,6-1.9l-6-8.2V23.8z"/>
                </g>
                <g>
                    <path fill="#636466" d="M20.8,12.4L13,13.6l7.3,3c0.4-0.9,0.6-2,0.6-3C20.9,13.2,20.9,12.8,20.8,12.4z"/>
                </g>
            </g>
            </svg>
    </div>
</div>
`);

const button = (`
<div class="action-items">
<div class="title-bar-button-container">
<button class="title-bar-button" id="title-bar-minimize-button" title='Minimize'>
  <svg x='0px' y='0px' viewBox='0 0 14 1'>
    <rect fill="rgba(255, 255, 255, 0.9)" width='14' height='0.6' />
  </svg>
</button>
</div>
<div class="title-bar-button-container">
<button class="title-bar-button" id="title-bar-maximize-button" title='Maximize'>
    <svg x='0px' y='0px' viewBox='0 0 14 10.2'>
        <path
            fill='rgba(255, 255, 255, 0.9)'
            d='M0,0v10.1h10.2V0H0z M9.2,9.2H1.1V1h8.1V9.2z'
        />
    </svg>
</button>
</div>
<div class="title-bar-button-container">
<button class="title-bar-button" id="title-bar-close-button" title='Close'>
  <svg x='0px' y='0px' viewBox='0 0 14 10.2'>
    <polygon
      fill="rgba(255, 255, 255, 0.9)"
      points='10.2,0.7 9.5,0 5.1,4.4 0.7,0 0,0.7 4.4,5.1 0,9.5 0.7,10.2 5.1,5.8 9.5,10.2 10.2,9.5 5.8,5.1 '
    />
  </svg>
</button>
</div>
</div>
`);

const unMaximizeButton = (`
<svg x='0px' y='0px' viewBox='0 0 14 10.2'>
   <path
      fill='rgba(255, 255, 255, 0.9)'
      d='M2.1,0v2H0v8.1h8.2v-2h2V0H2.1z M7.2,9.2H1.1V3h6.1V9.2z M9.2,7.1h-1V2H3.1V1h6.1V7.1z'
      />
</svg>
`);

const maximizeButton = (`
<svg x='0px' y='0px' viewBox='0 0 14 10.2'>
   <path
      fill='rgba(255, 255, 255, 0.9)'
      d='M0,0v10.1h10.2V0H0z M9.2,9.2H1.1V1h8.1V9.2z'
      />
</svg>
`);


module.exports = {
    titleBar: titleBar,
    button: button,
    unMaximizeButton: unMaximizeButton,
    maximizeButton: maximizeButton
};