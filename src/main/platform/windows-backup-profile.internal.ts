/** Bounded Host maintenance budget; native and filesystem checks remain required. */
export const WINDOWS_BACKUP_PROFILE = Object.freeze({
  maxImageBytes: 4 * 1024 * 1024,
  imageCopies: 12,
  helperReserveBytes: 256 * 1024 * 1024,
  mainReserveBytes: 64 * 1024 * 1024,
  freeReserveBytes: 512 * 1024 * 1024,
  freeReserveFraction: 0.1
})
