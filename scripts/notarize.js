import path from 'path';

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping Apple notarization: Apple credentials (APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID) are not set.');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${path.basename(appPath)}...`);
  try {
    const { notarize } = await import('@electron/notarize');
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId
    });
    console.log('Apple notarization completed successfully.');
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : 'Unknown notarization error';
    console.error(`Apple notarization failed: ${message}`);
    throw error;
  }
}
