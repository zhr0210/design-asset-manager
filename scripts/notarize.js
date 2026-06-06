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

  console.log(`Notarizing ${appPath}...`);
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
    console.error('Apple notarization failed:', error);
    throw error;
  }
}
