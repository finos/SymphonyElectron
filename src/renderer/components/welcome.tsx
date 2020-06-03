import { ipcRenderer } from 'electron';
import * as React from 'react';
import { i18n } from '../../common/i18n-preload';

interface IState {
    url: string;
    message: string;
    urlValid: boolean;
    sso: boolean;
}

const WELCOME_NAMESPACE = 'Welcome';

export default class Welcome extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onSetPodUrl: () => this.setPodUrl(),
    };

    constructor(props) {
        super(props);
        this.state = {
            url: 'https://[POD].symphony.com',
            message: '',
            urlValid: false,
            sso: false,
        };
        this.updateState = this.updateState.bind(this);
    }

    /**
     * Render the component
     */
    public render(): JSX.Element {
        const { url, message, urlValid, sso } = this.state;
        return (
            <div className='Welcome' lang={i18n.getLocale()}>
                <div className='Welcome-image-container'>
                    <img
                        src='../renderer/assets/symphony-logo-plain.png'
                        alt={i18n.t('Symphony Logo', WELCOME_NAMESPACE)()}
                    />
                </div>
                <div className='Welcome-main-container'>
                    <h3 className='Welcome-name'>{i18n.t('Pod URL', WELCOME_NAMESPACE)()}</h3>
                    <div className='Welcome-main-container-input-div'>
                        <div className='Welcome-main-container-input-selection'>
                            <input className='Welcome-main-container-podurl-box'
                                   type='url' value={url}
                                   onChange={this.updatePodUrl.bind(this)}>
                            </input>
                        </div>
                        <div className='Welcome-main-container-sso-box'
                             title={i18n.t('Enable Single Sign On', WELCOME_NAMESPACE)()}>
                            <label>
                                <input type='checkbox' checked={sso} onChange={this.updateSsoCheckbox.bind(this)}/>
                                {i18n.t('SSO', WELCOME_NAMESPACE)()}
                            </label>
                        </div>
                    </div>
                    <label className='Welcome-message-label'>{message}</label>
                    <button className={!urlValid ? 'Welcome-continue-button-disabled' : 'Welcome-continue-button'}
                            disabled={!urlValid}
                            onClick={this.eventHandlers.onSetPodUrl}>
                        {i18n.t('Continue', WELCOME_NAMESPACE)()}
                    </button>
                </div>
            </div>
        );
    }

    /**
     * Perform actions on component being mounted
     */
    public componentDidMount(): void {
        ipcRenderer.on('welcome', this.updateState);
    }

    /**
     * Perform actions on component being unmounted
     */
    public componentWillUnmount(): void {
        ipcRenderer.removeListener('welcome', this.updateState);
    }

    /**
     * Set pod url and pass it to the main process
     */
    public setPodUrl(): void {
        const { url, sso } = this.state;
        let ssoPath = '/login/sso/initsso';
        if (url.endsWith('/')) {
            ssoPath = 'login/sso/initsso';
        }
        ipcRenderer.send('set-pod-url', sso ? `${url}${ssoPath}` : url);
    }

    /**
     * Update pod url from the text box
     * @param _event
     */
    public updatePodUrl(_event): void {
        const url = _event.target.value.trim();
        const match = url.match(/(https?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/g) != null;
        if (url === 'https://[POD].symphony.com' || !match) {
            this.updateState(_event, {
                url,
                message: i18n.t('Please enter a valid url', WELCOME_NAMESPACE)(),
                urlValid: false,
                sso: this.state.sso,
            });
            return;
        }
        this.updateState(_event, { url, message: '', urlValid: true, sso: this.state.sso });
    }

    /**
     * Update the SSO checkbox
     * @param _event Event occurred upon action
     * on the checkbox
     */
    public updateSsoCheckbox(_event): void {
        const ssoCheckBox = _event.target.checked;
        this.updateState(_event, {
            url: this.state.url,
            message: this.state.message,
            urlValid: this.state.urlValid,
            sso: ssoCheckBox,
        });
    }

    /**
     * Update state
     * @param _event
     * @param data
     */
    private updateState(_event, data): void {
        this.setState(data as IState);
    }

}
