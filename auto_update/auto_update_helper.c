#define _CRT_SECURE_NO_WARNINGS
#define _CRT_NONSTDC_NO_WARNINGS

//#define LOG_TO_CONSOLE_FOR_DEBUGGING

#include <windows.h>
#include <aclapi.h>
#pragma comment(lib, "advapi32.lib")
#pragma comment( lib, "shell32.lib" )

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define IPC_LOG_INFO LOG_INFO
#define IPC_LOG_ERROR LOG_ERROR
#define IPC_LOG_LAST_ERROR LOG_LAST_ERROR
#include "ipc.h"

#define PIPE_NAME "symphony_sda_auto_update_ipc"


struct log_t {
    CRITICAL_SECTION mutex;
    FILE* file;
    int time_offset;
} g_log;


void internal_log( char const* file, int line, char const* func, char const* level, char const* format, ... ) {
    EnterCriticalSection( &g_log.mutex );

    if( g_log.file ) {
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

        fprintf( g_log.file, "%d-%02d-%02d %02d:%02d:%02d:025 %+02d:%02d | %s | %s(%d) | %s: ", info->tm_year + 1900, info->tm_mon + 1, 
            info->tm_mday, info->tm_hour, info->tm_min, info->tm_sec, offs_h, offs_m, level, file, line, func );
        va_list args;
        va_start( args, format );
        vfprintf( g_log.file, format, args );
        va_end( args );
        fflush( g_log.file );
    }

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


void log_init( char const* filename ) {
    InitializeCriticalSection( &g_log.mutex );

    if( filename ) {
        #ifndef LOG_TO_CONSOLE_FOR_DEBUGGING
            g_log.file = fopen( filename, "w" );
        #else
            g_log.file = stdout;
        #endif

        time_t rawtime = time( NULL );
        struct tm* ptm = gmtime( &rawtime );
        time_t gmt = mktime( ptm );
        g_log.time_offset = (int)difftime( rawtime, gmt );
        LOG_INFO( "Log file created: %s", filename );
    }
}


int main( int argc, char* argv[] ) {
    // Find argument ending with .log, if any
    char const* log_filename = NULL;
    for( int i = 0; i < argc; ++i ) {
        char const* ext = strrchr( argv[ i ], '.' );
        if( stricmp( ext, ".log" ) == 0 ) {
            log_filename = argv[ i ];
            break;
        }
    }
    if( !log_filename ) {
        return EXIT_FAILURE;
    }

    // Initialize logging
    log_init( log_filename );

    LOG_INFO( "argc: %d", argc );
    for( int i = 0; i < argc; ++i ) {
        LOG_INFO( "argv[%d]: %s", i, argv[ i ] );
    }    

    if( argc != 4 ) {
        LOG_ERROR( "Not enough arguments: %d provided, expected 4", argc );
        return EXIT_FAILURE;
    }

    char const* installer_filename = argv[ 1 ];
    char const* application_filename = argv[ 2 ];
    LOG_INFO( "installer_filename: %s", installer_filename );
    LOG_INFO( "application_filename: %s", application_filename );

    BOOL installation_successful = FALSE;
    LOG_INFO( "Connecting to IPC server" );
    ipc_client_t* client = ipc_client_connect( PIPE_NAME );
    if( client ) {
        BOOL installation_in_progress = FALSE;
        LOG_INFO( "Connected" );
        char command[ 512 ];
        sprintf( command, "msi %s", installer_filename );
        LOG_INFO( "Sending command: \"%s\"", command );
        if( ipc_client_send( client, command ) ) {
            LOG_INFO( "Command sent" );
            char response[ 256 ] = { 0 };
            int size = 0;
            int temp_size = 0;
            LOG_INFO( "Receiving response" );
            ipc_receive_status_t status = IPC_RECEIVE_STATUS_MORE_DATA;
            while( size < sizeof( response ) - 1 && status == IPC_RECEIVE_STATUS_MORE_DATA ) {
                status = ipc_client_receive( client, response + size, 
                    sizeof( response ) - size - 1, &temp_size );
                if( status == IPC_RECEIVE_STATUS_ERROR ) {
                    LOG_ERROR( "Receiving response failed" );
                    break;
                }
                size += temp_size;
            }
            response[ size ] = '\0';
            LOG_INFO( "Response received: \"%s\"", response );
            if( strcmp( response, "OK" ) == 0 ) {
                LOG_INFO( "Installation in progress" );
                installation_in_progress = TRUE;
            } else {
                LOG_ERROR( "Installation failed" );
            }
        } else {
            LOG_ERROR( "Failed to send command" );
        }

        // Service will shut down while installation is in progress, so we need to reconnect
        if( installation_in_progress ) {
            ipc_client_disconnect( client );
            client = NULL;
            LOG_INFO( "Attempting to reconnect" );
            int time_elapsed_ms = 0;
            while( !client ) {
                Sleep( 5000 );
                client = ipc_client_connect( PIPE_NAME );
                if( !client ) {
                    time_elapsed_ms += 5000;
                    if( time_elapsed_ms > 10*60*1000 ) {
                        LOG_ERROR( "Unable to reconnect to service after 10 minutes, things have gone very wrong" );
                        break;
                    }
                }
            }
        }

        if( client ) {
            // retrieve status
            LOG_INFO( "Retrieving installation status from service" );
            LOG_INFO( "Sending command: \"status\"" );
            if( ipc_client_send( client, "status" ) ) {
                LOG_INFO( "Command sent" );
                char response[ 256 ] = { 0 };
                int size = 0;
                int temp_size = 0;
                LOG_INFO( "Receiving response" );
                ipc_receive_status_t status = IPC_RECEIVE_STATUS_MORE_DATA;
                while( size < sizeof( response ) - 1 && status == IPC_RECEIVE_STATUS_MORE_DATA ) {
                    status = ipc_client_receive( client, response + size, 
                        sizeof( response ) - size - 1, &temp_size );
                    if( status == IPC_RECEIVE_STATUS_ERROR ) {
                        LOG_ERROR( "Receiving response failed" );
                        break;
                    }
                    size += temp_size;
                }
                response[ size ] = '\0';
                if( *response ) {
                    if( stricmp( response, "FINISHED" ) == 0 ) {
                        LOG_INFO( "INSTALLATION SUCCESSFUL" );
                        installation_successful = TRUE;
                    } else if( stricmp( response, "FAILED" ) == 0 ) {
                        LOG_ERROR( "FAILED TO LAUNCH INSTALLER" );
                    } else if( stricmp( response, "INVALID" ) == 0 ) {
                        LOG_ERROR( "NO RECENT INSTALLATION" );
                    }
                } else {
                    LOG_ERROR( "Failed to get a valid status response" );
                    ipc_client_disconnect( client );
                    client = NULL;
                }
            } else {
                LOG_ERROR( "Failed to send command, disconnecting and aborting. Logs not collected." );
                ipc_client_disconnect( client );
                client = NULL;
            }

            // retrieve logs
            if( client ) {
                LOG_INFO( "Retrieving logs from service" );
                bool logs_finished = false;
                while( !logs_finished ) {
                    LOG_INFO( "Sending command: \"log\"" );
                    if( ipc_client_send( client, "log" ) ) {
                        LOG_INFO( "Command sent" );
                        char response[ 4096 ] = { 0 };
                        int size = 0;
                        int temp_size = 0;
                        LOG_INFO( "Receiving response" );
                        ipc_receive_status_t status = IPC_RECEIVE_STATUS_MORE_DATA;
                        while( size < sizeof( response ) - 1 && status == IPC_RECEIVE_STATUS_MORE_DATA ) {
                            status = ipc_client_receive( client, response + size, 
                                sizeof( response ) - size - 1, &temp_size );
                            if( status == IPC_RECEIVE_STATUS_ERROR ) {
                                LOG_ERROR( "Receiving response failed" );
                                break;
                            }
                            size += temp_size;
                        }
                        response[ size ] = '\0';
                        if( *response ) {
                            size_t len = strlen( response );
                            if( len > 0 && response[ len - 1 ] == '\n' ) {
                                response[ len - 1 ] = '\0';
                            }
                            LOG_INFO( "SERVER LOG | %s", response );
                        } else {
                            LOG_INFO( "All logs retrieved" );
                            logs_finished = true;
                        }
                    } else {
                        LOG_ERROR( "Failed to send command, disconnecting and aborting. Logs not collected." );
                        ipc_client_disconnect( client );
                        client = NULL;
                    }
                }
                LOG_INFO( "All done, disconnecting from client" );
                ipc_client_disconnect( client );
            }
        }
    }

    LOG_INFO( "Launching SDA after installation: \"%s\"", application_filename   );
    int result = (int)(uintptr_t) ShellExecute( NULL, NULL, application_filename, 
        NULL, NULL, SW_SHOWNORMAL );

    if( result <= 32 ) {
        LOG_LAST_ERROR( "Failed to launch SDA after installation" );
    }
    
    if( !installation_successful ) {
        LOG_ERROR( "Installation failed." );
        return EXIT_FAILURE;
    }

    LOG_INFO( "Installation successful." );
    return EXIT_SUCCESS;
}

#define IPC_IMPLEMENTATION
#include "ipc.h"

