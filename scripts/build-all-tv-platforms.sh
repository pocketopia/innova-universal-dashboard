#!/bin/bash
set -e

TENANTS=("mvn" "kreation" "archaven" "hektic" "streamshare")
APP_NAMES=("MVN" "Kreation" "ArcHaven" "Hektic TV" "StreamShare")
ROOT_DIR="$(pwd)"

get_icon_filename() {
    case $1 in
        "mvn") echo "MVN_icon.jpg" ;;
        "kreation") echo "kreation_icon.jpg" ;;
        "archaven") echo "archaven_icon.jpg" ;;
        "hektic") echo "hektictv_icon.jpg" ;;
        "streamshare") echo "streamshare_icon.jpg" ;;
    esac
}

mkdir -p dist-androidtv-aab dist-lg-webos dist-samsung-tizen dist-roku

for i in "${!TENANTS[@]}"; do
    tenant="${TENANTS[$i]}"
    app_name="${APP_NAMES[$i]}"
    app_id="com.innova.$tenant"
    icon_src="$ROOT_DIR/assets/base-icons/$(get_icon_filename "$tenant")"

    echo "📺 Staging LG webOS, Samsung Tizen, and Roku packages for $app_name ($app_id)..."

    # --- 1. LG webOS Staging ---
    lg_dir="$ROOT_DIR/dist-lg-webos/$tenant"
    rm -rf "$lg_dir" && mkdir -p "$lg_dir"
    cp -r "$ROOT_DIR/dist-firetv/$tenant/"* "$lg_dir/"
    sips -s format png -z 80 80 "$icon_src" --out "$lg_dir/icon.png" >/dev/null
    sips -s format png -z 130 130 "$icon_src" --out "$lg_dir/largeIcon.png" >/dev/null
    cat > "$lg_dir/appinfo.json" <<LGJSON
{
  "id": "$app_id",
  "version": "1.0.5",
  "vendor": "Innova Ecosystem",
  "type": "web",
  "main": "index.html",
  "title": "$app_name",
  "icon": "icon.png",
  "largeIcon": "largeIcon.png",
  "resolution": "1920x1080",
  "disableBackHistoryAPI": true
}
LGJSON

    # --- 2. Samsung Tizen Staging (.wgt zip structure) ---
    sam_dir="$ROOT_DIR/dist-samsung-tizen/$tenant"
    rm -rf "$sam_dir" && mkdir -p "$sam_dir"
    cp -r "$ROOT_DIR/dist-firetv/$tenant/"* "$sam_dir/"
    sips -s format png -z 512 512 "$icon_src" --out "$sam_dir/icon.png" >/dev/null
    cat > "$sam_dir/config.xml" <<SAMXML
<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets" id="http://innova.com/$tenant" version="1.0.5" viewmodes="maximized">
    <tizen:application id="innova${tenant:0:4}.Main" package="innova${tenant:0:4}" required_version="4.0"/>
    <content src="index.html"/>
    <feature name="http://tizen.org/feature/screen.size.normal.1080.1920"/>
    <icon src="icon.png"/>
    <name>$app_name</name>
    <tizen:privilege name="http://tizen.org/privilege/internet"/>
    <tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>
    <tizen:profile name="tv-samsung"/>
</widget>
SAMXML
    (cd "$sam_dir" && zip -rq "$ROOT_DIR/dist-samsung-tizen/${tenant}-tizen.wgt" .)

    # --- 3. Roku SceneGraph Channel (.zip) ---
    roku_dir="$ROOT_DIR/dist-roku/$tenant"
    rm -rf "$roku_dir" && mkdir -p "$roku_dir/source" "$roku_dir/components" "$roku_dir/images"
    sips -s format png -z 405 540 "$icon_src" --out "$roku_dir/images/channel-poster_hd.png" >/dev/null
    sips -s format png -z 218 290 "$icon_src" --out "$roku_dir/images/channel-poster_sd.png" >/dev/null
    sips -s format png -z 1080 1920 "$icon_src" --out "$roku_dir/images/splash_fhd.png" >/dev/null
    cat > "$roku_dir/manifest" <<ROKUMAN
title=$app_name
major_version=1
minor_version=0
build_version=5
mm_icon_focus_hd=pkg:/images/channel-poster_hd.png
mm_icon_focus_sd=pkg:/images/channel-poster_sd.png
splash_screen_fhd=pkg:/images/splash_fhd.png
ui_resolutions=fhd
ROKUMAN
    cat > "$roku_dir/source/Main.brs" <<'ROKUBRS'
sub Main()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = screen.CreateScene("MainScene")
    screen.show()
    while(true)
        msg = wait(0, m.port)
        if type(msg) = "roSGScreenEvent" and msg.isScreenClosed() then return
    end while
end sub
ROKUBRS
    cat > "$roku_dir/components/MainScene.xml" <<ROKUXML
<?xml version="1.0" encoding="utf-8" ?>
<component name="MainScene" extends="Scene">
    <children>
        <Label id="titleLabel" text="$app_name - Live Network" translation="[120, 80]" />
        <Video id="videoPlayer" width="1920" height="1080" visible="false" />
    </children>
</component>
ROKUXML
    (cd "$roku_dir" && zip -rq "$ROOT_DIR/dist-roku/${tenant}-roku.zip" .)
done

ls -lh dist-lg-webos dist-samsung-tizen/*.wgt dist-roku/*.zip
