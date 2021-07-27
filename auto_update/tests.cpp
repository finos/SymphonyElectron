#define _CRT_SECURE_NO_WARNINGS
#define _CRT_NONSTDC_NO_WARNINGS
#if defined( _WIN32 ) && defined( _DEBUG )
    #include <crtdbg.h>
#endif
#include "testfw.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <windows.h>

void disable_log( char const*, ... ) { };
#define IPC_LOG_INFO disable_log
#define IPC_LOG_ERROR disable_log 
#define IPC_LOG_LAST_ERROR disable_log
#include "ipc.h"

bool pipe_exists( const char* pipe_name );

void test_fw_ok() {
    TESTFW_TEST_BEGIN( "Checking that test framework is ok" );
    TESTFW_EXPECTED( true );
    TESTFW_TEST_END();
}


void ipc_tests() {   
    {
        TESTFW_TEST_BEGIN( "Check that IPC server is not already running" );
        TESTFW_EXPECTED( !pipe_exists( "test_pipe" ) );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can start IPC server" );
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const*, void*, char*, size_t ) { }, NULL );
        TESTFW_EXPECTED( server != NULL );
        ipc_server_stop( server );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can stop IPC server" );
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const*, void*, char*, size_t ) { }, NULL );
        TESTFW_EXPECTED( server != NULL );
        ipc_server_stop( server );
        TESTFW_EXPECTED( !pipe_exists( "test_pipe" ) );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can connect multiple IPC clients" );
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const*, void*, char*, size_t ) { }, NULL );
        TESTFW_EXPECTED( server != NULL );
        ipc_client_t* clients[ 32 ];
        for( int i = 0; i < sizeof( clients ) / sizeof( *clients ); ++i ) {
            clients[ i ] = ipc_client_connect( "test_pipe" );
            TESTFW_EXPECTED( clients[ i ] );
        }
        for( int i = 0; i < sizeof( clients ) / sizeof( *clients ); ++i ) {
            ipc_client_disconnect( clients[ i ] );
        }
        ipc_server_stop( server );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can connect multiple IPC clients multiple times" );
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const*, void*, char*, size_t ) { }, NULL );
        TESTFW_EXPECTED( server != NULL );
        for( int j = 0; j < 10; ++j ) {
            ipc_client_t* clients[ 32 ];
            for( int i = 0; i < sizeof( clients ) / sizeof( *clients ); ++i ) {
                clients[ i ] = ipc_client_connect( "test_pipe" );
                TESTFW_EXPECTED( clients[ i ] );
            }
            for( int i = 0; i < sizeof( clients ) / sizeof( *clients ); ++i ) {
                ipc_client_disconnect( clients[ i ] );
            }
        }
        ipc_server_stop( server );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can connect IPC client" );
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const*, void*, char*, size_t ) { }, NULL );
        TESTFW_EXPECTED( server != NULL );
        ipc_client_t* client = ipc_client_connect( "test_pipe" );
        TESTFW_EXPECTED( client != NULL );
        ipc_client_disconnect( client );
        ipc_server_stop( server );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can send IPC message from client to server" );
        bool message_received = false;
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const* message, void* user_data, char*, size_t ) { 
                if( !message ) return; // client disconnect
                bool* message_received = (bool*) user_data;
                *message_received = true;
                TESTFW_EXPECTED( strcmp( message, "Test message" ) == 0 );
            }, &message_received );
        TESTFW_EXPECTED( server != NULL );
        ipc_client_t* client = ipc_client_connect( "test_pipe" );
        TESTFW_EXPECTED( client != NULL );
        TESTFW_EXPECTED( ipc_client_send( client, "Test message" ) == true );
        char temp[ IPC_MESSAGE_MAX_LENGTH ];
        int size = 0;
        ipc_client_receive( client, temp, sizeof( temp ), &size );
        TESTFW_EXPECTED( message_received == true );

        ipc_client_disconnect( client );
        ipc_server_stop( server );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can receive IPC response from server" );
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const* message, void* user_data, char* response, size_t ) { 
                if( !message ) return; // client disconnect
                strcpy( response, "Test response" ); 
            }, NULL );
        TESTFW_EXPECTED( server != NULL );
        ipc_client_t* client = ipc_client_connect( "test_pipe" );
        TESTFW_EXPECTED( client != NULL );
        TESTFW_EXPECTED( ipc_client_send( client, "Test message" ) == true );
        char response[ IPC_MESSAGE_MAX_LENGTH ];
        int size = 0;
        TESTFW_EXPECTED( ipc_client_receive( client, response, sizeof( response ), &size ) == IPC_RECEIVE_STATUS_DONE );
        TESTFW_EXPECTED( size == strlen( "Test response" ) + 1 );
        TESTFW_EXPECTED( strcmp( response, "Test response" ) == 0 );
        ipc_client_disconnect( client );
        ipc_server_stop( server );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can send and receive long IPC messages" );
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const* message, void* user_data, char* response, size_t capacity ) { 
                if( !message ) return; // client disconnect
                char expected_message[ IPC_MESSAGE_MAX_LENGTH ];
                for( int i = 0; i < IPC_MESSAGE_MAX_LENGTH - 1; ++i ) {
                    expected_message[ i ] = 'A' + ( i % ( 'Z' - 'A' + 1 ) );
                }
                expected_message[ IPC_MESSAGE_MAX_LENGTH - 1 ] = '\0';
                TESTFW_EXPECTED( strcmp( message, expected_message ) == 0 );
                for( int i = 0; i < (int) capacity - 1; ++i ) {
                    response[ i ] = 'a' + ( i % ( 'z' - 'a' + 1 ) );
                }
                response[ capacity - 1 ] = '\0';
            }, NULL );
        TESTFW_EXPECTED( server != NULL );
        ipc_client_t* client = ipc_client_connect( "test_pipe" );
        TESTFW_EXPECTED( client != NULL );
        char message[ IPC_MESSAGE_MAX_LENGTH ];
        for( int i = 0; i < IPC_MESSAGE_MAX_LENGTH - 1; ++i ) {
            message[ i ] = 'A' + ( i % ( 'Z' - 'A' + 1 ) );
        }
        message[ IPC_MESSAGE_MAX_LENGTH - 1 ] = '\0';
        TESTFW_EXPECTED( ipc_client_send( client, message ) == true );
        char response[ IPC_MESSAGE_MAX_LENGTH ];
        int size = 0;
        TESTFW_EXPECTED( ipc_client_receive( client, response, sizeof( response ), &size ) == IPC_RECEIVE_STATUS_DONE );
        char expected_response[ IPC_MESSAGE_MAX_LENGTH ];
        for( int i = 0; i < IPC_MESSAGE_MAX_LENGTH - 1; ++i ) {
            expected_response[ i ] = 'a' + ( i % ( 'z' - 'a' + 1 ) );
        }
        expected_response[ IPC_MESSAGE_MAX_LENGTH - 1 ] = '\0';
        TESTFW_EXPECTED( size == IPC_MESSAGE_MAX_LENGTH );
        TESTFW_EXPECTED( strcmp( response, expected_response ) == 0 );

        ipc_client_disconnect( client );
        ipc_server_stop( server );
        TESTFW_TEST_END();
    }

    {
        TESTFW_TEST_BEGIN( "Can send and receive multiple IPC messages" );
        int received_count = 0;
        ipc_server_t* server = ipc_server_start( "test_pipe", 
            []( char const* message, void* user_data, char* response, size_t ) { 
                if( !message ) return; // client disconnect
                int* received_count = (int*) user_data;
                char expected_message[ IPC_MESSAGE_MAX_LENGTH ];
                sprintf( expected_message, "Test message %d", *received_count );
                TESTFW_EXPECTED( strcmp( message, expected_message ) == 0 );
                sprintf( response, "Test response %d", *received_count );
                *received_count = *received_count + 1;
            }, &received_count );
        TESTFW_EXPECTED( server != NULL );
        ipc_client_t* client = ipc_client_connect( "test_pipe" );
        TESTFW_EXPECTED( client != NULL );
        for( int i = 0; i < 64; ++i ) {
            char message[ IPC_MESSAGE_MAX_LENGTH ];
            sprintf( message, "Test message %d", i );
            TESTFW_EXPECTED( ipc_client_send( client, message ) == true );
            char response[ IPC_MESSAGE_MAX_LENGTH ];
            int size = 0;
            TESTFW_EXPECTED( ipc_client_receive( client, response, sizeof( response ), &size ) == IPC_RECEIVE_STATUS_DONE );
            char expected_response[ IPC_MESSAGE_MAX_LENGTH ];
            sprintf( expected_response, "Test response %d", i );
            TESTFW_EXPECTED( size == strlen( expected_response ) + 1 );
            TESTFW_EXPECTED( strcmp( response, expected_response ) == 0 );
        }
        TESTFW_EXPECTED( received_count == 64 );

        ipc_client_disconnect( client );
        ipc_server_stop( server );
        TESTFW_TEST_END();
    }
}


int main( int argc, char** argv ) {
    TESTFW_INIT();

    test_fw_ok();   
    ipc_tests();

    int result = TESTFW_SUMMARY();
    return result == 0 ? EXIT_SUCCESS : EXIT_FAILURE;  
}


#define IPC_IMPLEMENTATION
#include "ipc.h"

#define TESTFW_IMPLEMENTATION
#define TESTFW_NO_ANSI
#include "testfw.h"

