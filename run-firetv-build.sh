#!/bin/bash
# Set up environment for Android build
export JAVA_HOME="$(brew --prefix openjdk@21)"
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0

# Set keystore variables
export ANDROID_KEYSTORE_PATH="$(pwd)/innova-release.keystore"
export ANDROID_KEYSTORE_PASSWORD=innova123
export ANDROID_KEYSTORE_ALIAS=innova-key

# Run the build script
./scripts/build-firetv-apks.sh
