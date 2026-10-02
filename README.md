# tizentube-mod

Modified [TizenTube](https://github.com/reisxd/TizenTube) user script, served by jsDelivr for a modified TizenTube Cobalt build on Android TV.

Changes on top of TizenTube `9dd70a7` (1.15.1):
- Remember playback speed per video and/or per channel
- Preferred subtitle language (e.g. Arabic): turned on automatically, auto-translated if not available
- Mini player: opening its video fullscreen continues from the current position
- Seeking: playback resumes automatically after seeking with the remote
- Mini player stays mini until the user opens it (no automatic switch to the full player)
- Arabic/RTL subtitles: centered, no longer cut off on the right side
- Built-in updater disabled by default (the modified app can't be updated with the official APK)

Script URL: `https://cdn.jsdelivr.net/gh/k7lksa/tizentube-mod@main/tt.js`

Licensed under GPL-3.0, like TizenTube. All credit for TizenTube goes to Reis Can (reisxd) and its contributors.
