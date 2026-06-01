export function createBrowserPreviewInjectionScript(): string {
  return `
        (() => {


          // ==========================================
          // 1. FLOATING DOWNLOAD BUTTON INJECTION
          // ==========================================
          if (!window.__image_downloader_injected__) {
            window.__image_downloader_injected__ = true;
            
            const btn = document.createElement('div');
            btn.id = 'electron-image-download-button';
            btn.style.position = 'absolute';
            btn.style.display = 'none';
            btn.style.zIndex = '999999999';
            btn.style.width = '36px';
            btn.style.height = '36px';
            btn.style.borderRadius = '18px';
            btn.style.backgroundColor = '#6366f1';
            btn.style.color = '#ffffff';
            btn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            btn.style.cursor = 'pointer';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'flex-start';
            btn.style.padding = '0 10px';
            btn.style.boxSizing = 'border-box';
            btn.style.overflow = 'hidden';
            btn.style.whiteSpace = 'nowrap';
            btn.style.transition = 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s';
            
            btn.innerHTML = \`
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span style="margin-left: 6px; font-size: 11px; font-family: system-ui, -apple-system, sans-serif; font-weight: bold; opacity: 0; transition: opacity 0.15s ease-out; flex-shrink: 0; pointer-events: none;">涓嬭浇绱犳潗</span>
            \`;

            document.body.appendChild(btn);

            let activeImg = null;
            let activeMetadata = null;

            btn.addEventListener('mouseenter', () => {
              btn.style.width = '96px';
              btn.style.transform = 'scale(1.08)';
              btn.style.backgroundColor = '#4f46e5';
              const text = btn.querySelector('span');
              if (text) {
                text.style.opacity = '1';
              }
            });

            btn.addEventListener('mouseleave', () => {
              btn.style.width = '36px';
              btn.style.transform = 'scale(1.0)';
              btn.style.backgroundColor = '#6366f1';
              const text = btn.querySelector('span');
              if (text) {
                text.style.opacity = '0';
              }
            });

            document.addEventListener('mouseover', (e) => {
              let img = e.target.closest('img');
              
              // Smart traversal for elements with overlays on top (e.g. inside a card link 'a' tag)
              if (!img && e.target) {
                const cardLink = e.target.closest('a');
                if (cardLink) {
                  img = cardLink.querySelector('img');
                }
              }
              
              if (!img) return;

              const w = img.naturalWidth || img.width || img.offsetWidth || 0;
              const h = img.naturalHeight || img.height || img.offsetHeight || 0;

              if (w > 0 && h > 0 && (w < 300 || h < 300)) return;

              const src = img.currentSrc || img.src;
              if (!src || src.startsWith('data:')) return;

              const lowerUrl = src.toLowerCase();
              const blockTerms = ['avatar', 'logo', 'pixel', 'tracking', 'favicon', '/icon', 'spacer', 'loader', 'sprite'];
              if (blockTerms.some(term => lowerUrl.includes(term))) {
                return;
              }

              activeImg = img;
              activeMetadata = {
                url: src,
                title: img.alt || img.title || document.title || '鎻愬彇绱犳潗',
                width: w,
                height: h
              };

              const rect = img.getBoundingClientRect();
              const pageX = rect.left + window.scrollX;
              const pageY = rect.top + window.scrollY;
              const imgHeight = rect.height;

              btn.style.left = (pageX + 12) + 'px';
              btn.style.top = (pageY + Math.max(12, imgHeight - 36 - 16)) + 'px';
              btn.style.display = 'flex';
            });

            document.addEventListener('mouseout', (e) => {
              const img = e.target.closest('img');
              if (!img) return;
              
              const toElement = e.relatedTarget;
              if (toElement && (toElement === btn || btn.contains(toElement))) {
                return;
              }

              btn.style.display = 'none';
            });

            btn.addEventListener('mouseleave', (e) => {
              const toElement = e.relatedTarget;
              if (toElement && toElement === activeImg) {
                return;
              }
              btn.style.display = 'none';
            });

            btn.addEventListener('click', () => {
              if (!activeMetadata || !window.browserAPI) return;

              btn.style.transform = 'scale(0.8)';
              setTimeout(() => {
                btn.style.transform = 'scale(1.1)';
              }, 100);

              window.browserAPI.downloadAsset({
                url: activeMetadata.url,
                title: activeMetadata.title,
                width: activeMetadata.width,
                height: activeMetadata.height,
                sourcePageUrl: window.location.href,
                pageTitle: document.title
              });
            });
          }

          // ==========================================
          // 2. PREMIUM INJECTED HOVER ZOOM ENGINE
          // ==========================================
          if (!window.__image_hover_zoom_injected__) {
            window.__image_hover_zoom_injected__ = true;

            // Create beautiful glassmorphic preview container (100vh full screen height-locked)
            const previewContainer = document.createElement('div');
            previewContainer.id = 'photoshow-injected-preview-container';
            previewContainer.style.position = 'fixed';
            previewContainer.style.zIndex = '2147483647';
            previewContainer.style.display = 'none';
            previewContainer.style.pointerEvents = 'none';
            previewContainer.style.background = 'rgba(10, 15, 30, 0.95)'; // Deep Slate Blue with high opacity
            previewContainer.style.backdropFilter = 'blur(20px)';
            previewContainer.style.webkitBackdropFilter = 'blur(20px)';
            previewContainer.style.borderLeft = '1px solid rgba(255, 255, 255, 0.15)';
            previewContainer.style.borderRight = '1px solid rgba(255, 255, 255, 0.15)';
            previewContainer.style.borderRadius = '0'; // Flat panels look extremely sleek at full height
            previewContainer.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.8)';
            previewContainer.style.padding = '0'; // Crucial: No margins or padding so image fills top to bottom perfectly!
            previewContainer.style.boxSizing = 'border-box';
            previewContainer.style.flexDirection = 'column';
            previewContainer.style.transition = 'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
            previewContainer.style.opacity = '0';
            previewContainer.style.transform = 'scale(0.98)';
            previewContainer.style.top = '0';
            previewContainer.style.height = '100vh';

            previewContainer.innerHTML = \`
              <div id="photoshow-injected-preview-viewport" style="
                position: relative;
                width: 100%;
                height: calc(100% - 32px); /* Reclaim 32px for info bar so it never overlaps! */
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <img id="photoshow-injected-preview-img" style="
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                  top: 0;
                  left: 0;
                  transition: transform 0.08s cubic-bezier(0.25, 0.8, 0.25, 1);
                  display: block;
                " />
                
                <div id="photoshow-injected-preview-spinner" style="
                  position: absolute;
                  width: 40px;
                  height: 40px;
                  display: block;
                  z-index: 10;
                ">
                  <svg width="40" height="40" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#6366f1">
                    <g fill="none" fill-rule="evenodd">
                      <g transform="translate(1 1)" stroke-width="3">
                        <circle stroke-opacity=".2" cx="18" cy="18" r="18"/>
                        <path d="M36 18c0-9.94-8.06-18-18-18">
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 18 18"
                            to="360 18 18"
                            dur="0.8s"
                            repeatCount="indefinite"/>
                        </path>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
              
              <!-- Premium info-bar placed BELOW the image viewport in the normal layout flow -->
              <div id="photoshow-injected-preview-info" style="
                width: 100%;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.7);
                background: rgba(10, 15, 30, 0.95);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                padding: 0 16px;
                box-sizing: border-box;
                pointer-events: none;
                z-index: 15;
              ">
                <span id="photoshow-injected-preview-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%; font-weight: 500;">Title</span>
                <span id="photoshow-injected-preview-size" style="font-family: monospace;">Loading...</span>
              </div>
            \`;

            document.body.appendChild(previewContainer);

            let activeElement = null;
            let activeCardElement = null;
            let hoverTimer = null;
            let currentHighResUrl = '';
            let activeRequestUrl = '';
            let preloadImageObj = null;
            let lastMouseEvent = { clientX: 0, clientY: 0 };
            let imageNaturalWidth = 0;
            let imageNaturalHeight = 0;
            let lastSentAssetUrl = '__unset__'; // Dedup: track last sent asset to avoid redundant IPC

            const previewImg = document.getElementById('photoshow-injected-preview-img');
            const spinner = document.getElementById('photoshow-injected-preview-spinner');
            const titleEl = document.getElementById('photoshow-injected-preview-title');
            const sizeEl = document.getElementById('photoshow-injected-preview-size');

            // Extract background image url
            function getBgImageUrl(el) {
              const bg = getComputedStyle(el).backgroundImage;
              if (bg && bg !== 'none') {
                const match = bg.match(/url\\((['"]?)(.*?)\\1\\)/);
                if (match) {
                  return match[2];
                }
              }
              return '';
            }

            // Resolve high-resolution URL from thumbnail URL
            function resolveHighResUrl(url) {
              // A. Pinterest
              if (/i\\.pinimg\\.com/.test(url)) {
                const match = url.match(/(https?:)?\\/\\/i\\.pinimg\\.com\\/(?:originals|\\d+x(?:\\d+(?:_\\w+)?)?)\\/(.+)/);
                if (match) {
                  const proto = match[1] || 'https:';
                  const path = match[2];
                  return {
                    url: proto + '//i.pinimg.com/originals/' + path,
                    fallback: proto + '//i.pinimg.com/736x/' + path
                  };
                }
              }
              
              // B. Unsplash & Pexels
              if (/unsplash\\.com/.test(url) || /pexels\\.com/.test(url)) {
                return { url: url.split('?')[0] };
              }
              
              // C. Huaban
              if (/huaban\\.com/.test(url) || /hbimg\\.huaban\\.com/.test(url)) {
                return { url: url.replace(/_(?:fw\\d+|sq\\d+|fw\\d+sf|square)/, '') };
              }
              
              // D. Xiaohongshu
              if (/xhscdn\\.com/.test(url) || /xiaohongshu\\.com/.test(url)) {
                let cleanUrl = url.split('?')[0];
                cleanUrl = cleanUrl.replace(/\\/w\\/\\d+$/, '');
                return { url: cleanUrl };
              }

              // E. Zcool
              if (/img\\.zcool\\.cn/.test(url)) {
                const match = url.match(/(.+?)@.+/);
                if (match) {
                  return { url: match[1] };
                }
              }
              
              return { url: url };
            }

            // Dynamically position the preview box opposite to the cursor, lock height and perform vertical panning
            function positionPopup(e) {
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              if (!activeElement || !activeCardElement) return;
              
              const cardRect = activeCardElement.getBoundingClientRect();
              
              // Calculate side spaces to determine optimal alignment adjacent to card
              const leftSpace = cardRect.left;
              const rightSpace = viewportWidth - cardRect.right;
              const placeOnLeft = leftSpace > rightSpace;
              
              // Determine max width available on the side (leaving 30px boundary cushion)
              let maxAvailableWidth = placeOnLeft ? (leftSpace - 30) : (rightSpace - 30);
              maxAvailableWidth = Math.min(maxAvailableWidth, viewportWidth * 0.85);
              
              let containerWidth = 550; // Premium default fallback width
              
              if (imageNaturalWidth > 0 && imageNaturalHeight > 0) {
                const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
                
                // Target container height is 100vh minus 32px (the height of the bottom info bar)
                const targetHeight = viewportHeight - 32;
                
                // Calculate ideal width so the image perfectly occupies 100% height without vertical letterboxing
                let idealWidth = targetHeight * imageAspectRatio;
                
                // If the image is ultra-tall (ratio is greater than vertical 9:16, i.e., w/h < 9/16 = 0.5625):
                if (imageAspectRatio < 9 / 16) {
                  // Lock ideal width to 30% of the viewport width (responsive for 4K/retina displays)
                  // with a minimum of 400px to guarantee excellent legibility on all resolutions!
                  idealWidth = Math.max(400, viewportWidth * 0.3);
                }
                
                // Set container width dynamically to the ideal width, capped only by screen boundary
                containerWidth = Math.min(idealWidth, maxAvailableWidth);
                
                // Ensure container width doesn't get ridiculously small for ultra-narrow images
                containerWidth = Math.max(containerWidth, 320);
              } else {
                containerWidth = Math.min(500, maxAvailableWidth);
              }
              
              let left = 0;
              const gap = 15; // clean gap from card edge
              
              if (placeOnLeft) {
                left = cardRect.left - containerWidth - gap;
                if (left < 10) left = 10;
              } else {
                left = cardRect.right + gap;
                if (left + containerWidth > viewportWidth - 10) {
                  left = viewportWidth - containerWidth - 10;
                }
              }
              
              previewContainer.style.width = containerWidth + 'px';
              previewContainer.style.left = left + 'px';
              previewContainer.style.top = '0';
              previewContainer.style.height = viewportHeight + 'px';
              previewContainer.style.display = 'flex';
              
              // Image overflow calculation and smooth scrolling translation
              if (imageNaturalWidth > 0 && imageNaturalHeight > 0) {
                const viewportDiv = document.getElementById('photoshow-injected-preview-viewport');
                const viewportHeightPx = viewportDiv.offsetHeight;
                const viewportWidthPx = viewportDiv.offsetWidth;
                
                // Proportional dimensions at full container width
                const renderedWidth = viewportWidthPx;
                const renderedHeight = imageNaturalHeight * (renderedWidth / imageNaturalWidth);
                
                if (renderedHeight > viewportHeightPx + 5) {
                  // Overflow triggers: Enable mouse-driven vertical scroll panning
                  previewImg.style.maxWidth = 'none';
                  previewImg.style.maxHeight = 'none';
                  previewImg.style.width = '100%';
                  previewImg.style.height = 'auto';
                  previewImg.style.objectFit = 'initial'; // Override contain constraints
                  previewImg.style.top = '0';
                  previewImg.style.left = '50%';
                  
                  // Scrolling physics optimization: 20% dead zones at top and bottom to avoid overlay button jitter
                  const rawY = (e.clientY - cardRect.top) / cardRect.height;
                  const threshold = 0.2; // 20% threshold
                  let panningY = 0;
                  
                  if (rawY < threshold) {
                    panningY = 0;
                  } else if (rawY > 1 - threshold) {
                    panningY = 1;
                  } else {
                    panningY = (rawY - threshold) / (1 - 2 * threshold);
                  }
                  
                  const overflowAmount = renderedHeight - viewportHeightPx;
                  const translateY = -panningY * overflowAmount;
                  
                  previewImg.style.transform = 'translateX(-50%) translateY(' + translateY + 'px)';
                } else {
                  // Fitting: Standard absolute center wrapping at full width and height
                  // We let object-fit contain do the native centering while forcing 100% width stretch
                  previewImg.style.maxWidth = '100%';
                  previewImg.style.maxHeight = '100%';
                  previewImg.style.width = '100%';
                  previewImg.style.height = '100%';
                  previewImg.style.objectFit = 'contain';
                  previewImg.style.top = '0';
                  previewImg.style.left = '0';
                  previewImg.style.transform = 'none';
                }
              } else {
                // Loading reset styles
                previewImg.style.maxWidth = '100%';
                previewImg.style.maxHeight = '100%';
                previewImg.style.width = '100%';
                previewImg.style.height = '100%';
                previewImg.style.objectFit = 'contain';
                previewImg.style.top = '0';
                previewImg.style.left = '0';
                previewImg.style.transform = 'none';
              }
            }

            // Smooth fade out and hide
            function hidePreview() {
              clearTimeout(hoverTimer);
              activeElement = null;
              activeCardElement = null;
              
              previewContainer.style.opacity = '0';
              previewContainer.style.transform = 'scale(0.95)';
              
              setTimeout(() => {
                if (!activeElement) {
                  previewContainer.style.display = 'none';
                  previewImg.src = '';
                }
              }, 200);
              
              if (preloadImageObj) {
                preloadImageObj.onload = null;
                preloadImageObj.onerror = null;
                preloadImageObj.src = '';
                preloadImageObj = null;
              }
              
              // Clear active hovered asset in main process (only if not already cleared)
              if (lastSentAssetUrl !== null) {
                lastSentAssetUrl = null;
                if (window.browserAPI && window.browserAPI.setHoveredAsset) {
                  window.browserAPI.setHoveredAsset(null);
                }
              }
            }

            // Smooth fade in and preload high-res source
            function showPreview(el, src) {

              const resolved = resolveHighResUrl(src);
              const hiResUrl = resolved.url;
              const fallbackUrl = resolved.fallback;
              activeRequestUrl = hiResUrl;
              currentHighResUrl = hiResUrl;
              
              // Seed image size instantly using the hovered thumbnail's aspect ratio
              // This guarantees the container sizes itself perfectly immediately, preventing layout jumps!
              imageNaturalWidth = el.naturalWidth || el.offsetWidth || 0;
              imageNaturalHeight = el.naturalHeight || el.offsetHeight || 0;
              
              const altText = el.alt || el.title || document.title || '楂樻竻鍥剧墖棰勮';
              previewImg.src = src;
              previewImg.style.maxWidth = '100%';
              previewImg.style.maxHeight = '100%';
              previewImg.style.width = 'auto';
              previewImg.style.height = 'auto';
              previewImg.style.objectFit = 'contain';
              previewImg.style.top = '50%';
              previewImg.style.left = '50%';
              previewImg.style.transform = 'translateX(-50%) translateY(-50%)';
              spinner.style.display = 'block';
              
              previewContainer.style.display = 'flex';
              previewContainer.offsetHeight; // Force reflow
              previewContainer.style.opacity = '1';
              previewContainer.style.transform = 'scale(1)';
              
              positionPopup(lastMouseEvent);
              
              // Notify the main process about the active hovered asset (dedup by URL)
              if (lastSentAssetUrl !== currentHighResUrl && window.browserAPI && window.browserAPI.setHoveredAsset) {
                lastSentAssetUrl = currentHighResUrl;
                window.browserAPI.setHoveredAsset({
                  url: currentHighResUrl,
                  title: el.alt || el.title || document.title || '鎻愬彇绱犳潗',
                  width: imageNaturalWidth,
                  height: imageNaturalHeight,
                  sourcePageUrl: window.location.href,
                  pageTitle: document.title
                });
              }
              
              preloadImageObj = new Image();
              preloadImageObj.onload = () => {
                if (preloadImageObj.src === activeRequestUrl) {
                  previewImg.src = activeRequestUrl;
                  spinner.style.display = 'none';
                  
                  imageNaturalWidth = preloadImageObj.naturalWidth;
                  imageNaturalHeight = preloadImageObj.naturalHeight;
                  
                  sizeEl.textContent = imageNaturalWidth + ' x ' + imageNaturalHeight;
                  positionPopup(lastMouseEvent);
                  
                  // Notify main process with updated size
                  if (window.browserAPI && window.browserAPI.setHoveredAsset) {
                    window.browserAPI.setHoveredAsset({
                      url: currentHighResUrl,
                      title: el.alt || el.title || document.title || '鎻愬彇绱犳潗',
                      width: imageNaturalWidth,
                      height: imageNaturalHeight,
                      sourcePageUrl: window.location.href,
                      pageTitle: document.title
                    });
                  }
                }
              };
              
              preloadImageObj.onerror = () => {
                if (fallbackUrl && activeRequestUrl === hiResUrl) {
                  activeRequestUrl = fallbackUrl;
                  currentHighResUrl = fallbackUrl; // Synchronize current high-res URL to the fallback URL!
                  preloadImageObj.src = fallbackUrl;
                  sizeEl.textContent = '姝ｅ湪鍔犺浇澶囩敤鍘熷浘...';
                  
                  // Notify main process with fallback URL
                  if (window.browserAPI && window.browserAPI.setHoveredAsset) {
                    window.browserAPI.setHoveredAsset({
                      url: currentHighResUrl,
                      title: el.alt || el.title || document.title || '鎻愬彇绱犳潗',
                      width: imageNaturalWidth,
                      height: imageNaturalHeight,
                      sourcePageUrl: window.location.href,
                      pageTitle: document.title
                    });
                  }
                } else if (activeRequestUrl === preloadImageObj.src) {
                  spinner.style.display = 'none';
                  sizeEl.textContent = (previewImg.naturalWidth || '?') + ' x ' + (previewImg.naturalHeight || '?') + ' (鍔犺浇鍘熷浘澶辫触)';
                }
              };
              
              preloadImageObj.src = hiResUrl;
            }

            // Mouse position tracking and real-time image vertical pan scroll
            document.addEventListener('mousemove', (e) => {
              lastMouseEvent = e;
              if (activeElement && previewContainer.style.display === 'flex') {
                positionPopup(e);
              }
            });

            // Delegate mouseover for highly efficient hover tracking
            document.addEventListener('mouseover', (e) => {
              // Focus the guest window and native WebContentsView container on hover 
              // to ensure keydown shortcuts (S, Escape) trigger instantly without manual clicking!
              try {
                window.focus();
                if (window.browserAPI && window.browserAPI.requestFocus) {
                  window.browserAPI.requestFocus();
                }
              } catch (err) {}
              
              let el = e.target.closest('img, [style*="background-image"], a');
              if (!el) return;
              
              if (el === activeElement) return;
              
              // Hide existing first
              hidePreview();
              
              // Resolve active card container for accurate boundary calculations
              activeCardElement = el.closest('a') || el;
              
              let src = '';
              if (el.tagName === 'IMG') {
                src = el.currentSrc || el.src;
              } else if (el.tagName === 'A') {
                const href = el.href || '';
                // 1. Direct image link
                if (/\\.(jpg|jpeg|png|webp|gif|svg)(\\?.*)?$/i.test(href)) {
                  src = href;
                } else {
                  // 2. Card link wrapping a card image - resolve to inner image
                  const childImg = el.querySelector('img');
                  if (childImg) {
                    el = childImg;
                    src = childImg.currentSrc || childImg.src;
                  } else {
                    return; // No child image, ignore
                  }
                }
              } else {
                src = getBgImageUrl(el);
              }
              
              if (!src || src.startsWith('data:')) return;
              
              // Size filtering: ignore small icons or decorative thumbnails
              const w = el.naturalWidth || el.offsetWidth || 0;
              const h = el.naturalHeight || el.offsetHeight || 0;
              if (w > 0 && h > 0 && (w < 80 || h < 80)) return;
              
              // Block terms
              const lowerUrl = src.toLowerCase();
              const blockTerms = ['avatar', 'logo', 'pixel', 'tracking', 'favicon', '/icon', 'spacer', 'loader', 'sprite'];
              if (blockTerms.some(term => lowerUrl.includes(term))) return;
              
              activeElement = el;
              
              // Dwell for 150ms to ensure user is deliberately hovering to preview
              hoverTimer = setTimeout(() => {
                showPreview(el, src);
              }, 150);
            });

            // Mouseout triggers smooth hide
            document.addEventListener('mouseout', (e) => {
              if (!activeElement) return;
              const toElement = e.relatedTarget;
              if (toElement && activeElement.contains(toElement)) return;
              hidePreview();
            });

            // Scroll hides preview immediately
            window.addEventListener('scroll', () => {
              hidePreview();
            }, { passive: true });

            // Escape key hides preview, and S key triggers high-res download (PhotoShow replica)
            window.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
                hidePreview();
                return;
              }
              
              // PhotoShow exact replica: Hover + S key to download high-res original instantly!
              // We check e.code === 'KeyS' to ensure it triggers 100% reliably even when the user's IME is in Chinese mode!
              if ((e.key === 's' || e.key === 'S' || e.code === 'KeyS') && activeElement && previewContainer.style.display === 'flex' && window.browserAPI) {
                // Prevent browser default behavior
                e.preventDefault();
                
                const title = titleEl.textContent || '鎻愬彇绱犳潗';
                const url = currentHighResUrl || previewImg.src;
                
                if (url && !url.startsWith('data:')) {
                  window.browserAPI.downloadAsset({
                    url: url,
                    title: title,
                    width: imageNaturalWidth || previewImg.naturalWidth || 0,
                    height: imageNaturalHeight || previewImg.naturalHeight || 0,
                    sourcePageUrl: window.location.href,
                    pageTitle: document.title
                  });
                  
                  // Premium tactile feedback: flash info bar size to show "鈿?宸插惎鍔ㄥ師鍥句笅杞?.."
                  const prevSizeText = sizeEl.textContent;
                  sizeEl.textContent = '鈿?宸插惎鍔ㄥ師鍥句笅杞?..';
                  sizeEl.style.color = '#34d399'; // Premium Emerald-400
                  setTimeout(() => {
                    sizeEl.textContent = prevSizeText;
                    sizeEl.style.color = 'rgba(255, 255, 255, 0.7)';
                  }, 1500);
                }
              }
            });
          }
        })()
`;
}
