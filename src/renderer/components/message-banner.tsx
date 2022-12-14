import { i18n } from '../../common/i18n-preload';

export type bannerTypes = 'error' | 'warning';
const BANNER_NAME_SPACE = 'Banner';

// Network status check variables
const onlineStateInterval = 5 * 1000;
let onlineStateIntervalId;

export default class MessageBanner {
  private readonly body: HTMLCollectionOf<Element> | undefined;
  private banner: HTMLElement | null = null;
  private closeButton: HTMLElement | null = null;
  private retryButton: HTMLElement | null = null;
  private domParser: DOMParser | undefined;
  private url: string | undefined;

  constructor() {
    this.body = document.getElementsByTagName('body');

    window.addEventListener(
      'beforeunload',
      () => {
        if (onlineStateIntervalId) {
          clearInterval(onlineStateIntervalId);
          onlineStateIntervalId = null;
        }
      },
      false,
    );
  }

  /**
   * initializes red banner
   */
  public initBanner(): void {
    this.domParser = new DOMParser();
    const banner = this.domParser.parseFromString(this.render(), 'text/html');

    this.closeButton = banner.getElementById('banner-close');
    if (this.closeButton) {
      this.closeButton.addEventListener('click', this.removeBanner);
    }

    this.retryButton = banner.getElementById('banner-retry');
    if (this.retryButton) {
      this.retryButton.addEventListener('click', this.reload);
    }

    this.banner = banner.getElementById('sda-banner');
  }

  /**
   * Injects SDA banner into DOM
   *
   * @param show {boolean}
   * @param type {bannerTypes}
   * @param url {string} - POD URL from global config file
   */
  public showBanner(show: boolean, type: bannerTypes, url?: string): void {
    this.url = url;
    if (this.body && this.body.length > 0 && this.banner) {
      this.body[0].appendChild(this.banner);
      if (show) {
        this.banner.classList.add('sda-banner-show');
        this.monitorOnlineState();
      }

      switch (type) {
        case 'error':
          this.banner.classList.add('sda-banner-error');
          break;
        case 'warning':
          this.banner.classList.add('sda-banner-warning');
        default:
          break;
      }
    }
  }

  /**
   * removes the message banner
   */
  public removeBanner(): void {
    const banner = document.getElementById('sda-banner');
    if (banner) {
      banner.classList.remove('sda-banner-show');
    }

    if (onlineStateIntervalId) {
      clearInterval(onlineStateIntervalId);
      onlineStateIntervalId = null;
    }
  }

  /**
   * Monitors network online status and updates the banner
   */
  public monitorOnlineState(): void {
    if (onlineStateIntervalId) {
      return;
    }
    // nosemgrep
    onlineStateIntervalId = setInterval(async () => {
      try {
        const response = await window.fetch(this.url || window.location.href, {
          cache: 'no-cache',
          keepalive: false,
        });
        if (
          window.navigator.onLine &&
          (response.status === 200 || response.ok)
        ) {
          if (this.banner) {
            this.banner.classList.remove('sda-banner-show');
          }
          if (onlineStateIntervalId) {
            clearInterval(onlineStateIntervalId);
            onlineStateIntervalId = null;
          }
          this.reload();
        }
        // tslint:disable-next-line:no-empty
      } catch (e) {}
    }, onlineStateInterval);
  }

  /**
   * reloads the web page
   */
  public reload(): void {
    if (document.location) {
      document.location.reload();
    }
  }

  /**
   * Renders a message banner
   */
  public render(): string {
    return `
            <div id='sda-banner' class='sda-banner'>
                <span class='sda-banner-icon'></span>
                <span class='sda-banner-message'>
                    ${i18n.t(
                      'Connection lost. This message will disappear once the connection is restored.',
                      BANNER_NAME_SPACE,
                    )()}
                </span>
                <span id='banner-retry' class='sda-banner-retry-button' title='${i18n.t(
                  'Retry Now',
                  BANNER_NAME_SPACE,
                )()}'>
                    ${i18n.t('Retry Now', BANNER_NAME_SPACE)()}
                </span>
                <span id='banner-close' class='sda-banner-close-icon' title='${i18n.t(
                  'Close',
                )()}'></span>
            </div>
        `;
  }
}
