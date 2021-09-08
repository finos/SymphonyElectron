#define _CRT_SECURE_NO_WARNINGS
#define _CRT_NONSTDC_NO_WARNINGS

#define SERVICE_LOG_INFO LOG_INFO
#define SERVICE_LOG_ERROR LOG_ERROR
#define SERVICE_LOG_LAST_ERROR LOG_LAST_ERROR
#include "service.h"

#define IPC_LOG_INFO LOG_INFO
#define IPC_LOG_ERROR LOG_ERROR
#define IPC_LOG_LAST_ERROR LOG_LAST_ERROR
#include "ipc.h"

#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <windows.h> 

#pragma comment(lib, "Shell32.lib")

#define SERVICE_NAME "symphony_sda_auto_update_service"
#define PIPE_NAME "symphony_sda_auto_update_ipc"

// Logging

struct log_entry_t {
    time_t timestamp;
    char* text;
};

struct log_t {
    CRITICAL_SECTION mutex;
    char filename[ MAX_PATH ];
    FILE* file;
    int time_offset;
    int count;
    int capacity;
    struct log_entry_t* entries;
    clock_t session_end;
} g_log;


void internal_log( char const* file, int line, char const* func, char const* level, char const* format, ... ) {
    EnterCriticalSection( &g_log.mutex );
    
    char const* lastbackslash = strrchr( file, '\\' );
    if( lastbackslash ) {
        file = lastbackslash + 1;
    }

    time_t rawtime;
	struct tm* info;
	time( &rawtime );
	info = localtime( &rawtime );
	int offset = g_log.time_offset;
	int offs_s = offset % 60;
	offset -= offs_s;
	int offs_m = ( offset % (60 * 60) ) / 60;
	offset -= offs_m * 60;
	int offs_h = offset / ( 60 * 60 );

    if( g_log.file ) {
	    fprintf( g_log.file, "%d-%02d-%02d %02d:%02d:%02d:025 %+02d:%02d | %s | %s(%d) | %s: ", info->tm_year + 1900, info->tm_mon + 1, 
		    info->tm_mday, info->tm_hour, info->tm_min, info->tm_sec, offs_h, offs_m, level, file, line, func );
	    va_list args;
	    va_start( args, format );
	    vfprintf( g_log.file, format, args );
	    va_end( args );
	    fflush( g_log.file );
    }

    size_t len = IPC_MESSAGE_MAX_LENGTH;
    char* buffer = (char*) malloc( len + 1 );
	size_t count = snprintf( buffer, len, "%d-%02d-%02d %02d:%02d:%02d:025 %+02d:%02d | %s | %s(%d) | %s: ", info->tm_year + 1900, info->tm_mon + 1, 
		info->tm_mday, info->tm_hour, info->tm_min, info->tm_sec, offs_h, offs_m, level, file, line, func );
    buffer[ count ] = '\0';
	va_list args;
	va_start( args, format );
	count += vsnprintf( buffer + count, len - count, format, args );
    buffer[ count ] = '\0';
	va_end( args );

    if( g_log.count >= g_log.capacity ) {
        g_log.capacity *= 2;
        g_log.entries = (struct log_entry_t*) realloc( g_log.entries, g_log.capacity * sizeof( struct log_entry_t ) );
    }

    g_log.entries[ g_log.count ].timestamp = clock();
    g_log.entries[ g_log.count ].text = buffer;
    ++g_log.count;
    
    LeaveCriticalSection( &g_log.mutex );
}


void internal_log_last_error( char const* file, int line, char const* func, char const* level, char const* message ) {
    EnterCriticalSection( &g_log.mutex );
    
    DWORD error = GetLastError();
    
    LPSTR buffer = NULL;
    size_t size = FormatMessageA( 
        FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
        NULL, error, MAKELANGID( LANG_NEUTRAL, SUBLANG_DEFAULT ), (LPSTR)&buffer, 0, NULL);
    

    internal_log( file, line, func, level, "%s: LastError == %u \"%s\"", message, error, buffer ? buffer : "" );
    
    if( buffer ) {
        LocalFree( buffer );
    }
            
    LeaveCriticalSection( &g_log.mutex );
}



#define LOG_INFO( format, ... ) internal_log( __FILE__, __LINE__, __func__, "info", format "\n", __VA_ARGS__ )
#define LOG_ERROR( format, ... ) internal_log( __FILE__, __LINE__, __func__, "error", format "\n", __VA_ARGS__ )
#define LOG_LAST_ERROR( message ) internal_log_last_error( __FILE__, __LINE__, __func__, "error", message )


void log_init( void ) {
    InitializeCriticalSection( &g_log.mutex );

    char path[ MAX_PATH ];
    ExpandEnvironmentStringsA( "%LOCALAPPDATA%\\SdaAutoUpdate", path, MAX_PATH );
    CreateDirectory( path, NULL );
    sprintf( g_log.filename, "%s\\saus_%d.log", path, (int) time( NULL ) );

    g_log.file = fopen( g_log.filename, "w" );

    time_t rawtime = time( NULL );
    struct tm* ptm = gmtime( &rawtime );
    time_t gmt = mktime( ptm );
    g_log.time_offset = (int)difftime( rawtime, gmt );

    g_log.count = 0;
    g_log.capacity = 256;
    g_log.entries = (struct log_entry_t*) malloc( g_log.capacity * sizeof( struct log_entry_t ) );
    LOG_INFO( "Log file created" );
}


void retrieve_buffered_log_line( char* response, size_t capacity ) {
    EnterCriticalSection( &g_log.mutex );
    if( g_log.session_end == 0 ) {
        g_log.session_end = clock();
    }
    if( g_log.count > 0 && g_log.entries[ 0 ].timestamp <= g_log.session_end ) {
        strncpy( response, g_log.entries[ 0 ].text, capacity );
        free( g_log.entries[ 0 ].text );
        --g_log.count;
        memmove( g_log.entries, g_log.entries + 1, g_log.count * sizeof( *g_log.entries ) );
    } else {
        g_log.session_end = 0;
        strcpy( response, "" );
    }
    LeaveCriticalSection( &g_log.mutex );
}


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
    if( ShellExecuteEx( &ShExecInfo ) ) {
        WaitForSingleObject( ShExecInfo.hProcess, INFINITE );
        DWORD exitCode = 0;
        GetExitCodeProcess( ShExecInfo.hProcess, &exitCode );
        CloseHandle( ShExecInfo.hProcess );
        return exitCode == 0 ? true : false;
    } else {
        return false;
    }
}


// Called by IPC server when a request comes in. Installs the package and returns a resul
// Also detects disconnects
void ipc_handler( char const* request, void* user_data, char* response, size_t capacity ) {
    LOG_INFO( "IPC handler invoked for request: %s", request );
    bool* is_connected = (bool*) user_data;
    if( !request ) {
        LOG_INFO( "Empty request, disconnection requested" );
        *is_connected = false;
        service_cancel_sleep();
        return;
    }

    // identify command
    if( strlen( request ) > 5 && strnicmp( request, "msi ", 4 ) == 0 ) {
        // "msi" - run installer
        LOG_INFO( "MSI command, running installer" );
        if( run_installer( request + 4 ) ) {
            strcpy( response, "OK" );
        } else {
            strcpy( response, "ERROR" );
        }
    } else if( strlen( request ) == 3 && stricmp( request, "log" ) == 0 ) {
        // "log" - send log line
        LOG_INFO( "LOG command, returning next log line" );
        retrieve_buffered_log_line( response, capacity );
    } else {
        LOG_INFO( "Unknown command \"%s\", ignored", request );
        strcpy( response, "ERROR" );
    }
}


// Service main function. Keeps an IPC server running - if it gets disconnected it starts it
// up again. Install requests are handled by ipc_handler above
void service_main( void ) {
    LOG_INFO( "Service main function running" );
    while( service_is_running() ) {
        bool is_connected = true;
        LOG_INFO( "Starting IPC server" );
        ipc_server_t* server = ipc_server_start( PIPE_NAME, ipc_handler, &is_connected );
        while( is_connected && service_is_running() ) {
            service_sleep();
        }
        LOG_INFO( "IPC server disconnected" );
        ipc_server_stop( server );
    }
    LOG_INFO( "Leaving service main function" );
}


int main( int argc, char** argv ) {
    log_init();

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
    LOG_INFO( "Starting service" );
    service_run( SERVICE_NAME, service_main );
    return EXIT_SUCCESS;
}


#define SERVICE_IMPLEMENTATION
#include "service.h"

#define IPC_IMPLEMENTATION
#include "ipc.h"