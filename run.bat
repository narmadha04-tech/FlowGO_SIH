@echo off
REM ============================================
REM FlowGo Traffic AI - Single Command Runner (Batch)
REM ============================================
REM Simple batch file wrapper for run.ps1
REM Usage: run.bat

powershell.exe -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*

