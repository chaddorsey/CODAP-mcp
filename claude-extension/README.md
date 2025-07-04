
## Build & Packaging

To build and package the extension as a .dxt file for Claude Desktop:

```sh
npm install  # install dependencies (first time only)
npm run build:dxt
```

This will produce a `.dxt` file in the current directory, ready for drag-and-drop install in Claude Desktop.

- Ensure all files (manifest, server code) are up to date before packaging.
- The manifest will be validated automatically by the DXT toolchain.

