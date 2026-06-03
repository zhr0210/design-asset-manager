# Electron Owns AI Result Sync

The Python AI Worker performs inference and returns task results, but Electron remains the owner of local SQLite writes and renderer notifications. The app therefore keeps an Electron-side polling sync instead of allowing the worker to push callbacks or mutate the runtime database directly, trading immediacy for clearer ownership of private local state and a smaller public worker contract.
