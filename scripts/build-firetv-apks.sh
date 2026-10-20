#!/bin/bash
set -e

TENANTS=("mvn" "kreation" "archaven" "hektic" "streamshare")
APP_NAMES=("MVN" "Kreation" "ArcHaven" "Hektic" "StreamShare")
OUTPUT_DIR="dist-firetv-apk"
ROOT_DIR="$(pwd)"

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

mkdir -p "$OUTPUT_DIR"
mkdir -p "/Users/tickertwizted/Desktop/amazon-upload-ready"

build_tenant_apk() {
    local tenant=$1
    local app_name=$2
    local app_id="com.innova.$tenant"
    local temp_dir="$ROOT_DIR/temp-capacitor-$tenant"

    echo "📱 Building Amazon Fire TV APK for $app_name ($app_id)..."
    rm -rf "$temp_dir"
    mkdir -p "$temp_dir/www"
    cp -r "$ROOT_DIR/dist-firetv/$tenant/"* "$temp_dir/www/"

    cd "$temp_dir"
    cat > package.json <<PKG
{
  "name": "$app_id",
  "version": "1.0.5",
  "private": true,
  "dependencies": {
    "@capacitor/core": "^6.0.0",
    "@capacitor/android": "^6.0.0",
    "@capacitor/cli": "^6.0.0"
  }
}
PKG

    cat > capacitor.config.json <<CAP
{
  "appId": "$app_id",
  "appName": "$app_name",
  "webDir": "www",
  "server": {
    "androidScheme": "https"
  }
}
CAP

    npx cap add android
    npx cap copy android

    # 1. Force Amazon-compatible SDK 34 (Android 14) & minSdk 22 in variables.gradle across all subprojects
    cat > android/variables.gradle <<VARS
ext {
    minSdkVersion = 22
    compileSdkVersion = 34
    targetSdkVersion = 34
    androidxActivityVersion = '1.8.2'
    androidxAppCompatVersion = '1.6.1'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.12.0'
    androidxFragmentVersion = '1.6.2'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.9.0'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.1.5'
    androidxEspressoCoreVersion = '3.5.1'
    cordovaAndroidVersion = '10.1.1'
}
VARS
    # 2. Downgrade AGP from 8.13.0 to 8.2.2 + Gradle 8.5 so platformBuildVersionName is a String & DEX is 035
    sed -i '' "s/com.android.tools.build:gradle:[0-9.]*/com.android.tools.build:gradle:8.2.2/g" android/build.gradle
    sed -i '' "s/gradle-[0-9.]*-all.zip/gradle-8.5-all.zip/g" android/gradle/wrapper/gradle-wrapper.properties

    # Force compileSdk 34 and Java 17 bytecode across capacitor-android and cordova plugins
    cat >> android/build.gradle <<'SUBPROJ'

subprojects {
    configurations.all {
        resolutionStrategy.eachDependency { details ->
            if (details.requested.group == 'org.jetbrains.kotlin' && details.requested.name.startsWith('kotlin-stdlib')) {
                details.useVersion '1.8.22'
            }
        }
    }
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            project.android {
                compileSdkVersion 34
                defaultConfig {
                    minSdkVersion 22
                    targetSdkVersion 34
                }
                compileOptions {
                    sourceCompatibility JavaVersion.VERSION_17
                    targetCompatibility JavaVersion.VERSION_17
                }
            }
        }
    }
}
SUBPROJ

    # 3. Disable AGP resource path obfuscation (fixes icon='res/BW.xml')
    echo "" >> android/gradle.properties
    echo "android.enableResourceOptimizations=false" >> android/gradle.properties
    echo "android.useAndroidX=true" >> android/gradle.properties

    # 4. Set versionCode 5 / versionName "1.0.5" and enable R8 minification + resource shrinking
    sed -i '' 's/versionCode 1/versionCode 5/g; s/versionName "1.0"/versionName "1.0.5"/g; s/minifyEnabled false/minifyEnabled true\n            shrinkResources true/g' android/app/build.gradle
    cat >> android/app/proguard-rules.pro <<PRO
-keep class com.getcapacitor.** { *; }
-keep class com.innova.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-dontwarn org.apache.cordova.**
PRO

    # 5. Generate real tenant icons and 320x180 TV banner using correct ROOT_DIR path
    icon_filename=$(get_icon_filename "$tenant")
    icon_source="$ROOT_DIR/assets/base-icons/$icon_filename"
    if [ -f "$icon_source" ]; then
        echo "   🎨 Generating Android icons and TV banner from $icon_source..."
        mkdir -p assets
        sips -s format png "$icon_source" --out "assets/icon-only.png" >/dev/null
        cp "assets/icon-only.png" "assets/splash.png"
        npx @capacitor/assets generate --android || true

        mkdir -p android/app/src/main/res/drawable
        sips -s format png -z 180 320 "$icon_source" --out "android/app/src/main/res/drawable/tv_banner.png" >/dev/null
    fi

    # 6. Inject Fire TV Leanback, non-touchscreen compatibility, and android:banner="@drawable/tv_banner" into AndroidManifest.xml
    python3 -c '
import sys
p = "android/app/src/main/AndroidManifest.xml"
s = open(p).read()
features = """
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-feature android:name="android.software.leanback" android:required="false" />
"""
if "android.software.leanback" not in s:
    s = s.replace("<application", features + "\n    <application", 1)
if "android:banner=" not in s:
    s = s.replace("<application", "<application\n        android:banner=\"@drawable/tv_banner\"", 1)
    s = s.replace("<activity", "<activity\n            android:banner=\"@drawable/tv_banner\"", 1)
if "android.intent.category.LEANBACK_LAUNCHER" not in s:
    s = s.replace("<category android:name=\"android.intent.category.LAUNCHER\" />",
                  "<category android:name=\"android.intent.category.LAUNCHER\" />\n                <category android:name=\"android.intent.category.LEANBACK_LAUNCHER\" />")
open(p, "w").write(s)
'

    # Ensure @capacitor/android compiles against SDK 34
    sed -i '' 's/Build.VERSION_CODES.VANILLA_ICE_CREAM/35/g' "$ROOT_DIR/node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/plugin/SystemBars.java" 2>/dev/null || true

    cd android
    ./gradlew assembleRelease

    unsigned_apk="app/build/outputs/apk/release/app-release-unsigned.apk"
    aligned_apk="app/build/outputs/apk/release/app-release-aligned.apk"
    signed_apk="$ROOT_DIR/$OUTPUT_DIR/${tenant}-firetv.apk"
    desktop_apk="/Users/tickertwizted/Desktop/amazon-upload-ready/${tenant}-firetv.apk"

    "$ANDROID_HOME/build-tools/35.0.0/zipalign" -f -p 4 "$unsigned_apk" "$aligned_apk"
    "$ANDROID_HOME/build-tools/35.0.0/apksigner" sign \
        --min-sdk-version 21 \
        --v1-signing-enabled true \
        --v2-signing-enabled true \
        --v3-signing-enabled false \
        --v4-signing-enabled false \
        --ks "$ROOT_DIR/innova-release.keystore" \
        --ks-key-alias innova-key \
        --ks-pass pass:innova123 \
        --key-pass pass:innova123 \
        --out "$signed_apk" \
        "$aligned_apk"

    cp "$signed_apk" "$desktop_apk"
    cd "$ROOT_DIR"
    rm -rf "$temp_dir"
    echo "✅ Built & signed $desktop_apk"
}

for i in "${!TENANTS[@]}"; do
    build_tenant_apk "${TENANTS[$i]}" "${APP_NAMES[$i]}"
done

xattr -cr "/Users/tickertwizted/Desktop/amazon-upload-ready"
echo "=== VERIFYING NEW SDK 34 + UNOBFUSCATED ICON BADGING ON archaven-firetv.apk ==="
"$ANDROID_HOME/build-tools/35.0.0/aapt" dump badging "/Users/tickertwizted/Desktop/amazon-upload-ready/archaven-firetv.apk" | head -n 15
open "/Users/tickertwizted/Desktop/amazon-upload-ready"
