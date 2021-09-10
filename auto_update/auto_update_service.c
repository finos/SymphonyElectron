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
#include <wincrypt.h>
#include <wintrust.h>
#include <Softpub.h>

#pragma comment(lib, "Shell32.lib")
#pragma comment (lib, "wintrust.lib")
#pragma comment(lib, "crypt32.lib")

#define SERVICE_NAME "symphony_sda_auto_update_service"
#define PIPE_NAME "symphony_sda_auto_update_ipc"


// The digital certificate of an installation package is validate before it is installed
// This is a list of certificate thumbprints for current and past Symphony certificates
// Whenever a new certificate is taken into use, its thumbprint needs to be added here
// or the installation packages signed with it will be rejected.

struct { BYTE hash[ 20 ]; } thumbprints[] = {
    /* 99b3333ac4457a4e21a527cc11040b28c15c1d3f */ 
    "\x99\xb3\x33\x3a\xc4\x45\x7a\x4e\x21\xa5\x27\xcc\x11\x04\x0b\x28\xc1\x5c\x1d\x3f",
};


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


// This is Microsofts code for verifying the digital signature of a file, taken from here:
// https://docs.microsoft.com/en-us/windows/win32/seccrypto/example-c-program--verifying-the-signature-of-a-pe-file

BOOL VerifyEmbeddedSignature( LPCWSTR pwszSourceFile ) {
    LONG lStatus;
    DWORD dwLastError;

    // Initialize the WINTRUST_FILE_INFO structure.

    WINTRUST_FILE_INFO FileData;
    memset( &FileData, 0, sizeof( FileData ) );
    FileData.cbStruct = sizeof( WINTRUST_FILE_INFO );
    FileData.pcwszFilePath = pwszSourceFile;
    FileData.hFile = NULL;
    FileData.pgKnownSubject = NULL;

    /*
    WVTPolicyGUID specifies the policy to apply on the file
    WINTRUST_ACTION_GENERIC_VERIFY_V2 policy checks:
    
    1) The certificate used to sign the file chains up to a root 
    certificate located in the trusted root certificate store. This 
    implies that the identity of the publisher has been verified by 
    a certification authority.
    
    2) In cases where user interface is displayed (which this example
    does not do), WinVerifyTrust will check for whether the  
    end entity certificate is stored in the trusted publisher store,  
    implying that the user trusts content from this publisher.
    
    3) The end entity certificate has sufficient permission to sign 
    code, as indicated by the presence of a code signing EKU or no 
    EKU.
    */

    GUID WVTPolicyGUID = WINTRUST_ACTION_GENERIC_VERIFY_V2;
    WINTRUST_DATA WinTrustData;

    // Initialize the WinVerifyTrust input data structure.

    // Default all fields to 0.
    memset( &WinTrustData, 0, sizeof( WinTrustData ) );

    WinTrustData.cbStruct = sizeof( WinTrustData );
    
    // Use default code signing EKU.
    WinTrustData.pPolicyCallbackData = NULL;

    // No data to pass to SIP.
    WinTrustData.pSIPClientData = NULL;

    // Disable WVT UI.
    WinTrustData.dwUIChoice = WTD_UI_NONE;

    // No revocation checking.
    WinTrustData.fdwRevocationChecks = WTD_REVOKE_NONE; 

    // Verify an embedded signature on a file.
    WinTrustData.dwUnionChoice = WTD_CHOICE_FILE;

    // Verify action.
    WinTrustData.dwStateAction = WTD_STATEACTION_VERIFY;

    // Verification sets this value.
    WinTrustData.hWVTStateData = NULL;

    // Not used.
    WinTrustData.pwszURLReference = NULL;

    // This is not applicable if there is no UI because it changes 
    // the UI to accommodate running applications instead of 
    // installing applications.
    WinTrustData.dwUIContext = 0;

    // Set pFile.
    WinTrustData.pFile = &FileData;

    // WinVerifyTrust verifies signatures as specified by the GUID 
    // and Wintrust_Data.
    lStatus = WinVerifyTrust( NULL, &WVTPolicyGUID, &WinTrustData );

	BOOL result = FALSE;
    switch( lStatus )  {
        case ERROR_SUCCESS:
            /*
            Signed file:
                - Hash that represents the subject is trusted.

                - Trusted publisher without any verification errors.

                - UI was disabled in dwUIChoice. No publisher or 
                    time stamp chain errors.

                - UI was enabled in dwUIChoice and the user clicked 
                    "Yes" when asked to install and run the signed 
                    subject.
            */
            LOG_INFO( "The file is signed and the signature was verified." );
			result = TRUE;
            break;
        
        case TRUST_E_NOSIGNATURE:
            // The file was not signed or had a signature 
            // that was not valid.

            // Get the reason for no signature.
            dwLastError = GetLastError();
            if( TRUST_E_NOSIGNATURE == dwLastError || TRUST_E_SUBJECT_FORM_UNKNOWN == dwLastError || TRUST_E_PROVIDER_UNKNOWN == dwLastError ) {
                // The file was not signed.
                LOG_ERROR( "The file is not signed." );
            } else {
                // The signature was not valid or there was an error 
                // opening the file.
                LOG_LAST_ERROR( "An unknown error occurred trying to verify the signature of the file." );
            }

            break;

        case TRUST_E_EXPLICIT_DISTRUST:
            // The hash that represents the subject or the publisher 
            // is not allowed by the admin or user.
            LOG_ERROR( "The signature is present, but specifically disallowed." );
            break;

        case TRUST_E_SUBJECT_NOT_TRUSTED:
            // The user clicked "No" when asked to install and run.
            LOG_ERROR( "The signature is present, but not trusted." );
            break;

        case CRYPT_E_SECURITY_SETTINGS:
            /*
            The hash that represents the subject or the publisher 
            was not explicitly trusted by the admin and the 
            admin policy has disabled user trust. No signature, 
            publisher or time stamp errors.
            */
            LOG_ERROR( "CRYPT_E_SECURITY_SETTINGS - The hash "
                "representing the subject or the publisher wasn't "
                "explicitly trusted by the admin and admin policy "
                "has disabled user trust. No signature, publisher "
                "or timestamp errors.");
            break;

        default:
            // The UI was disabled in dwUIChoice or the admin policy 
            // has disabled user trust. lStatus contains the 
            // publisher or time stamp chain error.
            LOG_ERROR( "Error is: 0x%x.", lStatus );
            break;
    }

    // Any hWVTStateData must be released by a call with close.
    WinTrustData.dwStateAction = WTD_STATEACTION_CLOSE;
    lStatus = WinVerifyTrust( NULL, &WVTPolicyGUID, &WinTrustData);

    return result;
}


// Checks that the embedded signature is valid, and also checks that it is specifically
// a known Symphony certificate, by looking for any of the certificate thumbprints listed
// in the `thumbprints` array defined at the top of this file.

BOOL validate_installer( char const* filename ) {
    size_t length = 0;
    mbstowcs_s( &length, NULL, 0, filename, _TRUNCATE );
    wchar_t* wfilename = (wchar_t*) malloc( sizeof( wchar_t* ) * ( length + 1 ) );
    mbstowcs_s( &length, wfilename, length, filename, strlen( filename ) );
    BOOL signature_valid = VerifyEmbeddedSignature( wfilename );
	if( !signature_valid ) {
		free( wfilename );
		return FALSE;
	}

    DWORD dwEncoding, dwContentType, dwFormatType;
    HCERTSTORE hStore = NULL;
    HCRYPTMSG hMsg = NULL;
	BOOL result = CryptQueryObject( CERT_QUERY_OBJECT_FILE,
		wfilename,
		CERT_QUERY_CONTENT_FLAG_PKCS7_SIGNED_EMBED,
		CERT_QUERY_FORMAT_FLAG_BINARY,
		0,
		&dwEncoding,
		&dwContentType,
		&dwFormatType,
		&hStore,
		&hMsg,
		NULL );   
    free( wfilename );
	
    if( !result ) {
		LOG_LAST_ERROR( "CryptQueryObject failed" );
		return FALSE;
	}

	BOOL found = FALSE;
	for( int i = 0; i < sizeof( thumbprints ) / sizeof( *thumbprints ); ++i ) {
		CRYPT_HASH_BLOB hash_blob = { 
            sizeof( thumbprints[ i ].hash ) / sizeof( *(thumbprints[ i ].hash) ), 
            thumbprints[ i ].hash 
        };
		CERT_CONTEXT const* cert_context = CertFindCertificateInStore(
			hStore,
			(X509_ASN_ENCODING | PKCS_7_ASN_ENCODING),
			0,
			CERT_FIND_HASH,
			&hash_blob,
			NULL );
		
        if( cert_context ) {
			found = TRUE;
			CertFreeCertificateContext( cert_context );
		}
	}
	
	CryptMsgClose( hMsg );
	CertCloseStore( hStore, CERT_CLOSE_STORE_FORCE_FLAG );
    return found;
}


// Runs msiexec with the supplied filename
bool run_installer( char const* filename ) {    
    // Reject installers which are not signed with a Symphony certificate
    if( !validate_installer( filename ) ) {
        LOG_ERROR( "The signature of %s could is not a valid Symphony signature" );
        return false;
    }

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
        LOG_LAST_ERROR( "Failed to run installer" );
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