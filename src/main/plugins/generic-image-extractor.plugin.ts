import { BrowserExtractorPlugin, ExtractContext, ExtractedAsset } from './types'

export class GenericImageExtractorPlugin implements BrowserExtractorPlugin {
  public id = 'generic-image-extractor'
  public name = '通用网页图片识别插件'
  public matchDomains = ['*']

  public match(_url: string): boolean {
    return true
  }

  public async extractAssets(context: ExtractContext): Promise<ExtractedAsset[]> {
    console.log(`[ExtractorPlugin] Running DOM extraction on page: ${context.currentUrl}`)

    // Execute the scraper script inside the WebContentsView context
    const script = `
      (() => {
        const assets = [];
        const pageUrl = window.location.href;
        const urlObj = new URL(pageUrl);
        const siteDomain = urlObj.hostname.replace('www.', '');
        const uniqueUrls = new Set();

        function addUrl(url, title, type, width = 0, height = 0) {
          if (!url) return;
          try {
            const absoluteUrl = new URL(url, pageUrl).toString();
            if (uniqueUrls.has(absoluteUrl)) return;

            // Skip empty/base64canvas data urls
            if (absoluteUrl.startsWith('data:')) return;

            // Simple blocklist matching for avatars, icons, tracking pixels
            const lowerUrl = absoluteUrl.toLowerCase();
            const blockTerms = ['avatar', 'logo', 'pixel', 'tracking', 'favicon', '/icon', 'spacer', 'loader', 'sprite'];
            if (blockTerms.some(term => lowerUrl.includes(term))) {
              return;
            }

            uniqueUrls.add(absoluteUrl);
            assets.push({
              url: absoluteUrl,
              title: title || '',
              type,
              width,
              height
            });
          } catch(e) {}
        }

        // 1. img src and srcset
        document.querySelectorAll('img').forEach(img => {
          const title = img.alt || img.title || '';
          
          // Use natural dimensions if already loaded, otherwise attributes or layout size
          const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0', 10);
          const h = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '0', 10);

          // Filtering rule: ignore small icons/badges (< 300px)
          if (w > 0 && h > 0 && (w < 300 || h < 300)) {
            return;
          }

          addUrl(img.currentSrc || img.src, title, 'img', w, h);

          if (img.srcset) {
            img.srcset.split(',').forEach(s => {
              const url = s.trim().split(/\\s+/)[0];
              addUrl(url, title, 'srcset', w, h);
            });
          }
        });

        // 2. picture source srcset
        document.querySelectorAll('picture source').forEach(source => {
          if (source.srcset) {
            source.srcset.split(',').forEach(s => {
              const url = s.trim().split(/\\s+/)[0];
              addUrl(url, '', 'picture-source');
            });
          }
        });

        // 3. CSS Computed style background-image
        document.querySelectorAll('*').forEach(el => {
          const bg = window.getComputedStyle(el).backgroundImage;
          if (bg && bg !== 'none') {
            const match = bg.match(/url\\(['"]?([^'"]+)['"]?\\)/);
            if (match) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && (rect.width < 300 || rect.height < 300)) {
                return;
              }
              addUrl(match[1], '', 'css-bg', Math.round(rect.width), Math.round(rect.height));
            }
          }
        });

        // 4. meta[property="og:image"] (OpenGraph image)
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg && ogImg.getAttribute('content')) {
          addUrl(ogImg.getAttribute('content'), 'OpenGraph Image', 'og-meta');
        }

        // 5. Direct file links
        document.querySelectorAll('a').forEach(a => {
          const href = a.getAttribute('href');
          if (href) {
            const cleanHref = href.split('?')[0].split('#')[0].toLowerCase();
            if (/\\.(jpg|jpeg|png|webp|gif|svg)$/.test(cleanHref)) {
              addUrl(href, a.textContent || 'Linked Image', 'a-href');
            }
          }
        });

        return assets;
      })()
    `

    try {
      const rawAssets = await context.executeJavaScript<any[]>(script)
      if (!rawAssets || !Array.isArray(rawAssets)) return []

      const urlObj = new URL(context.currentUrl)
      const domain = urlObj.hostname.replace('www.', '')
      const siteName = domain.charAt(0).toUpperCase() + domain.slice(1)

      return rawAssets.map((asset: any) => {
        // Resolve file extension
        let fileType = 'JPG'
        const lowerUrl = asset.url.toLowerCase()
        if (lowerUrl.includes('.png')) fileType = 'PNG'
        else if (lowerUrl.includes('.webp')) fileType = 'WEBP'
        else if (lowerUrl.includes('.gif')) fileType = 'GIF'
        else if (lowerUrl.includes('.svg')) fileType = 'SVG'

        return {
          id: `ext-${Math.random().toString(36).substr(2, 9)}`,
          title: asset.title.trim() || `${siteName.split('.')[0]} Graphic Asset`,
          thumbnailUrl: asset.url,
          previewUrl: asset.url,
          downloadUrl: asset.url,
          sourcePageUrl: context.currentUrl,
          sourceSite: siteName,
          width: asset.width || 800,
          height: asset.height || 600,
          fileType
        }
      })
    } catch (err) {
      console.error('[ExtractorPlugin] Execution failed:', err)
      return []
    }
  }
}
