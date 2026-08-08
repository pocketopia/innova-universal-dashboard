#!/bin/bash
# Build Amazon Fire TV APK files for all 5 tenants
# This script requires Android SDK and Java to be installed

set -e

TENANTS=("mvn" "kreation" "archaven" "hektic" "streamshare")
APP_NAMES=("MVN" "Kreation" "ArcHaven" "Hektic" "StreamShare")
OUTPUT_DIR="dist-firetv-apk"

# Function to get icon filename for a tenant
get_icon_filename() {
    local tenant=$1
    case $tenant in
        "mvn") echo "MVN_icon.jpg" ;;
        "kreation") echo "kreation_icon.jpg" ;;
        "archaven") echo "archaven_icon.jpg" ;;
        "hektic") echo "hektictv_icon.jpg" ;;
        "streamshare") echo "streamshare_icon.jpg" ;;
        *) echo "" ;;
    esac
}

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
    mkdir -p "$temp_dir/www"
    
    # Copy web assets
    cp -r "dist-firetv/$tenant/"* "$temp_dir/www/"
    
    # Navigate to temp directory
    cd "$temp_dir"
    
    # Create a minimal package.json for npm/Capacitor
    cat > package.json <<EOF
{
  "name": "$app_id",
  "version": "1.0.0",
  "private": true
}
EOF
    
    # Initialize Capacitor (creates capacitor.config.ts)
    npx cap init "$app_name - Innova Ecosystem" "$app_id" --web-dir=www
    
    # Update capacitor.config.ts with additional settings
    cat > capacitor.config.ts <<EOF
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '$app_id',
  appName: '$app_name - Innova Ecosystem',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
EOF
    
    # Add Android platform
    npx cap add android
    
    # Copy web assets to Android project
    npx cap copy android
    
    # Generate Android icons from tenant-specific icon
    icon_filename=$(get_icon_filename "$tenant")
    # Use absolute path from project root
    project_root="../../"
    icon_source="$project_root/assets/base-icons/$icon_filename"
    
    if [ -f "$icon_source" ]; then
        echo "   🎨 Generating Android icons from $icon_filename..."
        
        # Create assets directory and copy icon
        mkdir -p assets
        cp "$icon_source" "assets/icon.jpg"
        
        # Generate Android icon resources
        npx @capacitor/assets generate --iconOnly --android
        
        echo "   ✅ Android icons generated successfully"
    else
        echo "   ⚠️ Warning: Icon not found: $icon_source"
    fi
    
    # Build APK (release)
    cd android
    
    # Build the APK (always builds unsigned first)
    ./gradlew assembleRelease
    
    # Check if keystore is configured for signing
    if [ -n "$ANDROID_KEYSTORE_PATH" ] && [ -f "$ANDROID_KEYSTORE_PATH" ]; then
        # Sign the unsigned APK using apksigner
        unsigned_apk="app/build/outputs/apk/release/app-release-unsigned.apk"
        signed_apk="../../$OUTPUT_DIR/${tenant}-firetv.apk"
        
        # Use apksigner from Android SDK
        "$ANDROID_HOME/build-tools/35.0.0/apksigner" sign \
            --ks "$ANDROID_KEYSTORE_PATH" \
            --ks-key-alias "$ANDROID_KEYSTORE_ALIAS" \
            --ks-pass pass:"$ANDROID_KEYSTORE_PASSWORD" \
            --key-pass pass:"$ANDROID_KEYSTORE_PASSWORD" \
            --out "$signed_apk" \
            "$unsigned_apk"
        
        echo "   ✅ APK signed successfully"
    else
        # Copy unsigned APK (needs to be signed before submission)
        cp app/build/outputs/apk/release/app-release-unsigned.apk "../../$OUTPUT_DIR/${tenant}-firetv-unsigned.apk"
    fi
    
    # Clean up
    cd ../..
    rm -rf "$temp_dir"
    
    echo "✅ $app_name APK built successfully: $OUTPUT_DIR/${tenant}-firetv.apk"
}

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ Error: ANDROID_HOME not set or Android SDK not found"
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