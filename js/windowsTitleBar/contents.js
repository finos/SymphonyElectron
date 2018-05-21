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
        <?xml version="1.0" encoding="UTF-8"?>
        <svg width="100px" height="32px" viewBox="0 0 120 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <title>Symphony_logo</title>
            <defs>
                <linearGradient x1="72.8054587%" y1="20.0451624%" x2="15.4902814%" y2="45.5271843%" id="linearGradient-1">
                    <stop stop-color="#197A68" offset="0%"></stop>
                    <stop stop-color="#329D87" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="0%" y1="49.9999462%" x2="100%" y2="49.9999462%" id="linearGradient-2">
                    <stop stop-color="#1D7E7B" offset="0%"></stop>
                    <stop stop-color="#35B0B7" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="26.4092062%" y1="82.7312532%" x2="48.5078994%" y2="9.46528209%" id="linearGradient-3">
                    <stop stop-color="#175952" offset="0%"></stop>
                    <stop stop-color="#3A8F88" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="29.6396432%" y1="86.849168%" x2="75.7050882%" y2="58.9371981%" id="linearGradient-4">
                    <stop stop-color="#39A8BA" offset="0%"></stop>
                    <stop stop-color="#3992B4" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="71.6243272%" y1="78.079356%" x2="20.750027%" y2="55.8481886%" id="linearGradient-5">
                    <stop stop-color="#021C3C" offset="0%"></stop>
                    <stop stop-color="#215180" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="0%" y1="49.9955545%" x2="100%" y2="49.9955545%" id="linearGradient-6">
                    <stop stop-color="#23796C" offset="0%"></stop>
                    <stop stop-color="#41BEAF" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="6.58475486%" y1="32.6158208%" x2="42.3714661%" y2="80.2915692%" id="linearGradient-7">
                    <stop stop-color="#14466A" offset="0%"></stop>
                    <stop stop-color="#286395" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="28.7298091%" y1="40.5717151%" x2="84.0259024%" y2="48.3784687%" id="linearGradient-8">
                    <stop stop-color="#261D49" offset="0%"></stop>
                    <stop stop-color="#483A6D" offset="100%"></stop>
                </linearGradient>
            </defs>
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="Symphony_logo" fill-rule="nonzero">
                    <g id="Group" transform="translate(27.000000, 7.000000)" fill="#FFFFFF">
                        <path d="M8.7,3 C8.1,2.5 6.9,1.9 5.3,1.9 C4.2,1.9 3.3,2.3 3.3,3.2 C3.3,4.2 4.6,4.2 6,4.3 C7.7,4.4 10.5,4.6 10.5,7.3 C10.5,9.7 8.5,10.6 6.2,10.6 C3.7,10.6 2,9.6 0.9,8.6 L2,7.3 C2.8,8 4.2,9 6.2,9 C7.5,9 8.6,8.5 8.6,7.5 C8.6,6.4 7.6,6.2 6,6.1 C3.9,5.9 1.4,5.8 1.4,3.4 C1.4,1.1 3.5,0.4 5.3,0.4 C7.3,0.4 9,1.2 9.8,1.7 L8.7,3 Z" id="Shape"></path>
                        <polygon id="Shape" points="31.4 10.2 31.4 4.1 31.3 4.1 28.4 9 28 9 25 4.2 24.9 4.2 24.9 10.3 23.1 10.3 23.1 0.6 25 0.6 28.3 6.1 28.3 6.1 31.5 0.6 33.3 0.6 33.3 10.2"></polygon>
                        <polygon id="Shape" points="47.6 10.2 47.6 0.6 49.5 0.6 49.5 4.4 54.4 4.4 54.4 0.6 56.3 0.6 56.3 10.2 54.4 10.2 54.4 6 49.5 6 49.5 10.2"></polygon>
                        <path d="M63.9,8.9 C65.8,8.9 67.2,7.3 67.2,5.4 C67.2,3.5 65.7,2 63.9,2 C62.1,2 60.6,3.5 60.6,5.4 C60.7,7.3 62.1,8.9 63.9,8.9 Z M63.9,0.3 C66.8,0.3 69.2,2.6 69.2,5.4 C69.2,8.3 66.9,10.5 63.9,10.5 C61,10.5 58.7,8.2 58.7,5.4 C58.7,2.6 61,0.3 63.9,0.3 Z" id="Shape"></path>
                        <polygon id="Shape" points="80.3 0.6 80.3 10.2 78.7 10.2 73.5 3.9 73.5 3.9 73.5 10.2 71.6 10.2 71.6 0.6 73.2 0.6 78.4 6.9 78.4 6.9 78.4 0.6"></polygon>
                        <polygon id="Shape" points="92.1 0.6 89.9 0.6 87.2 5.2 87.1 5.2 84.4 0.6 82.1 0.6 86.2 7 86.2 10.2 88 10.2 88 7"></polygon>
                        <polygon id="Shape" points="21.3 0.6 19.1 0.6 16.4 5.2 16.3 5.2 13.6 0.6 11.3 0.6 15.4 7 15.4 10.2 17.2 10.2 17.2 7"></polygon>
                        <path d="M38.2,7.1 L41.3,7.1 C42.7,7.1 43.6,6.7 44.2,6.1 C44.8,5.5 45.2,4.7 45.2,3.8 C45.2,3 44.9,2.3 44.4,1.7 C43.7,1 42.8,0.6 41.3,0.6 L36.3,0.6 L36.3,10.2 L38.2,10.2 L38.2,7.1 Z M38.2,2.2 L41.3,2.2 C41.8,2.2 42.4,2.3 42.8,2.7 C43.1,3 43.2,3.4 43.2,3.8 C43.2,4.2 43,4.6 42.7,4.9 C42.2,5.3 41.7,5.4 41.2,5.4 L38.1,5.4 L38.1,2.2 L38.2,2.2 Z" id="Shape"></path>
                    </g>
                    <g id="logo2">
                        <path d="M2.8585265,13.7071419 C2.85630496,15.1495531 3.19699055,16.5718335 3.85249917,17.8566932 L11.9973636,13.7071419 L2.8585265,13.7071419 Z" id="Shape" fill="url(#linearGradient-1)"></path>
                        <path d="M8.63923275,18.3280906 C9.61438114,19.0384932 10.7901678,19.4204097 11.9966428,19.4186435 L11.9966428,13.7071419 L8.63923275,18.3280906 Z" id="Shape" fill="url(#linearGradient-2)"></path>
                        <path d="M17.2396228,1.04297388 C15.5766877,0.35369093 13.7938873,-2.76553156e-05 11.9937597,0.00216235083 C11.2754862,0.00215229435 10.558302,0.0580618177 9.84870765,0.169384149 L11.9937597,13.7093043 L17.2396228,1.04297388 Z" id="Shape" fill="url(#linearGradient-3)"></path>
                        <path d="M11.9966428,13.7071419 L23.4189285,13.7071419 C23.4226965,11.2942632 22.6585571,8.94277657 21.2370999,6.99304259 L11.9966428,13.7071419 Z" id="Shape" fill="url(#linearGradient-4)"></path>
                        <path d="M1.76871415,7.43992843 C0.610698934,9.32503749 -0.000916945813,11.4947622 0.00206101979,13.7071419 L11.9966428,13.7071419 L1.76871415,7.43992843 Z" id="Shape" fill="url(#linearGradient-5)"></path>
                        <path d="M11.9966428,5.71146961 C10.3076163,5.70881714 8.66152029,6.24346454 7.29641289,7.23810107 L11.9966428,13.7071419 L11.9966428,5.71146961 Z" id="Shape" fill="url(#linearGradient-6)"></path>
                        <path d="M11.9966428,23.9877027 C14.1680786,23.9910306 16.2842613,23.3033903 18.0389718,22.0242737 L11.9966428,13.7071419 L11.9966428,23.9877027 Z" id="Shape" fill="url(#linearGradient-7)"></path>
                        <path d="M19.8949896,12.4558616 L11.9966428,13.7071419 L19.3846748,16.7675891 C19.7870484,15.7974896 19.993552,14.7573781 19.9922954,13.7071419 C19.9921318,13.288165 19.9595998,12.8698268 19.8949896,12.4558616 Z" id="Shape" fill="url(#linearGradient-8)"></path>
                    </g>
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