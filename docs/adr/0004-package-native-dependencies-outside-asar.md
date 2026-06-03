# Package Native Dependencies Outside Asar

The packaged Electron app keeps native modules and platform optional packages for SQLite and image processing outside `app.asar`. This is necessary because `better-sqlite3`, `sharp`, and `@img` libvips binaries must be loadable as real filesystem artifacts in packaged Windows and macOS builds, trading a larger unpacked resource set for reliable startup.
