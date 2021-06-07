#define _CRT_SECURE_NO_WARNINGS
#define _CRT_NONSTDC_NO_WARNINGS
#include "service.h"
#include "ipc.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <windows.h> 

#pragma comment(lib, "Shell32.lib")

#define SERVICE_NAME "symphony_sda_auto_update_service"
#define PIPE_NAME "symphony_sda_auto_update_ipc"

// Runs msiexec with the supplied filename
// TODO: logging/error handling
bool run_installer( char const* filename ) {
	char command[ 512 ];
	sprintf( command, "/i %s /q", filename );

    SHELLEXECUTEINFO ShExecInfo = { 0 };
    ShExecInfo.cbSize = sizeof( SHELLEXECUTEINFO );
    ShExecInfo.fMask = SEE_MASK_NOCLOSEPROCESS;
    ShExecInfo.hwnd = NULL;
    ShExecInfo.lpVerb = "open";
    ShExecInfo.lpFile = "msiexec";        
    ShExecInfo.lpParameters = command;   
    ShExecInfo.lpDirectory = NULL;
    ShExecInfo.nShow = SW_SHOW;
    ShExecInfo.hInstApp = NULL; 
    ShellExecuteEx( &ShExecInfo );
    WaitForSingleObject( ShExecInfo.hProcess, INFINITE );
    CloseHandle( ShExecInfo.hProcess );

    return true;
}


// Called by IPC server when a request comes in. Installs the package and returns a resul
// Also detects disconnects
void ipc_handler( char const* request, void* user_data, char* response, size_t capacity ) {
    bool* is_connected = (bool*) user_data;
    if( !request ) {
        *is_connected = false;
        service_cancel_sleep();
        return;
    }

    if( run_installer( request ) ) {
        strcpy( response, "OK" );
    } else {
        strcpy( response, "ERROR" );
    }

}


// Service main function. Keeps an IPC server running - if it gets disconnected it starts it
// up again. Install requests are handled by ipc_handler above
void service_main( void ) {
    while( service_is_running() ) {
        bool is_connected = true;
        ipc_server_t* server = ipc_server_start( PIPE_NAME, ipc_handler, &is_connected );
        while( is_connected && service_is_running() ) {
            service_sleep();
        }
        ipc_server_stop( server );
    }
}


int main( int argc, char** argv ) {
    // Debug helpers for install/uninstall
    if( argc >= 2 && stricmp( argv[ 1 ], "install" ) == 0 ) {
        if( service_install( SERVICE_NAME ) ) {
            printf("Service installed successfully\n"); 
            return EXIT_SUCCESS;
        } else {
            printf("Service failed to install\n"); 
            return EXIT_FAILURE;
        }
    }
    if( argc >= 2 && stricmp( argv[ 1 ], "uninstall" ) == 0 ) {
        if( service_uninstall( SERVICE_NAME ) ) {
            printf("Service uninstalled successfully\n"); 
            return EXIT_SUCCESS;
        } else {
            printf("Service failed to uninstall\n"); 
            return EXIT_FAILURE;
        }
    }

    // Run the service - called by the Windows Services system
    service_run( SERVICE_NAME, service_main );
    return EXIT_SUCCESS;
}


#define SERVICE_IMPLEMENTATION
#include "service.h"

#define IPC_IMPLEMENTATION
#include "ipc.h"