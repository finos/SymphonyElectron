#ifndef ipc_h
#define ipc_h

#include <stdbool.h>
#include <stddef.h>

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

#ifndef IPC_LOG_INFO
    #define IPC_LOG_INFO printf( "\n" ), printf
#endif

#ifndef IPC_LOG_ERROR
    #define IPC_LOG_ERROR printf( "\n" ), printf
#endif

#ifndef IPC_LOG_LAST_ERROR
    #define IPC_LOG_LAST_ERROR printf( "\nLastError=%d : ", GetLastError() ), printf
#endif

// Named pipes are on the form "\\.\pipe\name" but we don't want the user to have
// to specify all that, so we expand what they pass in from "name" to "\\.\pipe\name"
bool expand_pipe_name( char const* pipe_name, char* buffer, size_t capacity ) {
    int result = snprintf( buffer, capacity, "\\\\.\\pipe\\%s", pipe_name );
    return result >= 0 && result < (int) capacity;
}

// Returns true if a pipe of the specified name exists, false if none exists
bool pipe_exists( const char* pipe_name ) {
    IPC_LOG_INFO( "Checking if pipe exists: %s", pipe_name );
    WIN32_FIND_DATAA data;
    memset( &data, 0, sizeof( data ) );

    HANDLE hfind = FindFirstFileA( "\\\\.\\pipe\\*", &data );
    if( hfind != INVALID_HANDLE_VALUE ) {
        do {
            char const* filename = data.cFileName;
            if( _stricmp( filename, pipe_name ) == 0 ) {
                FindClose( hfind );
                IPC_LOG_INFO( "Pipe found: %s", filename );
                return true;
            }
        } while( FindNextFileA( hfind, &data ) );
        FindClose( hfind );
    }

    IPC_LOG_ERROR( "Pipe not found" );
    return false;
}


// This holds data related to a single client instance
struct ipc_client_t {
   HANDLE pipe; // The named pipe to communicate over
};


// Establishes a connection to the specified named pipe
// Returns NULL if a connection could not be established
ipc_client_t* ipc_client_connect( char const* pipe_name ) {
    IPC_LOG_INFO( "Connecting to named pipe: %s", pipe_name );
    // Make sure a pipe with the specified name exists
    if( !pipe_exists( pipe_name ) ) {
        // Retry once if pipe was not found - this would be very rare, but will make it more robust
        IPC_LOG_INFO( "Pipe was not found, waiting a little and trying again" );
        Sleep( 1000 );
        if( !pipe_exists( pipe_name ) ) {
            IPC_LOG_INFO( "Pipe was still not found after waiting" );
            IPC_LOG_ERROR( "Named pipe does not exist" ); 
            return NULL;
        }
    }

    // Expand the pipe name to the valid form eg. "\\.\pipe\name"
    char expanded_pipe_name[ MAX_PATH ];
    IPC_LOG_INFO( "Expanding to fully qualified pipe name: %s", pipe_name );
    if( !expand_pipe_name( pipe_name, expanded_pipe_name, sizeof( expanded_pipe_name ) ) ) {
        IPC_LOG_ERROR( "Pipe name too long" ); 
        return NULL;
    }
    IPC_LOG_INFO( "Expanded pipe name: %s", expanded_pipe_name );

    // A named pipe has a maximum number of connections. When a client disconnect, it
    // can take a while for the disconnect to register on the server side, so we need
    // to handle the case where the pipe is busy. In practice, this should be rare,
    // but for robustness we handle it anyway.
    HANDLE pipe = NULL;
    for( ; ; ) { // This loop will typically not run more than two iterations, due to multiple exit points
        IPC_LOG_INFO( "Try to create connection" );
        pipe = CreateFileA( 
            expanded_pipe_name, // pipe name 
            GENERIC_READ |      // read and write access 
            GENERIC_WRITE, 
            0,                  // no sharing 
            NULL,               // default security attributes
            OPEN_EXISTING,      // opens existing pipe 
            0,                  // default attributes 
            NULL );             // no template file 
 
        // Break if the pipe handle is valid - a connection is now established
        if( pipe != INVALID_HANDLE_VALUE ) {
            IPC_LOG_INFO( "Connection attempt succeeded" );
            break; 
        }

        // Retry once if pipe was not found. Very rare that this would happen, but we're going for stability
        if( GetLastError() == ERROR_FILE_NOT_FOUND ) {
            IPC_LOG_INFO( "The pipe was not found, which was unexpected at this point, so we wait a little and try again" );
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
            
            // Break if the pipe handle is valid - a connection is now established
            if( pipe != INVALID_HANDLE_VALUE ) {
                IPC_LOG_INFO( "Second connection attempt succeeded" );
                break; 
            }
        }


        // If we get an error other than ERROR_PIPE_BUSY, we fail to establish a connection.
        // In the case of ERROR_PIPE_BUSY we will wait for the pipe not to be busy (see below)
        if( GetLastError() != ERROR_PIPE_BUSY ) {
            IPC_LOG_LAST_ERROR( "Could not open pipe: " ); 
            return NULL;
        }
 
        // All pipe instances are busy, so wait for 20 seconds. 
        IPC_LOG_INFO( "All pipe instances are busy, so we wait for 20 seconds and then try again" );
        if( !WaitNamedPipeA( expanded_pipe_name, 20000 ) )  { 
            IPC_LOG_INFO( "Wait failed" );
            // In the specific case of getting an ERROR_FILE_NOT_FOUND, we try doing the
            // wait one more time. The reason this would happen is if the server was just restarting
            // at the start of the call to ipc_client_connect, and thus the check if the pipe exist
            // passed, but when we got to the wait, the pipe was closed down and not yet started up
            // again. Waiting briefly and then trying again will ensure that we handle this rare case
            // of the server being restarted, but it will be very very rare.
            if( GetLastError() == ERROR_FILE_NOT_FOUND ) {
                // retry once just in case pipe was not created yet
                IPC_LOG_INFO( "Try the wait again after a short pause, in case it was just being created" );
                Sleep(1000);
                if( !WaitNamedPipeA( expanded_pipe_name, 20000 ) )  { 
                    IPC_LOG_LAST_ERROR( "Could not open pipe on second attempt: 20 second wait timed out: " ); 
                    return NULL;
                }
            } else {
                IPC_LOG_LAST_ERROR( "Could not open pipe: 20 second wait timed out: " ); 
                return NULL;
            }            
        } 
    } 

    // A fully working connection has been set up, return it to the caller
    IPC_LOG_INFO( "Connection successful" );
    ipc_client_t* connection = (ipc_client_t*) malloc( sizeof( ipc_client_t ) );
    connection->pipe = pipe;
    return connection;
}


// Disconnect the client from the server, and release the resources used by it
// This will allow the server to eventually recycle and reuse that connection slot,
// but in some cases it can take a brief period of time for that to happen
void ipc_client_disconnect( ipc_client_t* connection ) {
    IPC_LOG_INFO( "Disconnecting client" );
    FlushFileBuffers( connection->pipe ); 
    DisconnectNamedPipe( connection->pipe );
    CloseHandle( connection->pipe ); 
    free( connection );
    IPC_LOG_INFO( "Disconnection complete" );
}


// Wait for data to be available on the named pipe, and once it is, read it into the 
// provided buffer. Returns a status enum for success or failure, or for the case 
// where more data was cued up on the server side than could be received in one call,
// in which case the ipc_client_receive function should be called again to complete
// the retrieval of the message. The function will wait indefinitely, until either 
// a message is available, or the pipe is closed.
// TODO: consider a timeout for the wait, to allow for more robust client implementations
ipc_receive_status_t ipc_client_receive( ipc_client_t* connection, char* output, int output_size, int* received_size ) {
    IPC_LOG_INFO( "Reading data" );
    DWORD size_read = 0;
    BOOL success = ReadFile( 
        connection->pipe,   // pipe handle 
        output,             // buffer to receive reply 
        output_size,        // size of buffer 
        &size_read,         // number of bytes read 
        NULL );             // not overlapped 
 
    IPC_LOG_INFO( "Read returned %s", success ? "true" : "false" );
    if( !success && GetLastError() != ERROR_MORE_DATA ) {
        IPC_LOG_LAST_ERROR( "ReadFile from pipe failed: " );
        return IPC_RECEIVE_STATUS_ERROR;
    }
    
    IPC_LOG_INFO( "Data size received: %u", size_read );
    if( received_size ) {
        *received_size = size_read;
    }

    if( success ) {
        IPC_LOG_INFO( "Read done" );
        return IPC_RECEIVE_STATUS_DONE;
    } else {
        IPC_LOG_INFO( "More data to be read" );
        return IPC_RECEIVE_STATUS_MORE_DATA;
    }
}


// Sends the specified message (as a zero-terminated string) to the server
// Will wait for the server to receive the message, and how long that wait
// is will depend on if the server is busy when the message is sent.
// TODO: consider a timeout for the wait, to allow for more robust client implementations
bool ipc_client_send( ipc_client_t* connection, char const* message ) {
    // Send a message to the pipe server. 
    IPC_LOG_INFO( "Sending data" );
    DWORD written = 0;
    BOOL success = WriteFile( 
        connection->pipe,               // pipe handle 
        message,                        // message 
        (DWORD) strlen( message ) + 1,  // message length 
        &written,                       // bytes written 
        NULL );                         // not overlapped 

    IPC_LOG_INFO( "Write returned %s", success ? "true" : "false" );
    if( !success ) {
        IPC_LOG_LAST_ERROR( "WriteFile to pipe failed: " ); 
        return false;
    }

    return true;
}


// This holds the data for a single server-side client thread
typedef struct ipc_client_thread_t {
    BOOL recycle;   // When a client disconnect, this flag is set to TRUE so the slot can be reused 
    ipc_request_handler_t request_handler; // When a request is recieved from a client, the server calls this handler
    void* user_data; // When the request_handler is called, this user_data field is passed along with it
    int exit_flag; // Set by the server to signal that the client thread should exit
    HANDLE thread; // Handle to this client thread, used by server to wait for it to exit (on server shutdown)
    HANDLE pipe; // The named pipe instance allocated to this client
    OVERLAPPED io; // We are using non-blocking I/O so the server can cancel pending read/write operations on shutdown
} ipc_client_thread_t;


// Typically, we should only ever have one connections, so this is probably overkill, but
// it doesn't hurt
#define MAX_CLIENT_CONNECTIONS 32


// This holds the data for an ipc server instance
struct ipc_server_t {
    char expanded_pipe_name[ MAX_PATH ]; // Holds the result of expanding from the "name" form to the "\\.\pipe\name" form
    HANDLE thread; // Handle to the main server thread, used to wait for thread exit on server shutdown
    HANDLE thread_started_event; // When the main server thread is started, ipc_server_start needs to wait until it is ready to accept connections before returning to the caller
    HANDLE pipe; // The server pipe instance currently used to listen for connections, will be handed to client thread when connection is made
    OVERLAPPED io; // We are using non-blocking I/O so the server can cancel pending ConnectNamedPipe operations on shutdown
    int exit_flag; // Set by the ipc_server_stop to signal that the main server thread should exit
    ipc_request_handler_t request_handler; // When a request is recieved from a client, the server calls this handler
    void* user_data; // When the request_handler is called, this user_data field is passed along with it
    ipc_client_thread_t client_threads[ MAX_CLIENT_CONNECTIONS ]; // Array of client instances, an instance is only in use if its `recycle` flag is FALSE
    int client_threads_count; // Number of slots used on the `client_threads` array (but a slot may or may not be in use depending on its `recycle` flag)
};


// When a client connects to the server, the server creates a new thread to handle that connection,
// and this is the function running on that thread. It basically just sits in a loop, doing a Read 
// from the pipe and waiting until it gets a message. Then it will call the user supplied request 
// handler, and then it does a Write on the pipe to send the response it got from the request handler
// to the pipe.
DWORD WINAPI ipc_client_thread( LPVOID param ) {
    IPC_LOG_INFO( "[%u] Client thread started", GetCurrentThreadId() );
    
    ipc_client_thread_t* context = (ipc_client_thread_t*) param;

    // Create the event used to wait for Read/Write operations to complete
    HANDLE io_event = CreateEvent( 
            NULL,   // default security attributes
            TRUE,   // manual-reset event
            FALSE,  // initial state is nonsignaled
            NULL    // object name
            ); 

    // Main request-response loop. Will run until exit requested or an eror occurs 
    IPC_LOG_INFO( "[%u] Enter client thread main loop", GetCurrentThreadId() );
    while( !context->exit_flag ) { 
        // Read loop, keeps trying to read until data arrives or an error occurs (including a shutdown 
        // cancelling the read operation)
        char request[ IPC_MESSAGE_MAX_LENGTH ]; // buffer to hold incoming data
        DWORD bytes_read = 0;
        BOOL success = FALSE;
        bool read_pending = true;
        IPC_LOG_INFO( "[%u] Starting read loop", GetCurrentThreadId() );
        while( read_pending ) {
            // Set up non-blocking I/O
            memset( &context->io, 0, sizeof( context->io ) );
            ResetEvent( io_event );
            context->io.hEvent = io_event;
            // Read client requests from the pipe in a non-blocking call
            IPC_LOG_INFO( "[%u] Reading from pipe", GetCurrentThreadId() );
            success = ReadFile( 
                context->pipe,          // handle to pipe 
                request,                // buffer to receive data 
                IPC_MESSAGE_MAX_LENGTH, // size of buffer 
                &bytes_read,            // number of bytes read 
                &context->io );         // overlapped I/O 
            
            IPC_LOG_INFO( "[%u] Read returned: %s", GetCurrentThreadId(), success ? "true" : "false" );
            // Check if the Read operation is in progress (ReadFile returns FALSE and the error is ERROR_IO_PENDING )
            if( !success && GetLastError() == ERROR_IO_PENDING ) {
                IPC_LOG_INFO( "[%u] Pipe is in IO_PENDING state, read is in progress", GetCurrentThreadId() );
                // Wait for the event to be triggered, but timeout after half a second and re-issue the Read
                // This is so the re-issued Read can detect if the pipe have been closed, and thus exit the thread
                IPC_LOG_INFO( "[%u] Wait for read to complete", GetCurrentThreadId() );
                if( WaitForSingleObject( io_event, 500 ) == WAIT_TIMEOUT ) {
                    IPC_LOG_INFO( "[%u] Read timed out, try again", GetCurrentThreadId() );
                    CancelIoEx( context->pipe, &context->io );
                    continue; // Make another Read call
                }
                
                // The wait did not timeout, so the Read operation should now be completed (or failed)
                IPC_LOG_INFO( "[%u] Read completed, checking result", GetCurrentThreadId() );
                success = GetOverlappedResult( 
                    context->pipe,  // handle to pipe 
                    &context->io,   // OVERLAPPED structure 
                    &bytes_read,    // bytes transferred 
                    FALSE );        // don't wait 
                IPC_LOG_INFO( "[%u] Read was %s", GetCurrentThreadId(), success ? "successful" : "unsuccessful" );
                IPC_LOG_INFO( "[%u] Bytes read %u", GetCurrentThreadId(), bytes_read );
            }

            // The read have completed (successfully or not) so exit the read loop
            read_pending = false;
        }
        IPC_LOG_INFO( "[%u] Finished read loop, result was %s", GetCurrentThreadId(), success ? "success" : "failure" );

 
        // If the Read was unsuccessful (or read no data), log the error and exit the thread
        // TODO: consider if there are better ways to deal with the error. There might not be,
        // but then the user-code calling client send/receive might need some robust retry code
        if( !success || bytes_read == 0 ) {   
            if( GetLastError() == ERROR_BROKEN_PIPE ) {
                IPC_LOG_INFO( "[%u] Client disconnected", GetCurrentThreadId() );
            } else {
                IPC_LOG_LAST_ERROR( "ReadFile failed: " ); 
            }
            break;
        }

        // Check if a server shutdown have requested this thread to be terminated, and exit if that's the case
        if( context->exit_flag ) {
            IPC_LOG_INFO( "[%u] Server shutdown requested, terminating thread", GetCurrentThreadId() );
            break;
        }

        IPC_LOG_INFO( "[%u] Incoming message: %s", GetCurrentThreadId(), request );

        // Process the incoming message by calling the user-supplied request handler function
        char response[ IPC_MESSAGE_MAX_LENGTH ];
        memset( response, 0, sizeof( response ) );
        IPC_LOG_INFO( "[%u] Processing message", GetCurrentThreadId() );
        context->request_handler( request, context->user_data, response, sizeof( response ) ); 
        response[ sizeof( response ) - 1 ] = '\0'; // Force zero termination (truncate string)
        IPC_LOG_INFO( "[%u] Outgoing response: \"%.32s%s\"", GetCurrentThreadId(), response, strlen( response ) > 32 ? "..." : "" );
        DWORD response_length = (DWORD)strlen( response ) + 1; 
        IPC_LOG_INFO( "[%u] Response length: %u", GetCurrentThreadId(), response_length );
 
        // Write the reply to the pipe
        DWORD bytes_written = 0; 
        IPC_LOG_INFO( "[%u] Sending response", GetCurrentThreadId() );
        success = WriteFile( 
            context->pipe,      // handle to pipe 
            response,           // buffer to write from 
            response_length,    // number of bytes to write 
            &bytes_written,     // number of bytes written 
            &context->io );     // overlapped I/O 

        IPC_LOG_INFO( "[%u] Write returned: %s", GetCurrentThreadId(), success ? "true" : "false" );

        // If the write operation is in progress, we wait until it is done, or aborted due to server shutdown
        if( success || GetLastError() == ERROR_IO_PENDING ) {
            IPC_LOG_INFO( "[%u] Pipe is in IO_PENDING state, write is in progress", GetCurrentThreadId() );
            success = GetOverlappedResult( 
                context->pipe,  // handle to pipe 
                &context->io,   // OVERLAPPED structure 
                &bytes_written, // bytes transferred 
                TRUE );         // wait 
            IPC_LOG_INFO( "[%u] Write was %s", GetCurrentThreadId(), success ? "successful" : "unsuccessful" );
            IPC_LOG_INFO( "[%u] Bytes written %u", GetCurrentThreadId(), bytes_written );
        }

        // If the Write was unsuccessful (or didn't manage to write the whole buffer), log the error and exit the thread
        if( !success || bytes_written != response_length ) {   
            IPC_LOG_LAST_ERROR( "WriteFile failed: " ); 
            break;
        }
    }
    IPC_LOG_INFO( "[%u] Finished client thread main loop", GetCurrentThreadId() );

    // Signal that a disconnect has happened
    context->request_handler( NULL, context->user_data, NULL, 0 ); 
   
    // Flush the pipe to allow the client to read the pipe's contents 
    // before disconnecting. Then disconnect the pipe, and close the 
    // handle to this pipe instance. 
    CloseHandle( io_event );
    FlushFileBuffers( context->pipe ); 
    DisconnectNamedPipe( context->pipe ); 
    CloseHandle( context->pipe ); 
    
    // Mark this client slot for recycling for new connections
    context->pipe = INVALID_HANDLE_VALUE;
    context->recycle = TRUE;
    IPC_LOG_INFO( "[%u] Client thread terminated", GetCurrentThreadId() );
    return EXIT_SUCCESS;
}


// When the `ipc_server_start` is called, it creates this thread which sits in a loop
// and listens for new client connections, until exit is requested by a call to
// `ipc_server_stop`. When a new connection is made, it will start another thread to
// handle the I/O for that specific client. Then it will open a new listening pipe
// instance for further connections.
DWORD WINAPI ipc_server_thread( LPVOID param ) { 
    IPC_LOG_INFO( "[%u] Server thread started", GetCurrentThreadId() );
    ipc_server_t* server = (ipc_server_t*) param;

    // Create security attribs, we need this so the server can run in session 0
    // while client runs as a normal user session
    SID_IDENTIFIER_AUTHORITY auth = { SECURITY_WORLD_SID_AUTHORITY };
    PSID sid;
    if( !AllocateAndInitializeSid( &auth, 1, SECURITY_WORLD_RID, 0, 0, 0, 0, 0, 0, 0, &sid ) ) {        
        IPC_LOG_LAST_ERROR( "AllocateAndInitializeSid failed: " );
        IPC_LOG_INFO( "[%u] Server thread terminated", GetCurrentThreadId() );
        return EXIT_FAILURE;
    }
    EXPLICIT_ACCESS access = { 0 };
    access.grfAccessPermissions = FILE_ALL_ACCESS;
    access.grfAccessMode = SET_ACCESS;
    access.grfInheritance = NO_INHERITANCE;
    access.Trustee.TrusteeForm = TRUSTEE_IS_SID;
    access.Trustee.TrusteeType = TRUSTEE_IS_WELL_KNOWN_GROUP;
    access.Trustee.ptstrName = (LPTSTR)sid;
    PACL acl;
    if( SetEntriesInAcl(1, &access, NULL, &acl) != ERROR_SUCCESS ) {
        IPC_LOG_LAST_ERROR( "SetEntriesInAcl failed: " );
        FreeSid(sid);
        IPC_LOG_INFO( "[%u] Server thread terminated", GetCurrentThreadId() );
        return EXIT_FAILURE;
    }
    PSECURITY_DESCRIPTOR sd = (PSECURITY_DESCRIPTOR)LocalAlloc( LPTR, SECURITY_DESCRIPTOR_MIN_LENGTH );
    if( !sd ) {
        IPC_LOG_ERROR( "LocalAlloc failed" );
        FreeSid( sid );
        IPC_LOG_ERROR( "[%u] Server thread terminated", GetCurrentThreadId() );
        return EXIT_FAILURE;
    }
    if( !InitializeSecurityDescriptor( sd, SECURITY_DESCRIPTOR_REVISION ) ) {
        IPC_LOG_LAST_ERROR( "InitializeSecurityDescriptor failed: " );
        LocalFree(sd);
        FreeSid(sid);
        IPC_LOG_ERROR( "[%u] Server thread terminated", GetCurrentThreadId() );
        return EXIT_FAILURE;
    }
    if( !SetSecurityDescriptorDacl( sd, TRUE, acl, FALSE ) ) {
        IPC_LOG_LAST_ERROR( "SetSecurityDescriptorDacl failed: " );
        LocalFree( sd );
        FreeSid( sid );
        IPC_LOG_ERROR( "[%u] Server thread terminated", GetCurrentThreadId() );
        return EXIT_FAILURE;
    }
    SECURITY_ATTRIBUTES attribs;
    attribs.nLength = sizeof( SECURITY_ATTRIBUTES );
    attribs.lpSecurityDescriptor = sd;
    attribs.bInheritHandle = -1;
  
    // Create the event used to wait for ConnectNamedPipe operations to complete
    HANDLE io_event = CreateEvent( 
            NULL,   // default security attributes
            TRUE,   // manual-reset event
            FALSE,  // initial state is nonsignaled
            NULL    // object name
            ); 

    // The main loop creates an instance of the named pipe and then waits for a client 
    // to connect to it. When the client connects, a thread is created to handle 
    // communications with that client, and this loop is free to wait for the next client
    // connect request
    IPC_LOG_INFO( "[%u] Enter server thread main loop", GetCurrentThreadId() );
    bool event_raised = false; // We make sure to only raise the server-thread-is-ready event once
    while( !server->exit_flag ) { 
        // Create a pipe instance to listen for connections
        IPC_LOG_INFO( "[%u] Creating named pipe listening for connections", GetCurrentThreadId() );
        server->pipe = CreateNamedPipeA( 
            server->expanded_pipe_name,// pipe name 
            PIPE_ACCESS_DUPLEX |      // read/write access 
            FILE_FLAG_OVERLAPPED,     // we use async I/O so that we can cancel ConnectNamedPipe operations
            PIPE_TYPE_MESSAGE |       // message type pipe 
            PIPE_READMODE_MESSAGE |   // message-read mode 
            PIPE_WAIT,                // blocking mode 
            MAX_CLIENT_CONNECTIONS,   // max. instances  
            IPC_MESSAGE_MAX_LENGTH,   // output buffer size 
            IPC_MESSAGE_MAX_LENGTH,   // input buffer size 
            0,                        // client time-out 
            &attribs );               // default security attribute 

        // If we failed to create the pipe, we log the error and exit
        // TODO: Should we handle this some other way? perhaps report the error back to user
        if( server->pipe == INVALID_HANDLE_VALUE ) {
           
            // If the failure was due to pipe busy, try again in a bit
            if( GetLastError() == ERROR_PIPE_BUSY ) {
                IPC_LOG_LAST_ERROR( "CreateNamedPipe failed: " ); 
                IPC_LOG_INFO( "[%u] Pipe was busy, waiting a bit then trying once more.", GetCurrentThreadId() ); 
                Sleep(1000);

                server->pipe = CreateNamedPipeA( 
                    server->expanded_pipe_name,// pipe name 
                    PIPE_ACCESS_DUPLEX |      // read/write access 
                    FILE_FLAG_OVERLAPPED,     // we use async I/O so that we can cancel ConnectNamedPipe operations
                    PIPE_TYPE_MESSAGE |       // message type pipe 
                    PIPE_READMODE_MESSAGE |   // message-read mode 
                    PIPE_WAIT,                // blocking mode 
                    MAX_CLIENT_CONNECTIONS,   // max. instances  
                    IPC_MESSAGE_MAX_LENGTH,   // output buffer size 
                    IPC_MESSAGE_MAX_LENGTH,   // input buffer size 
                    0,                        // client time-out 
                    &attribs );               // default security attribute 
            }

            if( server->pipe == INVALID_HANDLE_VALUE ) {
                IPC_LOG_LAST_ERROR( "CreateNamedPipe failed: " ); 

                LocalFree( acl );
                LocalFree( sd );
                FreeSid( sid );
                IPC_LOG_ERROR( "[%u] Server thread terminated", GetCurrentThreadId() );
                return EXIT_FAILURE;
            }
        }
 
        // Signal to `ipc_server_start` that the server thread is now fully up and
        // running and accepting connections
        if( !event_raised ) {
            IPC_LOG_INFO( "[%u] Signaling to ipc_server_start that init is complete and we are now listening", GetCurrentThreadId() );
            SetEvent( server->thread_started_event );
            event_raised = true; // Make sure we don't signal the event again
        }

        // Wait for the client to connect, using async I/O operation, so ConnectNamedPipe returns immediately
        memset( &server->io, 0, sizeof( server->io ) );
        server->io.hEvent = io_event;     
        IPC_LOG_INFO( "[%u] Wait for client to connect", GetCurrentThreadId() );
        ConnectNamedPipe( server->pipe, &server->io );
        if( GetLastError() == ERROR_IO_PENDING ) {
            for( ; ; ) {
                if( WaitForSingleObject( server->io.hEvent, 100 ) == WAIT_OBJECT_0 ) {
                    IPC_LOG_INFO( "[%u] Connection completed", GetCurrentThreadId() );
                    break;
                }
                if( server->exit_flag ) {
                    IPC_LOG_INFO( "[%u] Server shutdown requested", GetCurrentThreadId() );
                    break;
                }
            }
        } else if( GetLastError() != ERROR_PIPE_CONNECTED ) {
            if( GetLastError() != ERROR_OPERATION_ABORTED || server->exit_flag == 0 ) {
                // The client could not connect, so close the pipe. 
                IPC_LOG_LAST_ERROR( "Connection failed: " ); 
                break; 
            }
        }

        // Check if a server shutdown have requested this thread to be terminated, and exit if that's the case
        if( server->exit_flag ) {
            IPC_LOG_INFO( "[%u] Server shutdown requested, breaking main loop", GetCurrentThreadId() );
            break;
        }
        
        IPC_LOG_INFO( "[%u] Client connected, setting up client thread to handle it", GetCurrentThreadId() );

        // Find a free client slot to recycle for this new client connection
        ipc_client_thread_t* context = NULL;
        for( int i = 0; i < server->client_threads_count; ++i ) {
            if( server->client_threads[ i ].recycle ) {
                context = &server->client_threads[ i ];
            }
        }

        // If there is no free slot to recycle, use a new slot if available
        if( !context ) {
            IPC_LOG_INFO( "[%u] No free slot to recycle, allocating a new slot", GetCurrentThreadId() );
            if( server->client_threads_count < MAX_CLIENT_CONNECTIONS ) {
                context = &server->client_threads[ server->client_threads_count++ ];
            } else {
                IPC_LOG_ERROR( "[%u] Maximum number of connectsions reached - client should have been held in wait state, and this error should never have been triggered", GetCurrentThreadId() );
                // If we already reached the maximum number of connections, we have to bail out
                // This shouldn't really happen though, as the client should be kept in the wait
                // state by the pipe itself which is specified to accept only the same number of
                // connections
                // TODO: Perhaps better to just silently refuse the connection but stay alive?
                //       or maybe kill the connection that has been idle for the longest time?
                IPC_LOG_INFO( "[%u] Too many connections", GetCurrentThreadId() );
                LocalFree( acl );
                LocalFree( sd );
                FreeSid( sid );
                if( server->pipe != INVALID_HANDLE_VALUE ) {
                    CloseHandle( server->pipe );
                    server->pipe = INVALID_HANDLE_VALUE;
                }
                CloseHandle( io_event );
                IPC_LOG_ERROR( "[%u] Server thread terminated", GetCurrentThreadId() );
                return EXIT_FAILURE;
            }
        }        

        // Initialize the client slot
        IPC_LOG_INFO( "[%u] Initializing client slot", GetCurrentThreadId() );
        memset( context, 0, sizeof( *context ) );
        context->request_handler = server->request_handler;
        context->user_data = server->user_data;
        context->pipe = server->pipe;
         
        // We are handing the pipe over to the client thread, but will be creating a new one on
        // the next iteration through the loop
        server->pipe = INVALID_HANDLE_VALUE;
        
        // Create a dedicated thread to handle this connection
        IPC_LOG_INFO( "[%u] Creating the client thread", GetCurrentThreadId() );
        context->thread = CreateThread( 
            NULL,              // no security attribute 
            0,                 // default stack size 
            ipc_client_thread, // thread proc
            (LPVOID) context,  // thread parameter 
            0,                 // not suspended 
            NULL );            // returns thread ID 

        // If we failed to create thread, something's gone very wrong, so we need to bail
        if( context->thread == NULL ) {
            IPC_LOG_LAST_ERROR( "CreateThread failed: " ); 
            LocalFree( acl );
            LocalFree( sd );
            FreeSid( sid );
            if( server->pipe != INVALID_HANDLE_VALUE ) {
                CloseHandle( server->pipe );
                server->pipe = INVALID_HANDLE_VALUE;
            }
            CloseHandle( io_event );
            IPC_LOG_ERROR( "[%u] Server thread terminated", GetCurrentThreadId() );
            return EXIT_FAILURE;
        }
    } 
    IPC_LOG_INFO( "[%u] Finished server thread main loop", GetCurrentThreadId() );


    // Cleanup thread resources before we exit
    LocalFree( acl );
    LocalFree( sd );
    FreeSid( sid );

    if( server->pipe != INVALID_HANDLE_VALUE ) {
        CloseHandle( server->pipe );
        server->pipe = INVALID_HANDLE_VALUE;
    }

    CloseHandle( io_event );
    IPC_LOG_INFO( "[%u] Server thread terminated by request", GetCurrentThreadId() );
    return EXIT_SUCCESS;
} 


// Starts a named pipe server with the specified pipe name, and starts listening for 
// client connections on a separate thread, so will return immediately. The server
// thread will keep listening for connections until `ipc_server_stop` is called.
ipc_server_t* ipc_server_start( char const* pipe_name, ipc_request_handler_t request_handler, void* user_data ) {
    IPC_LOG_INFO( "Starting named pipe server: %s", pipe_name );

    // Allocate the server instance and initialize it
    ipc_server_t* server = (ipc_server_t*) malloc( sizeof( ipc_server_t ) );
    memset( server, 0, sizeof( ipc_server_t ) );
    server->pipe = INVALID_HANDLE_VALUE;
    server->request_handler = request_handler;
    server->user_data = user_data;

    // Expand the pipe name to the valid form eg. "\\.\pipe\name"
    IPC_LOG_INFO( "Expanding to fully qualified pipe name: %s", pipe_name );
    if( !expand_pipe_name( pipe_name, server->expanded_pipe_name, sizeof( server->expanded_pipe_name ) ) ) {
        IPC_LOG_ERROR( "Pipe name too long" ); 
        free( server );
        return NULL;
    }
    IPC_LOG_INFO( "Expanded pipe name: %s", server->expanded_pipe_name );

    // Create the event used by the server thread to signal that it is up and running and accepting connections
    server->thread_started_event = CreateEvent( 
        NULL,   // default security attributes
        TRUE,   // manual-reset event
        FALSE,  // initial state is nonsignaled
        NULL    // object name
        ); 

    // Start the server thread which accepts connections and starts dedicated client threads for each new connection
    IPC_LOG_INFO( "Starting server thread" );
	server->thread = CreateThread( 
		NULL,                   // default security attributes
		0,                      // use default stack size  
		ipc_server_thread,      // thread function name
		server,          		// argument to thread function 
		0,                      // use default creation flags 
		NULL );                 // returns the thread identifier 

    // If thread creation failed, return error
    if( server->thread == NULL ) {
        IPC_LOG_LAST_ERROR( "Failed to create server thread: " ); 
        CloseHandle( server->thread_started_event );
        free( server );
        return NULL;
    }

    // Wait for the server thread to be up and running and accepting connections
    IPC_LOG_INFO( "Waiting for server thread to be initialized" );
    if( WaitForSingleObject( server->thread_started_event, 10000 ) != WAIT_OBJECT_0 ) {
        // If it takes more than 10 seconds for the server thread to start up, something
        // has gone very wrong so we abort and return an error
        IPC_LOG_LAST_ERROR( "Timeout waiting for client thread to start: " ); 
        CloseHandle( server->thread_started_event );
        TerminateThread( server->thread, EXIT_FAILURE );
        free( server );
        return NULL;
    }

    IPC_LOG_INFO( "Server up and running" );
    // Return the fully set up and ready server instance
    return server;
}


// Signals the server thread to stop, cancels all pending I/O operations on all
// client threads, and release the resources used by the server
void ipc_server_stop( ipc_server_t* server ) {
    IPC_LOG_INFO( "Stopping named pipe server" );
    server->exit_flag = 1; // Signal server thread top stop
    if( server->pipe != INVALID_HANDLE_VALUE ) {
        CancelIoEx( server->pipe, &server->io ); // Cancel pending ConnectNamedPipe operatios, if any
    }
    IPC_LOG_INFO( "Waiting for server thread to exit" );
    WaitForSingleObject( server->thread, INFINITE ); // Wait for server thread to exit
    IPC_LOG_INFO( "Server thread stopped" );

    // Loop over all clients and terminate each one
    IPC_LOG_INFO( "Terminating client connections" );
    for( int i = 0; i < server->client_threads_count; ++i ) {
        ipc_client_thread_t* client = &server->client_threads[ i ];
        if( !client->recycle ) { // A slot is only valid if `recycle` is FALSE
            client->exit_flag = 1; // Tell client thread to exit
            CancelIoEx( client->pipe, &client->io ); // Cancel any pending Read/Write operation
            WaitForSingleObject( client->thread, INFINITE ); // Wait for client thread to exit
        }
    }

    // Free server resources
    CloseHandle( server->thread_started_event );
    free( server );
    IPC_LOG_INFO( "Server stopped and terminated" );
}

#endif /* IPC_IMPLEMENTATION */
