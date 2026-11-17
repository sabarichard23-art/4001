# 400

The card game 400 (Tarneeb 400): you and a partner against two opponents, hearts always trump, first to 41.
Play against bots or with friends through a table code.

- **Play in a browser:** https://sabarichard23-art.github.io/4001/
- **Privacy policy:** https://sabarichard23-art.github.io/4001/privacy.html

## What is in this repository

| Path | What it is |
|---|---|
| `index.html` | The whole game: rules, bots, screens |
| `mqtt.min.js` | Library used to connect friends through relay servers |
| `fonts/` | The two typefaces, bundled so the game works offline |
| `sw.js`, `manifest.webmanifest`, icons | Make the web version installable and playable offline |
| `privacy.html` | Privacy policy |
| `ios/` | The iPhone app project (built with Capacitor) |
| `capacitor.config.json`, `package.json`, `scripts/` | Settings and helper scripts for the iPhone app |

## Building the iPhone app (needs a Mac with Xcode)

1. Install Node.js. CocoaPods is not needed: the project uses Swift Package Manager.
2. In this folder run `npm install`, then `npm run ios`.
3. Run `npm run open` to open the project in Xcode.
4. In Xcode, pick your Apple developer team under Signing, then run it on a phone or archive it for the App Store.

After changing `index.html`, run `npm run ios` again before building.
