#ifndef ipc_h
#define ipc_h

#define IPC_MESSAGE_MAX_LENGTH 512

// client

typedef struct ipc_client_t ipc_client_t;

ipc_client_t* ipc_client_connect( char const* pipe_name );

void ipc_client_disconnect( ipc_client_t* connection );

typedef enum ipc_receive_status_t {
    IPC_RECEIVE_STATUS_DONE,
    IPC_RECEIVE_STATUS_MORE_DATA,
    IPC_RECEIVE_STATUS_ERROR,
} ipc_receive_status_t;

ipc_receive_status_t ipc_client_receive( ipc_client_t* connection, char* output, int output_size, int* received_size );

bool ipc_client_send( ipc_client_t* connection, char const* message );


// server

typedef struct ipc_server_t ipc_server_t;

typedef void (*ipc_request_handler_t)( char const* request, void* user_data, char* response, size_t capacity );

ipc_server_t* ipc_server_start( char const* pipe_name, ipc_request_handler_t request_handler, void* user_data );

void ipc_server_stop( ipc_server_t* server );



#endif /* ipc_h */



#ifdef IPC_IMPLEMENTATION
#undef IPC_IMPLEMENTATION

#include <stdio.h>
#include <windows.h> 
#include <aclapi.h>

#pragma comment(lib, "advapi32.lib")

bool expand_pipe_name( char const* pipe_name, char* buffer, size_t capacity ) {
    int result = snprintf( buffer, capacity, "\\\\.\\pipe\\%s", pipe_name );
    return result >= 0 && result < (int) capacity;
}


bool pipe_exists( const char* pipe_name ) {
    WIN32_FIND_DATAA data;
    memset( &data, 0, sizeof( data ) );

    HANDLE hfind = FindFirstFileA( "\\\\.\\pipe\\*", &data );
    if( hfind != INVALID_HANDLE_VALUE ) {
        do {
            char const* filename = data.cFileName;
            if( _stricmp( filename, pipe_name ) == 0 ) {
                FindClose( hfind );
                return true;
            }
        } while( FindNextFileA( hfind, &data ) );
        FindClose( hfind );
    }

    return false;
}


struct ipc_client_t {
   HANDLE pipe; 
};


ipc_client_t* ipc_client_connect( char const* pipe_name ) {
    if( !pipe_exists( pipe_name ) ) {
        // Retry once if pipe was not found
        Sleep( 1000 );
        if( !pipe_exists( pipe_name ) ) {
            printf( "Named pipe does not exist\n" ); 
            return NULL;
        }
    }

    char expanded_pipe_name[ MAX_PATH ];
    if( !expand_pipe_name( pipe_name, expanded_pipe_name, sizeof( expanded_pipe_name ) ) ) {
        printf( "Pipe name too long\n" ); 
        return NULL;
    }

    HANDLE pipe = NULL;
    for( ; ; ) { // Keep trying to connect while pipe is busy
        pipe = CreateFileA( 
            expanded_pipe_name, // pipe name 
            GENERIC_READ |      // read and write access 
            GENERIC_WRITE, 
            0,                  // no sharing 
            NULL,               // default security attributes
            OPEN_EXISTING,      // opens existing pipe 
            0,                  // default attributes 
            NULL );             // no template file 
 
        // Break if the pipe handle is valid. 
        if( pipe != INVALID_HANDLE_VALUE ) {
            break; 
        }

        // Retry once if pipe was not found
        if( GetLastError() == ERROR_FILE_NOT_FOUND ) {
            Sleep( 1000 );
            pipe = CreateFileA( 
                expanded_pipe_name, // pipe name 
                GENERIC_READ |      // read and write access 
                GENERIC_WRITE, 
                0,                  // no sharing 
                NULL,               // default security attributes
                OPEN_EXISTING,      // opens existing pipe 
                0,                  // default attributes 
                NULL );             // no template file 
            // Break if the pipe handle is valid. 
            if( pipe != INVALID_HANDLE_VALUE ) {
                break; 
            }
        }


        // Exit if an error other than ERROR_PIPE_BUSY occurs. 
        if( GetLastError() != ERROR_PIPE_BUSY ) {
            printf( "Could not open pipe. LastError=%d\n", GetLastError() ); 
            return NULL;
        }
 
        // All pipe instances are busy, so wait for 20 seconds. 
        if( !WaitNamedPipeA( expanded_pipe_name, 20000 ) )  { 
            if( GetLastError() == ERROR_FILE_NOT_FOUND ) {
                // retry once just in case pipe was not created yet
                Sleep(1000);
                if( !WaitNamedPipeA( expanded_pipe_name, 20000 ) )  { 
                    printf( "Could not open pipe on second attempt: 20 second wait timed out. LastError=%d\n", GetLastError() ); 
                    return NULL;
                }
            } else {
                printf( "Could not open pipe: 20 second wait timed out. LastError=%d\n", GetLastError() ); 
                return NULL;
            }            
        } 
    } 
    ipc_client_t* connection = (ipc_client_t*) malloc( sizeof( ipc_client_t ) );
    connection->pipe = pipe;
    return connection;
}


void ipc_client_disconnect( ipc_client_t* connection ) {
    FlushFileBuffers( connection->pipe ); 
    DisconnectNamedPipe( connection->pipe );
    CloseHandle( connection->pipe ); 
    free( connection );
}


ipc_receive_status_t ipc_client_receive( ipc_client_t* connection, char* output, int output_size, int* received_size ) {
    DWORD size_read = 0;
    BOOL success = ReadFile( 
        connection->pipe,   // pipe handle 
        output,             // buffer to receive reply 
        output_size,        // size of buffer 
        &size_read,         // number of bytes read 
        NULL );             // not overlapped 
 
    if( !success && GetLastError() != ERROR_MORE_DATA ) {
        printf( "ReadFile from pipe failed. LastError=%d\n", GetLastError() );
        return IPC_RECEIVE_STATUS_ERROR;
    }
    
    if( received_size ) {
        *received_size = size_read;
    }

    if( success ) {
        return IPC_RECEIVE_STATUS_DONE;
    } else {
        return IPC_RECEIVE_STATUS_MORE_DATA;
    }
}


bool ipc_client_send( ipc_client_t* connection, char const* message ) {
    DWORD mode = PIPE_READMODE_MESSAGE; 
    BOOL success = SetNamedPipeHandleState( 
        connection->pipe,   // pipe handle 
        &mode,              // new pipe mode 
        NULL,               // don't set maximum bytes 
        NULL );             // don't set maximum time 
    if( !success )  {
        printf( "SetNamedPipeHandleState failed. LastError=%d\n", GetLastError() ); 
        return false;
    }
 
    // Send a message to the pipe server. 
    DWORD written = 0;
    success = WriteFile( 
        connection->pipe,               // pipe handle 
        message,                        // message 
        (DWORD) strlen( message ) + 1,  // message length 
        &written,                       // bytes written 
        NULL );                         // not overlapped 

    if( !success ) {
        printf( "WriteFile to pipe failed. LastError=%d\n", GetLastError() ); 
        return false;
    }

    return true;
}


typedef struct ipc_client_thread_t {
    BOOL recycle;
    ipc_server_t* server;
    HANDLE thread;
    HANDLE thread_started_event;
    HANDLE pipe;
    OVERLAPPED io;
    int exit_flag;
} ipc_client_thread_t;

#define MAX_CLIENT_CONNECTIONS 32

struct ipc_server_t {
    char expanded_pipe_name[ MAX_PATH ];
    PSID sid;
    PACL acl;
    PSECURITY_DESCRIPTOR sd;
    HANDLE thread;
    HANDLE thread_started_event;
    HANDLE pipe;
    OVERLAPPED io;
    int exit_flag;
    ipc_request_handler_t request_handler;
    void* user_data;
    ipc_client_thread_t client_threads[ MAX_CLIENT_CONNECTIONS ];
    int client_threads_count;
};


// This routine is a thread processing function to read from and reply to a client
// via the open pipe connection passed from the main loop. Note this allows
// the main loop to continue executing, potentially creating more threads of
// this procedure to run concurrently, depending on the number of incoming
// client connections.
DWORD WINAPI ipc_client_thread( LPVOID param ) {

    // Print verbose messages. In production code, this should be for debugging only.
    //printf( "ipc_client_thread created, receiving and processing messages.\n" );

    // The thread's parameter is a handle to a pipe object instance. 
    ipc_client_thread_t* context= (ipc_client_thread_t*) param;
    ipc_server_t* server = context->server;
    HANDLE hPipe = context->pipe; 

    HANDLE hEvent = CreateEvent( 
            NULL,               // default security attributes
            TRUE,               // manual-reset event
            FALSE,              // initial state is nonsignaled
            NULL                // object name
            ); 
    //printf( "Thread started\n" );
    SetEvent( context->thread_started_event );
    // Loop until done reading
    for( ; ; ) { 
        CHAR pchRequest[ IPC_MESSAGE_MAX_LENGTH ];
        for( ; ; ) {
            // Read client requests from the pipe. This simplistic code only allows messages
            // up to IPC_MESSAGE_MAX_LENGTH characters in length.
            //printf( "ipc_client_thread: reading.\n" ); 
            DWORD cbBytesRead = 0;
            memset( &context->io, 0, sizeof( context->io ) );
            ResetEvent( hEvent );
            context->io.hEvent = hEvent;
            BOOL fSuccess = ReadFile( 
                hPipe,                      // handle to pipe 
                pchRequest,                 // buffer to receive data 
                IPC_MESSAGE_MAX_LENGTH * sizeof( CHAR ),   // size of buffer 
                &cbBytesRead,               // number of bytes read 
                &context->io );                     // overlapped I/O 
            //printf( "ipc_client_thread: read.\n" ); 

            if( !fSuccess && GetLastError() == ERROR_IO_PENDING ) {
                if( WaitForSingleObject( hEvent, 500 ) == WAIT_TIMEOUT ) {
                    CancelIoEx( context->pipe, &context->io );
                    continue;
                }
                fSuccess = GetOverlappedResult( 
                    hPipe, // handle to pipe 
                    &context->io, // OVERLAPPED structure 
                    &cbBytesRead,            // bytes transferred 
                    FALSE );            //  wait 
            }
 
            if( !fSuccess || cbBytesRead == 0 ) {   
                if (GetLastError() == ERROR_BROKEN_PIPE) {
                    //printf( "ipc_client_thread: client disconnected.\n" ); 
                } else {
                    printf( "ipc_client_thread ReadFile failed, LastError=%d.\n", GetLastError() ); 
                }
                goto exit_client_thread;
            }

            if( context->exit_flag ) {
                goto exit_client_thread;
            }

            break;
        }

        // Process the incoming message.
        char pchReply[ IPC_MESSAGE_MAX_LENGTH ];
        memset( pchReply, 0, sizeof( pchReply ) );
        server->request_handler( pchRequest, server->user_data, pchReply, sizeof( pchReply ) ); 
        pchReply[ IPC_MESSAGE_MAX_LENGTH - 1 ] = '\0'; // Force zero termination (truncate string)
        DWORD cbReplyBytes = (DWORD)strlen(pchReply) + 1; 
 
        // Write the reply to the pipe. 
        //printf( "ipc_client_thread: writing.\n" ); 
        DWORD cbWritten = 0; 
        BOOL fSuccess = WriteFile( 
            hPipe,          // handle to pipe 
            pchReply,       // buffer to write from 
            cbReplyBytes,   // number of bytes to write 
            &cbWritten,     // number of bytes written 
            &context->io );         // overlapped I/O 

        //printf( "ipc_client_thread: writ.\n" ); 
        if( fSuccess || GetLastError() == ERROR_IO_PENDING ) {
            fSuccess = GetOverlappedResult( 
                hPipe, // handle to pipe 
                &context->io, // OVERLAPPED structure 
                &cbWritten,            // bytes transferred 
                FALSE);            //  wait 
        }
 
        if( !fSuccess || cbReplyBytes != cbWritten ) {   
            printf( ("ipc_client_thread WriteFile failed, LastError=%d.\n"), GetLastError()); 
            break;
        }

        if( context->exit_flag ) {
            break;
        }
    }
exit_client_thread:
    //printf( "ipc_client_thread cleanup.\n" );
    
    // Flush the pipe to allow the client to read the pipe's contents 
    // before disconnecting. Then disconnect the pipe, and close the 
    // handle to this pipe instance. 
    CloseHandle( hEvent );
    FlushFileBuffers( hPipe ); 
    DisconnectNamedPipe( hPipe ); 
    CloseHandle( hPipe ); 
    context->pipe = INVALID_HANDLE_VALUE;
    context->recycle = TRUE;
    //printf( "ipc_client_thread exiting.\n" );
    return EXIT_SUCCESS;
}

void ipc_stop_client_thread( ipc_client_thread_t* thread_context ) {
    thread_context->exit_flag = 1;
    CancelIoEx( thread_context->pipe, &thread_context->io );
    WaitForSingleObject( thread_context->thread, INFINITE );
}

DWORD WINAPI ipc_server_thread( LPVOID param ) { 
    ipc_server_t* server = (ipc_server_t*) param;

    // TODO: logging
    //fp = fopen( "C:\\auto_update_poc\\log.txt", "w" );
    //setvbuf(fp, NULL, _IONBF, 0);

    SECURITY_ATTRIBUTES attribs;
    attribs.nLength = sizeof( SECURITY_ATTRIBUTES );
    attribs.lpSecurityDescriptor = server->sd;
    attribs.bInheritHandle = -1;
  
    // The main loop creates an instance of the named pipe and 
    // then waits for a client to connect to it. When the client 
    // connects, a thread is created to handle communications 
    // with that client, and this loop is free to wait for the
    // next client connect request. It is an infinite loop.
    bool event_raised = false;
    while( !server->exit_flag ) { 
        //printf( "\nPipe Server: Main thread awaiting client connection on %s\n", server->expanded_pipe_name );
        server->pipe = CreateNamedPipeA( 
            server->expanded_pipe_name,// pipe name 
            PIPE_ACCESS_DUPLEX |       // read/write access 
            FILE_FLAG_OVERLAPPED,
            PIPE_TYPE_MESSAGE |       // message type pipe 
            PIPE_READMODE_MESSAGE |   // message-read mode 
            PIPE_WAIT,                // blocking mode 
            MAX_CLIENT_CONNECTIONS,   // max. instances  
            IPC_MESSAGE_MAX_LENGTH,   // output buffer size 
            IPC_MESSAGE_MAX_LENGTH,   // input buffer size 
            0,                        // client time-out 
            &attribs );               // default security attribute 

        if( server->pipe == INVALID_HANDLE_VALUE ) {
            printf( "CreateNamedPipe failed, LastError=%d.\n", GetLastError() ); 
            return EXIT_FAILURE;
        }
 
        if( !event_raised ) {
            SetEvent( server->thread_started_event );
            event_raised = true;
        }

        // Wait for the client to connect; if it succeeds, 
        // the function returns a nonzero value. If the function
        // returns zero, GetLastError returns ERROR_PIPE_CONNECTED. 
        memset( &server->io, 0, sizeof( server->io ) );
        server->io.hEvent = CreateEvent( 
                NULL,               // default security attributes
                TRUE,               // manual-reset event
                FALSE,              // initial state is nonsignaled
                NULL                // object name
                ); 
        ConnectNamedPipe( server->pipe, &server->io );
        if( GetLastError() == ERROR_IO_PENDING ) {
            for( ; ; ) {
                if( WaitForSingleObject( server->io.hEvent, 100 ) == WAIT_OBJECT_0 ) {
                    break;
                }
                if( server->exit_flag ) {
                    break;
                }
            }
        } else if( GetLastError() != ERROR_PIPE_CONNECTED ) {
            if( GetLastError() != ERROR_OPERATION_ABORTED || server->exit_flag == 0 ) {
                // The client could not connect, so close the pipe. 
                printf( "Connection failed. LastError=%d\n",GetLastError() ); 
                CloseHandle( server->io.hEvent );
                break; 
            }
        }
        CloseHandle( server->io.hEvent );
        if( server->exit_flag ) {
            break;
        }

        //printf( "Client connected, creating a processing thread.\n" ); 
        // Create a thread for this client. 
        ipc_client_thread_t* context = NULL;
        for( int i = 0; i < server->client_threads_count; ++i ) {
            if( server->client_threads[ i ].recycle ) {
                context = &server->client_threads[ i ];
            }
        }
        if( !context ) {
            if( server->client_threads_count == MAX_CLIENT_CONNECTIONS ) {
                printf( "Too many connections\n" ); 
                if( server->pipe != INVALID_HANDLE_VALUE ) {
                    CloseHandle( server->pipe );
                    server->pipe = INVALID_HANDLE_VALUE;
                }

                return EXIT_FAILURE;
            } else {
                context = &server->client_threads[ server->client_threads_count++ ];
            }
        }        
        memset( context, 0, sizeof( *context ) );
        context->server = server;
        context->pipe = server->pipe;
        server->pipe = INVALID_HANDLE_VALUE;
        context->thread_started_event = CreateEvent( 
            NULL,               // default security attributes
            TRUE,               // manual-reset event
            FALSE,              // initial state is nonsignaled
            NULL                // object name
            ); 

        context->thread = CreateThread( 
            NULL,              // no security attribute 
            0,                 // default stack size 
            ipc_client_thread, // thread proc
            (LPVOID) context,  // thread parameter 
            0,                 // not suspended 
            NULL );            // returns thread ID 

        if( context->thread == NULL ) {
            printf( "CreateThread failed, LastError=%d.\n", GetLastError() ); 
            return EXIT_FAILURE;
        }
        //printf( "Waiting for thread\n" );
        WaitForSingleObject( context->thread_started_event, INFINITE );
    } 

    if( server->pipe != INVALID_HANDLE_VALUE ) {
        CloseHandle( server->pipe );
        server->pipe = INVALID_HANDLE_VALUE;
    }

    return EXIT_SUCCESS;
} 


ipc_server_t* ipc_server_start( char const* pipe_name, ipc_request_handler_t request_handler, void* user_data ) {
    ipc_server_t* server = (ipc_server_t*) malloc( sizeof( ipc_server_t ) );
    memset( server, 0, sizeof( ipc_server_t ) );
    server->pipe = INVALID_HANDLE_VALUE;
    if( !expand_pipe_name( pipe_name, server->expanded_pipe_name, sizeof( server->expanded_pipe_name ) ) ) {
        printf( "Pipe name too long\n" ); 
        free( server );
        return NULL;
    }

    // Create security attribs
    SID_IDENTIFIER_AUTHORITY auth = { SECURITY_WORLD_SID_AUTHORITY };
    if( !AllocateAndInitializeSid( &auth, 1, SECURITY_WORLD_RID, 0, 0, 0, 0, 0, 0, 0, &server->sid ) ) {        
        free( server );
        return NULL;
    }

    EXPLICIT_ACCESS access = { 0 };
    access.grfAccessPermissions = FILE_ALL_ACCESS;
    access.grfAccessMode = SET_ACCESS;
    access.grfInheritance = NO_INHERITANCE;
    access.Trustee.TrusteeForm = TRUSTEE_IS_SID;
    access.Trustee.TrusteeType = TRUSTEE_IS_WELL_KNOWN_GROUP;
    access.Trustee.ptstrName = (LPTSTR)server->sid;

    if( SetEntriesInAcl(1, &access, NULL, &server->acl) != ERROR_SUCCESS ) {
        FreeSid( server->sid );
        free( server );
        return NULL;
    }

    server->sd = (PSECURITY_DESCRIPTOR)LocalAlloc( LPTR, SECURITY_DESCRIPTOR_MIN_LENGTH );
    if( !server->sd ) {
        FreeSid( server->sid );
        free( server );
        return NULL;
    }

    if( !InitializeSecurityDescriptor( server->sd, SECURITY_DESCRIPTOR_REVISION ) ) {
        LocalFree(server->sd);
        FreeSid( server->sid );
        free( server );
        return NULL;
    }

    if( !SetSecurityDescriptorDacl( server->sd, TRUE, server->acl, FALSE ) ) {
        LocalFree( server->sd );
        FreeSid( server->sid );
        free( server );
        return NULL;
    }

    server->request_handler = request_handler;
    server->user_data = user_data;
    server->thread_started_event = CreateEvent( 
        NULL,               // default security attributes
        TRUE,               // manual-reset event
        FALSE,              // initial state is nonsignaled
        NULL                // object name
        ); 
    DWORD threadId = 0;
	server->thread = CreateThread( 
		NULL,                   // default security attributes
		0,                      // use default stack size  
		ipc_server_thread,      // thread function name
		server,          			// argument to thread function 
		0,                      // use default creation flags 
		&threadId );            // returns the thread identifier 
    if( server->thread == NULL ) {
        printf( "Failed to create server thread\n" ); 
        LocalFree( server->acl );
        LocalFree( server->sd );
        FreeSid( server->sid );
        free( server );
        return NULL;
    }

    if( WaitForSingleObject( server->thread_started_event, 10000 ) != WAIT_OBJECT_0 ) {
        printf( "Timeout waiting for client thread to start\n" ); 
        LocalFree( server->acl );
        LocalFree( server->sd );
        FreeSid( server->sid );
        free( server );
        return NULL;
    }
    return server;
}


void ipc_server_stop( ipc_server_t* server ) {
    server->exit_flag = 1;
    if( server->pipe != INVALID_HANDLE_VALUE ) {
        CancelIoEx( server->pipe, &server->io );
    }
    WaitForSingleObject( server->thread, INFINITE );
    LocalFree( server->acl );
    LocalFree( server->sd );
    FreeSid( server->sid );
    for( int i = 0; i < server->client_threads_count; ++i ) {
        if( !server->client_threads[ i ].recycle ) {
            ipc_stop_client_thread( &server->client_threads[ i ] );
        }
    }
    free( server );
}

#endif /* IPC_IMPLEMENTATION */
