import * as React from 'react';

/**
 * Window that display app version and copyright info
 */
export default class MoreInfo extends React.Component<{}, {}> {

    constructor(props) {
        super(props);
    }
    /**
     * main render function
     */
    public render(): JSX.Element {
        return (
            <div className='MoreInfo'>
                <span><b>Version Information</b></span>
                <span className='MoreInfo-electron'>{process.versions.electron}</span>
                <span className='MoreInfo-chrome'>{process.versions.chrome}</span>
                <span className='MoreInfo-v8'>{process.versions.v8}</span>
                <span className='MoreInfo-node'>{process.versions.node}</span>
                <span className='MoreInfo-openssl'>{process.versions.openssl}</span>
                <span className='MoreInfo-zlib'>{process.versions.zlib}</span>
                <span className='MoreInfo-uv'>{process.versions.uv}</span>
                <span className='MoreInfo-ares'>{process.versions.ares}</span>
                <span className='MoreInfo-http_parser'>{process.versions.http_parser}</span>
            </div>
        );
    }
}