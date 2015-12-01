#!/usr/bin/env bash

MJR_FILE=$1
PNG_FILE=$2
WEBM_FILE=$(mtemp -t $0)

janus-pp-rec "$MJR_FILE" "$WEBM_FILE"

gst-launch-1.0 \
filesrc \
location="$WEBM_FILE" \
! decodebin \
! videoconvert \
! pngenc snapshot=true \
! filesink location="$PNG_FILE"
