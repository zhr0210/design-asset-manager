// Minimal PhotoShow background script for Electron MV2 compatibility
// Responds to essential messages from content.js to keep the extension functional

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.cmd) {
    case 'GET_PHOTOSHOW_STATE_AND_CONFIGS':
      sendResponse({
        isPhotoShowEnabled: true,
        isInDeveloperMode: false,
        photoShowConfigs: {
          activationDelay: 200,
          assistanceAndEnhancements: ['contextMenuItems', 'imageLoadingStatus', 'overlappedCursorHiding', 'thumbnailIndicator'],
          developerModeSuspension: false,
          transitionAnimation: 'full',
          thumbnailTypes: ['backgrounds', 'links', 'pictures', 'posters'],
          viewerColorScheme: 'system',
          viewerPositions: ['bottom', 'left', 'right', 'top'],
          viewMode: 'auto',
          imageInfoDisplay: ['caption', 'dimensions'],
          imageInfoDisplayPosition: 'below',
          hotkeys: {
            closeViewer: { isEnabled: true },
            copyImage: { isEnabled: true },
            copyImageAddress: { isEnabled: true },
            flipImage: { isEnabled: true },
            openImageInNewTab: { isEnabled: true },
            rotateImage: { isEnabled: true },
            saveImage: { isEnabled: true },
            scrollImage: { isEnabled: true },
            scrollImageByPage: { isEnabled: true },
            scrollImageToEnds: { isEnabled: true },
            suspendViewer: { isEnabled: true },
            switchViewMode: { isEnabled: false },
            toggleViewMode: { isEnabled: false }
          },
          notificationsDisplay: ['actions', 'alerts'],
          viewerExceptions: [],
          viewerExceptionsCustomElementSelectors: '',
          viewerTrigger: 'None',
          viewerTriggerAction: 'hold',
          viewerTriggerKeySide: 'either'
        }
      });
      return true;

    case 'ANALYTICS_LOG':
      // Silently ignore analytics
      sendResponse({});
      return true;

    case 'GET_IMAGE_INFO':
      // Try to fetch image headers for size info
      if (request.args && request.args.src) {
        fetch(request.args.src, { method: 'HEAD' })
          .then(function(response) {
            var contentLength = response.headers.get('content-length');
            var contentType = response.headers.get('content-type');
            sendResponse({
              size: contentLength ? parseInt(contentLength) : undefined,
              type: contentType || undefined
            });
          })
          .catch(function() {
            sendResponse({});
          });
        return true;
      }
      sendResponse({});
      return true;

    case 'CROSS_ORIGIN_GET':
      // Handle cross-origin fetch requests from content script
      if (request.args && request.args.url) {
        fetch(request.args.url, {
          headers: request.args.headers || {}
        })
          .then(function(response) {
            return response.text().then(function(text) {
              sendResponse({
                ok: response.ok,
                status: response.status,
                text: text,
                url: response.url
              });
            });
          })
          .catch(function(err) {
            sendResponse({ ok: false, error: err.message });
          });
        return true;
      }
      sendResponse({ ok: false });
      return true;

    case 'UPDATE_CONTEXT_MENU':
    case 'TOGGLE_NET_REQUEST_RULES':
    case 'REMOVE_CLIPBOARD_PERMISSION':
    case 'REQUEST_CLIPBOARD_PERMISSION':
      sendResponse({ success: true });
      return true;

    case 'OPEN_IMAGE_IN_NEW_TAB':
      if (request.args && request.args.src) {
        chrome.tabs.create({ url: request.args.src, active: false });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No src provided' });
      }
      return true;

    case 'SAVE_IMAGE':
      if (request.args && request.args.src) {
        chrome.downloads.download({ url: request.args.src });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No src provided' });
      }
      return true;

    default:
      sendResponse({});
      return true;
  }
});