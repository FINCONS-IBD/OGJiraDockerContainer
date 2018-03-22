@ECHO OFF

setlocal

rem
rem check for correct java version by parsing out put of java -version
rem we expect first line to be in format "java version 1.8.0" and assert that minor version number will be 8 or higher
rem

set EXPECTED_JAVA_VERSION=8

for /f "tokens=2 delims=." %%a in ('%_EXECJAVA% -version 2^>^&1') do (
   set VERSION=%%a
   goto loaded_version
)
goto wrong_version

:loaded_version
IF %VERSION% LSS %EXPECTED_JAVA_VERSION% goto wrong_version

goto:eof

:wrong_version
echo *******************************************************************************
echo *******      Wrong JVM version! JIRA requires at least 1.8 to run.      *******
echo *******************************************************************************
exit /b 1
