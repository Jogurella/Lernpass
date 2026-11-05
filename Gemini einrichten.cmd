@echo off
cd /d "%~dp0"
echo Gemini-Einrichtung fuer Mechatronik Lernpass
echo Nach dem Start im Browser oeffnen: http://127.0.0.1:8788/__setup
echo Dieses Fenster waehrend der Einrichtung offen lassen.
node scripts/preview.mjs --setup
pause
