#!/bin/bash
# Build Amazon Fire TV APK files for all 5 tenants
# This script requires Android SDK and Java to be installed

set -e

TENANTS=("mvn" "kreation" "archaven" "hektic" "streamshare")
APP_NAMES=("MVN" "Kreation" "ArcHaven" "Hektic" "StreamShare")
OUTPUT_DIR="dist-firetv-apk"

echo "🚀 Starting Amazon Fire TV APK build process..."

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to build APK for a tenant
build_tenant_apk() {
    local tenant=$1
    local app_name=$2
    local app_id="com.innova.$tenant"
    local temp_dir="temp-capacitor-$tenant"
    
    echo "📱 Building APK for $app_name ($tenant)..."
    
    # Clean up any existing temp directory
    rm -rf "$temp_dir"
    mkdir -p "$temp_dir"
    
    # Copy web assets
    cp -r "dist-firetv/$tenant/"* "$temp_dir/www/"
    
    # Create temporary capacitor config
    cat > "$temp_dir/capacitor.config.ts" <<EOF
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '$app_id',
  appName: '$app_name - Innova Ecosystem',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH,
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
      keystoreAlias: process.env.ANDROID_KEYSTORE_ALIAS
    }
  }
};

export default config;
EOF
    
    # Copy package.json and modify
    cp package.json "$temp_dir/"
    
    # Navigate to temp directory
    cd "$temp_dir"
    
    # Initialize Capacitor
    npx cap init "$app_name - Innova Ecosystem" "$app_id" --web-dir=www
    
    # Add Android platform
    npx cap add android
    
    # Copy web assets to Android project
    npx cap copy android
    
    # Build APK (release)
    cd android
    ./gradlew assembleRelease
    
    # Copy APK to output directory
    cp app/build/outputs/apk/release/app-release.apk "../$OUTPUT_DIR/${tenant}-firetv.apk"
    
    # Clean up
    cd ../..
    rm -rf "$temp_dir"
    
    echo "✅ $app_name APK built successfully: $OUTPUT_DIR/${tenant}-firetv.apk"
}

# Check if Android SDK is available
if ! command -v gradle &> /dev/null; then
    echo "❌ Error: Android SDK/Gradle not found in PATH"
    echo "Please install Android SDK and set up ANDROID_HOME environment variable"
    echo ""
    echo "Installation instructions:"
    echo "1. Download Android Studio from https://developer.android.com/studio"
    echo "2. Install and set up ANDROID_HOME environment variable"
    echo "3. Add \$ANDROID_HOME/tools and \$ANDROID_HOME/platform-tools to PATH"
    echo ""
    echo "Alternatively, this script can be run in a CI/CD environment with Android SDK installed"
    exit 1
fi

# Check if Java is available
if ! command -v java &> /dev/null; then
    echo "❌ Error: Java not found in PATH"
    echo "Please install Java JDK 11 or higher"
    exit 1
fi

# Build APKs for all tenants
for i in "${!TENANTS[@]}"; do
    build_tenant_apk "${TENANTS[$i]}" "${APP_NAMES[$i]}"
done

echo ""
echo "🎉 All Fire TV APKs built successfully!"
echo "📦 Output directory: $OUTPUT_DIR/"
ls -lh "$OUTPUT_DIR/"

echo ""
echo "✅ Ready for Amazon Appstore submission!"