#!/bin/bash
# iFlow Context Manager Wrapper
# Usage: ./iflow_context.sh

cleanup() {
    echo "Caught SIGINT/SIGTERM, saving final context..."
    # Logic to trigger final save can go here if agents support it
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting iFlow with Context Manager integration..."
iflow "$@"
