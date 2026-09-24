# <img src="extension/assets/icons/icon.png" width="32" height="32"> <span style="position: relative; top: -3px;">YT-AdBlocker</span>

a firefox extension made to block ads on youtube and protect video playback.

it uses typescript for the browser extension and go for the native engine.

## you can try 
https://addons.mozilla.org/en-US/firefox/addon/yt-adblocker
## features

- blocks youtube ad requests
- detects ads that get through the filters
- skips and removes ad playback
- protects video playback when an ad interrupts it
- filters general ad and tracking requests
- supports filtering rules
- has a go native engine
- keeps basic protection statistics
- includes tests
- has a small popup to control protection

## structure

- `extension/` - firefox extension
- `engine/` - go native engine
- `rules/` - filtering rules
- `tests/` - tests
- `scripts/` - build and installation scripts
- `docs/` - documentation

## requirements

before installing the project, make sure you have:

- firefox 128 or newer
- node.js
- npm
- go 1.24 or newer

## installation

clone the project and enter its folder:

```bash
git clone https://github.com/zenobiatranoss/YT-AdBlocker.git
cd yt-adblocker
````

install the javascript dependencies:

```bash
npm install
```

install the native go engine:

```bash
./scripts/install-native.sh
```

this installs the native engine and its firefox native messaging host.

## build

build the project with:

```bash
npm run build
```

the extension will be created in:

`dist/extension`

## install the extension in firefox

1. open firefox
2. go to `about:debugging`
3. select `this firefox`
4. select `load temporary add-on`
5. open the project folder
6. go to `dist/extension`
7. select `manifest.json`

the extension should now appear in firefox.

## run

after installing the extension, open youtube normally.

the extension will start working automatically on youtube pages.

you can open the extension popup from the firefox toolbar to enable or disable protection and view the current statistics.

## testing

run the tests with:

```bash
npm test
```

run the typescript type check with:

```bash
npm run typecheck
```

you can also build everything again with:

```bash
npm run build
```

## native engine

the go engine runs locally and communicates with the firefox extension through native messaging.

the installation script places the engine in:

`~/.local/lib/yt-adblocker`

and the firefox native messaging host in:

`~/.mozilla/native-messaging-hosts`

the engine does not need to be started manually. the extension starts the native host when it needs it.

## development

after changing the source code, build the extension again:

```bash
npm run build
```

then reload the extension from `about:debugging`.

if you change the native engine, run the installation script again:

```bash
./scripts/install-native.sh
```

## status

the project is working and mainly focused on youtube ad blocking and playback protection.

it is still under development, so some parts may change in the future.

youtube changes may also require updates to the project.

## license

see the `LICENSE` file.

```
```
