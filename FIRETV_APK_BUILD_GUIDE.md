# Amazon Fire TV APK Build Guide

This guide explains how to build release-ready APK files for Amazon Fire TV using Capacitor.

## Prerequisites

### 1. Android SDK Setup

1. **Download Android Studio** from https://developer.android.com/studio
2. **Install and configure**:
   - Follow the installation wizard
   - Open Android Studio and go to **Preferences → Appearance & Behavior → System Settings → Android SDK**
   - Install Android SDK Platform (API level 30 or higher recommended)
   - Install Android SDK Build-Tools
   - Install Android SDK Platform-Tools

3. **Set up environment variables**:
   ```bash
   # Add to ~/.bashrc, ~/.zshrc, or ~/.profile
   export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
   # export ANDROID_HOME=$HOME/android-sdk  # Linux
   # export ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk  # Windows
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

### 2. Java Development Kit (JDK)

- **Required**: JDK 11 or higher
- Download from https://adoptium.net/ or use your system's package manager

### 3. Verify Installation

```bash
# Check Java version
java -version

# Check Gradle (comes with Android Studio)
gradle --version

# Check Android SDK
adb --version
```

## Building APK Files

### Option 1: Automated Script (Recommended)

```bash
# Make script executable (first time only)
chmod +x scripts/build-firetv-apks.sh

# Run the build script
./scripts/build-firetv-apks.sh
```

This will:
1. Create Capacitor projects for each tenant
2. Copy web assets from `dist-firetv/[tenant]/`
3. Build release APKs
4. Output to `dist-firetv-apk/` directory

### Option 2: Manual Build for Single Tenant

```bash
# Example for MVN tenant
npx cap init "MVN - Innova Ecosystem" "com.innova.mvn" --web-dir=dist-firetv/mvn
npx cap add android
npx cap copy android
cd android
./gradlew assembleRelease

# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

## Release Signing (Required for Amazon Appstore)

### Generate a Keystore

```bash
keytool -genkey -v -keystore innova-release.keystore \
  -alias innova-key \
  -keyalg RSA -keysize 2048 -validity 10000
```

### Set Environment Variables

```bash
export ANDROID_KEYSTORE_PATH=/path/to/innova-release.keystore
export ANDROID_KEYSTORE_PASSWORD=your_keystore_password
export ANDROID_KEYSTORE_ALIAS=innova-key
```

### Build Signed APK

The build script will automatically sign the APK if the environment variables are set.

## Output Structure

After successful build, you'll have:

```
dist-firetv-apk/
├── mvn-firetv.apk           # MVN platform
├── kreation-firetv.apk      # Kreation platform
├── archaven-firetv.apk      # ArcHaven platform
├── hektic-firetv.apk        # Hektic platform
└── streamshare-firetv.apk   # StreamShare platform
```

## Amazon Appstore Submission

Each APK file is ready for individual submission to the Amazon Appstore:

1. Go to https://developer.amazon.com/apps-and-games
2. Create a new app for each tenant
3. Upload the corresponding APK file
4. Complete the store listing and submit for review

## Troubleshooting

### "Gradle not found" error
- Ensure Android Studio is installed
- Add Gradle to PATH: `export PATH=$PATH:$ANDROID_HOME/tools/bin`

### "Java not found" error
- Install JDK 11 or higher
- Ensure `java` is in your PATH

### Build fails with SDK errors
- Run `sdkmanager --update` to update SDK tools
- Accept licenses: `sdkmanager --licenses`

### Out of memory during build
```bash
export GRADLE_OPTS="-Xmx4g -XX:MaxPermSize=512m"
```

## CI/CD Integration

For automated builds in CI/CD pipelines (GitHub Actions, GitLab CI, etc.):

```yaml
# Example GitHub Actions snippet
- name: Set up Android SDK
  uses: android-actions/setup-android@v2
  
- name: Build Fire TV APKs
  run: |
    npm install
    npm run build:tv:all
    ./scripts/build-firetv-apks.sh
  env:
    ANDROID_KEYSTORE_PATH: ${{ secrets.ANDROID_KEYSTORE_PATH }}
    ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    ANDROID_KEYSTORE_ALIAS: ${{ secrets.ANDROID_KEYSTORE_ALIAS }}
```

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Amazon Fire TV App Testing](https://developer.amazon.com/docs/fire-tv/app-testing.html)
- [Amazon Appstore Submission](https://developer.amazon.com/docs/app-submission/submit-your-app.html)