#!/usr/bin/env bash

gst-launch-1.0 \
filesrc \
locationAudio="$1" \
! decodebin \
! pngenc snapshot=true \
! filesink \
location="$2"
