

bool pipe_exists( const char* pipe_name ) {
    WIN32_FIND_DATA data;
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

#define PIPE_NAME "\\\\.\\pipe\\symphony_sda_auto_update_ipc"
#define BUFSIZE 512

struct ipc_client_t {
   HANDLE pipe; 
};


ipc_client_t* ipc_client_connect() {
    if( !pipe_exists( PIPE_NAME ) ) {
        printf( "Named pipe does not exits\n" ); 
        return NULL;
    }

    HANDLE pipe = NULL;
    for( ; ; ) { // Keep trying to connect while pipe is busy
        pipe = CreateFile( 
            PIPE_NAME,      // pipe name 
            GENERIC_READ |  // read and write access 
            GENERIC_WRITE, 
            0,              // no sharing 
            NULL,           // default security attributes
            OPEN_EXISTING,  // opens existing pipe 
            0,              // default attributes 
            NULL );         // no template file 
 
        // Break if the pipe handle is valid. 
        if( pipe != INVALID_HANDLE_VALUE ) {
            break; 
        }
 
        // Exit if an error other than ERROR_PIPE_BUSY occurs. 
        if( GetLastError() != ERROR_PIPE_BUSY ) {
            printf( "Could not open pipe. LastError=%d\n", GetLastError() ); 
            return NULL;
        }
 
        // All pipe instances are busy, so wait for 20 seconds. 
        if( !WaitNamedPipe( PIPE_NAME, 20000 ) )  { 
            printf( "Could not open pipe: 20 second wait timed out." ); 
            return NULL;
        } 
    } 

    ipc_client_t* connection = new ipc_client_t();
    connection->pipe = pipe;
    return connection;
}


void ipc_client_disconnect( ipc_client_t* connection ) {
    CloseHandle( connection->pipe ); 
    delete connection;
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

enum ipc_receive_status_t {
    IPC_RECEIVE_STATUS_DONE,
    IPC_RECEIVE_STATUS_MORE_DATA,
    IPC_RECEIVE_STATUS_ERROR,
};

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


// This routine is a simple function to print the client request to the console
// and populate the reply buffer with a default data string. This is where you
// would put the actual client request processing code that runs in the context
// of an instance thread. Keep in mind the main thread will continue to wait for
// and receive other client connections while the instance thread is working.
VOID run_installer( LPSTR pchRequest, LPSTR pchReply, LPDWORD pchBytes ) {
    printf( "Client Request String:\"%s\"\n", pchRequest );

	char command[ 512 ];
	sprintf( command, "/i %s /q", pchRequest );

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

    strcpy( pchReply, "OK" );
    *pchBytes = (DWORD)( ( strlen( pchReply ) + 1 ) * sizeof( CHAR ) );
}



struct ipc_server_t {
    HANDLE thread;
};


// This routine is a thread processing function to read from and reply to a client
// via the open pipe connection passed from the main loop. Note this allows
// the main loop to continue executing, potentially creating more threads of
// this procedure to run concurrently, depending on the number of incoming
// client connections.
DWORD WINAPI ipc_client_thread( LPVOID param ) {
    HANDLE hHeap      = GetProcessHeap();
    CHAR* pchRequest = (CHAR*) HeapAlloc( hHeap, 0, BUFSIZE * sizeof( CHAR ) );
    CHAR* pchReply   = (CHAR*) HeapAlloc( hHeap, 0, BUFSIZE * sizeof( CHAR ) );

    DWORD cbBytesRead = 0, cbReplyBytes = 0, cbWritten = 0; 

    // Do some extra error checking since the app will keep running even if this
    // thread fails.

    if( param == NULL ) {
        printf( "\nERROR - Pipe Server Failure:\n" );
        printf( "   ipc_client_thread got an unexpected NULL value in lpvParam.\n" );
        printf( "   ipc_client_thread exitting.\n" );
        if( pchReply != NULL ) {
            HeapFree( hHeap, 0, pchReply );
        }
        if( pchRequest != NULL ) {
            HeapFree( hHeap, 0, pchRequest );
        }
        return EXIT_FAILURE;
    }

    if( pchRequest == NULL ) {
        printf( "\nERROR - Pipe Server Failure:\n" );
        printf( "   ipc_client_thread got an unexpected NULL heap allocation.\n" );
        printf( "   ipc_client_thread exitting.\n" );
        if( pchReply != NULL ) {
            HeapFree( hHeap, 0, pchReply );
        }
        return EXIT_FAILURE;
    }

    if( pchReply == NULL ) {
        printf( "\nERROR - Pipe Server Failure:\n");
        printf( "   ipc_client_thread got an unexpected NULL heap allocation.\n" );
        printf( "   ipc_client_thread exitting.\n");
        if( pchRequest != NULL ) {
            HeapFree( hHeap, 0, pchRequest );
        }
        return EXIT_FAILURE;
    }

    // Print verbose messages. In production code, this should be for debugging only.
    printf( "ipc_client_thread created, receiving and processing messages.\n" );

    // The thread's parameter is a handle to a pipe object instance. 
    HANDLE hPipe = (HANDLE) param; 

    // Loop until done reading
    for( ; ; ) { 
        // Read client requests from the pipe. This simplistic code only allows messages
        // up to BUFSIZE characters in length.
        BOOL fSuccess = ReadFile( 
            hPipe,                      // handle to pipe 
            pchRequest,                 // buffer to receive data 
            BUFSIZE * sizeof( CHAR ),   // size of buffer 
            &cbBytesRead,               // number of bytes read 
            NULL );                     // not overlapped I/O 

        if( !fSuccess || cbBytesRead == 0 ) {   
            if (GetLastError() == ERROR_BROKEN_PIPE) {
                printf( "ipc_client_thread: client disconnected.\n" ); 
            } else {
                printf( "ipc_client_thread ReadFile failed, LastError=%d.\n", GetLastError() ); 
            }
            break;
        }

        // Process the incoming message.
        run_installer( pchRequest, pchReply, &cbReplyBytes ); 
 
        // Write the reply to the pipe. 
        fSuccess = WriteFile( 
            hPipe,          // handle to pipe 
            pchReply,       // buffer to write from 
            cbReplyBytes,   // number of bytes to write 
            &cbWritten,     // number of bytes written 
            NULL );         // not overlapped I/O 

        if( !fSuccess || cbReplyBytes != cbWritten ) {   
            printf( ("ipc_client_thread WriteFile failed, LastError=%d.\n"), GetLastError()); 
            break;
        }
    }

    // Flush the pipe to allow the client to read the pipe's contents 
    // before disconnecting. Then disconnect the pipe, and close the 
    // handle to this pipe instance. 
 
    FlushFileBuffers( hPipe ); 
    DisconnectNamedPipe( hPipe ); 
    CloseHandle( hPipe ); 

    HeapFree( hHeap, 0, pchRequest );
    HeapFree( hHeap, 0, pchReply );

    printf( "ipc_client_thread exiting.\n" );
    return EXIT_SUCCESS;
}


DWORD WINAPI ipc_server_thread( LPVOID param ) { 
    ipc_server_t* server = (ipc_server_t*) param;

    // TODO: logging
    //fp = fopen( "C:\\auto_update_poc\\log.txt", "w" );
    //setvbuf(fp, NULL, _IONBF, 0);

    // Create security attribs
    SID_IDENTIFIER_AUTHORITY auth = { SECURITY_WORLD_SID_AUTHORITY };
    PSID sid;
    if( !AllocateAndInitializeSid( &auth, 1, SECURITY_WORLD_RID, 0, 0, 0, 0, 0, 0, 0, &sid ) ) {        
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
        FreeSid(sid);
        return EXIT_FAILURE;
    }

    PSECURITY_DESCRIPTOR sd = (PSECURITY_DESCRIPTOR)LocalAlloc( LPTR, SECURITY_DESCRIPTOR_MIN_LENGTH );
    if( !sd ) {
        FreeSid( sid );
        return EXIT_FAILURE;
    }

    if( !InitializeSecurityDescriptor( sd, SECURITY_DESCRIPTOR_REVISION ) ) {
        LocalFree(sd);
        FreeSid(sid);
        return EXIT_FAILURE;
    }

    if( !SetSecurityDescriptorDacl( sd, TRUE, acl, FALSE ) ) {
        LocalFree( sd );
        FreeSid( sid );
        return EXIT_FAILURE;
    }

    SECURITY_ATTRIBUTES attribs;
    attribs.nLength = sizeof( SECURITY_ATTRIBUTES );
    attribs.lpSecurityDescriptor = sd;
    attribs.bInheritHandle = -1;

   
    // The main loop creates an instance of the named pipe and 
    // then waits for a client to connect to it. When the client 
    // connects, a thread is created to handle communications 
    // with that client, and this loop is free to wait for the
    // next client connect request. It is an infinite loop.
   
    for( ; ; ) { 
        printf( "\nPipe Server: Main thread awaiting client connection on %s\n", PIPE_NAME );
        HANDLE hPipe = CreateNamedPipe( 
            PIPE_NAME,                // pipe name 
            PIPE_ACCESS_DUPLEX,       // read/write access 
            PIPE_TYPE_MESSAGE |       // message type pipe 
            PIPE_READMODE_MESSAGE |   // message-read mode 
            PIPE_WAIT,                // blocking mode 
            PIPE_UNLIMITED_INSTANCES, // max. instances  
            BUFSIZE,                  // output buffer size 
            BUFSIZE,                  // input buffer size 
            0,                        // client time-out 
            &attribs );               // default security attribute 

        if( hPipe == INVALID_HANDLE_VALUE ) {
            printf( "CreateNamedPipe failed, LastError=%d.\n", GetLastError() ); 
            LocalFree( acl );
            LocalFree( sd );
            FreeSid( sid );
            return EXIT_FAILURE;
        }
 
        // Wait for the client to connect; if it succeeds, 
        // the function returns a nonzero value. If the function
        // returns zero, GetLastError returns ERROR_PIPE_CONNECTED. 
 
        BOOL fConnected = ConnectNamedPipe( hPipe, NULL ) ? 
            TRUE : ( GetLastError() == ERROR_PIPE_CONNECTED ); 
 
        if( fConnected ) { 
            printf( "Client connected, creating a processing thread.\n" ); 
      
            // Create a thread for this client. 
            DWORD  dwThreadId = 0; 
            HANDLE hThread = CreateThread( 
                NULL,              // no security attribute 
                0,                 // default stack size 
                ipc_client_thread, // thread proc
                (LPVOID) hPipe,    // thread parameter 
                0,                 // not suspended 
                &dwThreadId );     // returns thread ID 

            if( hThread == NULL ) {
                printf( "CreateThread failed, LastError=%d.\n", GetLastError() ); 
                LocalFree( acl );
                LocalFree( sd );
                FreeSid( sid );
                return EXIT_FAILURE;
            } else {
                CloseHandle( hThread ); 
            }
        } else {
            // The client could not connect, so close the pipe. 
            CloseHandle( hPipe ); 
        }
    } 


    LocalFree( acl );
    LocalFree( sd );
    FreeSid( sid );
    return EXIT_SUCCESS;
} 


ipc_server_t* ipc_server_start() {
	DWORD threadId = 0;
	HANDLE thread = CreateThread( 
		NULL,                   // default security attributes
		0,                      // use default stack size  
		ipc_server_thread,      // thread function name
		NULL,          			// argument to thread function 
		0,                      // use default creation flags 
		&threadId );            // returns the thread identifier 

    ipc_server_t* server = new ipc_server_t;
    server->thread = thread;
    return server;
}


void ipc_server_stop( ipc_server_t* server ) {
    TerminateThread( server->thread, EXIT_SUCCESS );
    WaitForSingleObject( server->thread, INFINITE );
    delete server;
}
