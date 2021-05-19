REM runs the tests in an infinite loop
REM intended to be run manually and left running for a long time,
REM as a final sanity check to make sure the tests are stable
REM will exit if any tests fail
:loop
	call npm run test
	if %ERRORLEVEL% NEQ 0 goto :eof
goto :loop