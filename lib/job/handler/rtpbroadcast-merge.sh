#!/usr/bin/env bash
gst-launch-1.0 \
filesrc \
locationAudio="$1" \
locationVideo="$2" \
! decodebin \
! videoconvert \
! pngenc snapshot=true \
! filesink \
location="$3"
