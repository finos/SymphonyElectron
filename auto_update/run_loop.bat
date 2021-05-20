@echo off
echo runs the tests in an infinite loop
echo intended to be run manually and left running for a long time,
echo as a final sanity check to make sure the tests are stable
echo will exit if any tests fail
set started=%date% %time%
:loop
	echo INITIATED AT %started%
	echo CURRENTLY AT %date% %time%
	call npm run test
	if %ERRORLEVEL% NEQ 0 (
		echo.
		echo INITIATED AT  %started%
		echo TERMINATED AT %date% %time%
		goto :eof
	)
goto :loop