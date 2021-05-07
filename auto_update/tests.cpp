#define _CRT_SECURE_NO_WARNINGS
#define _CRT_NONSTDC_NO_WARNINGS
#if defined( _WIN32 ) && defined( _DEBUG )
    #include <crtdbg.h>
#endif
#include "testfw.h"
#include <stdlib.h>


void test_fw_ok() {
    TESTFW_TEST_BEGIN( "Checking that test framework is ok" );
    TESTFW_EXPECTED( true );
    TESTFW_TEST_END();
}


int main( int argc, char** argv ) {
    TESTFW_INIT();

    test_fw_ok();   

    int result = TESTFW_SUMMARY();
    return result == 0 ? EXIT_SUCCESS : EXIT_FAILURE;  
}

#define TESTFW_IMPLEMENTATION
#define TESTFW_NO_ANSI
#include "testfw.h"
