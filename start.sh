#!/bin/bash
Xvfb :1 -screen 0 1024x768x16 &
export DISPLAY=:1
openbox &
xterm &
x11vnc -display :1 -forever -nopw -listen 0.0.0.0 &
websockify --web /usr/share/novnc 8080 localhost:5900 &
tail -f /dev/null
