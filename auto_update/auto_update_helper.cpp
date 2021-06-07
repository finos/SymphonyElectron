#define _CRT_SECURE_NO_WARNINGS
#include <windows.h>
#include <aclapi.h>
#pragma comment(lib, "advapi32.lib")
#pragma comment( lib, "shell32.lib" )

#include <stdio.h>
#include <stdlib.h>
#include "ipc.h"

#define PIPE_NAME "symphony_sda_auto_update_ipc"

int main( int argc, char** argv ) {
    if( argc < 3 ) {
        printf( "Not enough arguments" );
        return EXIT_FAILURE;
    }
    char const* installer_filename = argv[ 1 ];
    char const* application_filename = argv[ 2 ];
    ipc_client_t* client = ipc_client_connect( PIPE_NAME );
    ipc_client_send( client, installer_filename );
    char response[ 256 ];
    int size = 0;
    int temp_size = 0;
    ipc_receive_status_t status = IPC_RECEIVE_STATUS_MORE_DATA;
    while( size < sizeof( response ) - 1 && status == IPC_RECEIVE_STATUS_MORE_DATA ) {
        status = ipc_client_receive( client, response + size, 
            sizeof( response ) - size - 1, &temp_size );
        size += temp_size;
    }
    response[ size ] = '\0';
    printf( "%s\n", response );
    ipc_client_connect( PIPE_NAME );

    int result = (int)(uintptr_t) ShellExecute( NULL, NULL, application_filename, 
        NULL, NULL, SW_SHOWNORMAL );

    if( result <= 32 ) {
        printf( "Failed to launch SDA after installation" );
    }
    
    if( strcmp( response, "OK" ) != 0 ) {
        printf( "Installation failed" );
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}

#define IPC_IMPLEMENTATION
#include "ipc.h"

