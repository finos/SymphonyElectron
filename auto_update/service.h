#ifndef service_h
#define service_h

#include <stdbool.h>

bool service_install( char const* service_name );
bool service_uninstall( char const* service_name );

typedef void (*service_main_func_t)( void );

void service_run( char const* service_name, service_main_func_t main_func );

bool service_is_running( void );

void service_sleep( void );
void service_cancel_sleep( void );

#endif /* service_h */


#ifdef SERVICE_IMPLEMENTATION
#undef SERVICE_IMPLEMENTATION

#include <windows.h> 
#include <stdio.h> 

// Temporary logging for debugging, will be replaced by something better
static struct {
    FILE* fp;
    CRITICAL_SECTION mutex;
} g_log = { NULL };

void logf( char const* format, ... ) {
    if( !g_log.fp ) {
        char path[ MAX_PATH ];
        ExpandEnvironmentStringsA( "%LOCALAPPDATA%\\SdaAutoUpdate", path, MAX_PATH );
        CreateDirectory( path, NULL );
        strcat( path, "\\log.txt" );
        g_log.fp = fopen( path, "w" );
        InitializeCriticalSection( &g_log.mutex );
    }
    EnterCriticalSection( &g_log.mutex );
    va_list args;
    va_start( args, format );
    vfprintf( g_log.fp,  format, args );
    vprintf( format, args );
    va_end( args );
    fflush( g_log.fp );
    LeaveCriticalSection( &g_log.mutex );
}


// Get an errror description for the last error from Windows, for logging purposes
// TODO: thread safe return value
char const* error_message( void  ) {
    DWORD error = GetLastError();
    if( error == 0 ) {
        return "";
    }
    
    LPSTR buffer = NULL;
    size_t size = FormatMessageA( 
        FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
        NULL, error, MAKELANGID( LANG_NEUTRAL, SUBLANG_DEFAULT ), (LPSTR)&buffer, 0, NULL);
    
    static char message[ 1024 ] = "";
    if( buffer ) {
        strncpy( message, buffer, sizeof( message ) );
        message[ sizeof( message ) - 1 ] = '\0';
        LocalFree(buffer);
    }
            
    return message;
}


// Helper function to install the service, used for debugging (for production, service is set up by installer).
bool service_install( char const* service_name ) {
    // Get the path to the running executable
    TCHAR path[ MAX_PATH ];
    if( !GetModuleFileName( NULL, path, MAX_PATH ) ) {
        printf("Cannot install service: LastError = %d %s\n", GetLastError(), error_message() );
        return false;
    }

    // Get a handle to the SCM database. 
    SC_HANDLE scm = OpenSCManager( 
        NULL,                       // local computer
        NULL,                       // ServicesActive database 
        SC_MANAGER_ALL_ACCESS );    // full access rights 
    if( !scm ) {
        printf( "OpenSCManager failed: LastError = %d %s\n", GetLastError(), error_message() );
        return false;
    }

    // Create the service
    SC_HANDLE service = CreateService( 
        scm,                        // SCM database 
        service_name,               // name of service 
        service_name,               // service name to display 
        SERVICE_ALL_ACCESS,         // desired access 
        SERVICE_WIN32_OWN_PROCESS,  // service type 
        SERVICE_DEMAND_START,       // start type 
        SERVICE_ERROR_NORMAL,       // error control type 
        path,                       // path to service's binary 
        NULL,                       // no load ordering group 
        NULL,                       // no tag identifier 
        NULL,                       // no dependencies 
        NULL,                       // LocalSystem account 
        NULL);                      // no password 
    if( !service ) {
        printf( "CreateService failed: LastError = %d %s\n", GetLastError(), error_message() );
        CloseServiceHandle( scm );
        return false;
    }

    CloseServiceHandle( service ); 
    CloseServiceHandle( scm );
    return true;
}


// Helper function to uninstall the service, used for debugging (for production, service is set up by installer).
bool service_uninstall( char const* service_name ) {
    // Get a handle to the SCM database. 
    SC_HANDLE scm = OpenSCManager( 
        NULL,                       // local computer
        NULL,                       // ServicesActive database 
        SC_MANAGER_ALL_ACCESS );    // full access rights 
    if( !scm ) {
        printf( "OpenSCManager failed: LastError = %d %s\n", GetLastError(), error_message() );
        return false;
    }

    // Get a handle to the service.
    SC_HANDLE service = OpenService( 
        scm,            // SCM database 
        service_name,   // name of service 
        DELETE);        // need delete access 
    if( !service ) {
        printf( "OpenService failed: LastError = %d %s\n", GetLastError(), error_message() );
        CloseServiceHandle( scm );
        return false;
    }

    // Delete the service.
    if( !DeleteService( service ) ) {
        printf( "DeleteService failed: LastError = %d %s\n", GetLastError(), error_message() );
        CloseServiceHandle( service ); 
        CloseServiceHandle( scm );
        return false;
    }
 
    CloseServiceHandle( service ); 
    CloseServiceHandle( scm );
    return true;
}


// Global state for the service
struct {
    char const* service_name;
    service_main_func_t main_func;
    bool is_running;
    HANDLE stop_event;
    SERVICE_STATUS service_status; 
    SERVICE_STATUS_HANDLE status_handle; 
    HANDLE sleep_event;
} g_service = { FALSE };


// Thread proc for service. Just calls the user-provided main func
DWORD WINAPI service_main_thread( LPVOID param ) { 
    g_service.main_func();
    return EXIT_SUCCESS;
}


// Helper function to report the status of the service. The service needs to
// notify the windows service manager of its status correctly, otherwise it
// will be considerered unresponsive and closed
VOID report_service_status( DWORD current_state, DWORD exit_code, DWORD wait_hint ) {
    static DWORD check_point = 1;

    g_service.service_status.dwServiceType = SERVICE_WIN32_OWN_PROCESS; 
    g_service.service_status.dwServiceSpecificExitCode = 0;    
    g_service.service_status.dwCurrentState = current_state;
    g_service.service_status.dwWin32ExitCode = exit_code;
    g_service.service_status.dwWaitHint = wait_hint;

    if( current_state == SERVICE_START_PENDING ) {
        g_service.service_status.dwControlsAccepted = 0;
    } else {
        g_service.service_status.dwControlsAccepted = SERVICE_ACCEPT_STOP;
    }

    if( current_state == SERVICE_RUNNING || current_state == SERVICE_STOPPED ) {
        g_service.service_status.dwCheckPoint = 0;
    } else {
        g_service.service_status.dwCheckPoint = check_point++;
    }

    // Report the status of the service to the SCM.
    SetServiceStatus( g_service.status_handle, &g_service.service_status );
}


// Service control handler, used to signal the service to stop (if the user stops it
// in the Services control panel)
VOID WINAPI service_ctrl_handler( DWORD ctrl ) {
    switch( ctrl ) {  
        case SERVICE_CONTROL_STOP: {
            report_service_status( SERVICE_STOP_PENDING, NO_ERROR, 0 );

            // Signal the service to stop.
            SetEvent( g_service.stop_event );
            
            report_service_status(g_service.service_status.dwCurrentState, NO_ERROR, 0);         
            return;
        } break;

        case SERVICE_CONTROL_INTERROGATE: {
            report_service_status( g_service.service_status.dwCurrentState, NO_ERROR, 0 );
        } break; 
 
        default: 
            break;
    } 
}


// TODO: better logging once we have a final solution for logging (another jira ticket)

// Main function of the service. Starts a thread to run the user-provided service function
VOID WINAPI service_proc( DWORD argc, LPSTR *argv ) {
    logf( "Service proc\n" );

    // Register the handler function for the service
    g_service.status_handle = RegisterServiceCtrlHandler( g_service.service_name,  service_ctrl_handler );
    if( !g_service.status_handle ) { 
        logf( "Failed to register the service control handler\n" );
        return; 
    } 

    // Report initial status to the SCM
    report_service_status( SERVICE_START_PENDING, NO_ERROR, 3000 );

    // Create the event used to signal the service to stop
    g_service.stop_event = CreateEvent(
        NULL,   // default security attributes
        TRUE,   // manual reset event
        FALSE,  // not signaled
        NULL);  // no name
    if ( g_service.stop_event == NULL ) {
        logf( "No event\n" );
        report_service_status( SERVICE_STOPPED, NO_ERROR, 0 );
        return;
    }

    // Start the thread which runs the user-provided main function
    HANDLE thread = CreateThread( 
        NULL,                   // no security attribute 
        0,                      // default stack size 
        service_main_thread,    // thread proc
        NULL,                   // thread parameter 
        0,                      // not suspended 
        NULL );                 // returns thread ID 

    // Report to the SCM that the service is now up and running
    report_service_status( SERVICE_RUNNING, NO_ERROR, 0 );
    logf( "Service started\n" );

    // Wait until the service is stopped
    WaitForSingleObject( g_service.stop_event, INFINITE );
    
    // Flag the user-provided main func to exit
    g_service.is_running = false;
    SetEvent( g_service.sleep_event );
    
    // Wait until user-provided main func has exited
    WaitForSingleObject( thread, INFINITE );

    // Report to the SCM that the service has stopped
    report_service_status( SERVICE_STOPPED, NO_ERROR, 0 );

    logf( "Exit service proc\n" );
}


// Run the service with the specified name, and invoke the main_func function 
// The main_func provided should exit if service_is_running returns false
void service_run( char const* service_name, service_main_func_t main_func ) {
    SetLastError( 0 );
    logf( "Starting service\n" );

    // Initialize global state
    g_service.service_name = service_name;
    g_service.main_func = main_func;
    g_service.is_running = true;
    g_service.sleep_event = CreateEvent(
                         NULL,    // default security attributes
                         TRUE,    // manual reset event
                         FALSE,   // not signaled
                         NULL);   // no name
    
    // Launch service
    SERVICE_TABLE_ENTRY dispatch_table[] = { 
        { (LPSTR) service_name, (LPSERVICE_MAIN_FUNCTION) service_proc }, 
        { NULL, NULL } 
    }; 
    if( !StartServiceCtrlDispatcher( dispatch_table ) ) { 
        logf( "Error: LastError = %d %s\n", GetLastError(), error_message() );
    } 

    // Cleanup
    CloseHandle( g_service.sleep_event );
    logf( "Service stopped\n" );
}


// Returns true while service is running, false if it has been asked to stop
bool service_is_running() {
    return g_service.is_running;
}


// Sleeps until service_cancel_sleep is called, either manually by the user or 
// because the serice received a stop request
void service_sleep( void ) {
    ResetEvent( g_service.sleep_event );
    WaitForSingleObject( g_service.sleep_event, INFINITE );
}


// Can be used to cancel a pending service sleep
void service_cancel_sleep( void ) {
    SetEvent( g_service.sleep_event );
}



#endif /* SERVICE_IMPLEMENTATION */