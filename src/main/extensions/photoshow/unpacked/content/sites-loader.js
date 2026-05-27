// PhotoShow Sites Loader - Auto-generated
// Maps current page hostname to site-specific SITE_SETTINGS
(() => {
  const hostname = window.location.hostname.replace(/^www\./, '');
  const matchRules = [];

  // 115.com.js
  matchRules.push({
    domain: "115.com",
    apply: function() { window.SITE_SETTINGS={"115.com":{srcMatching:[{srcRegExp:"//thumb\\.115\\.com/.+/(\\w+)_.+?\\?(.+)",processor:"//imgjump.115.com/?sha1=$1&$2&size=0"},{srcRegExp:"//.+\\.115\\.com/.*?\\bimgload\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>{if(r.test(s)&&!/\braw=1\b/.test(s)){const r=new URL(s);return r.searchParams.set("raw","1"),r.searchParams.set("i","1"),r.href}}},{srcRegExp:"(avatars\\.115\\.com/.+_)\\w+(@IMG@)",processor:"$1l$2"}]}}; }
  });

  // 123rf.com.js
  matchRules.push({
    domain: "123rf.com",
    apply: function() { window.SITE_SETTINGS={"123rf.com":{srcMatching:[{srcRegExp:"//.+\\.123rf\\.com/\\d+\\w+/(.+@IMG@.*)",processor:"//previews.123rf.com/images/$1"}]}}; }
  });

  // 1688.com.js
  matchRules.push({
    domain: "1688.com",
    apply: function() { window.SITE_SETTINGS={"1688.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // 1zj.com.js
  matchRules.push({
    domain: "1zj.com",
    apply: function() { window.SITE_SETTINGS={"1zj.com":{srcMatching:[{srcRegExp:"(//.+?\\.1zj\\.com/.+/)thumb_\\d+_\\d+_(\\w+@IMG@)",processor:"$1$2"}]}}; }
  });

  // 2dfan.com.js
  matchRules.push({
    domain: "2dfan.com",
    apply: function() { window.SITE_SETTINGS={"2dfan.com":{referrerAddedHostnames:["img.achost.top"],srcMatching:[{srcRegExp:"(//img\\.achost\\.top/.+/)\\w+?_(\\w+@IMG@)",processor:"$1$2"}]}}; }
  });

  // 2dfmax.top.js
  matchRules.push({
    domain: "2dfmax.top",
    apply: function() { window.SITE_SETTINGS={"2dfmax.top":{referrerAddedHostnames:["img.achost.top"],srcMatching:[{srcRegExp:"(//img\\.achost\\.top/.+/)\\w+?_(\\w+@IMG@)",processor:"$1$2"}]}}; }
  });

  // 3d66.com.js
  matchRules.push({
    domain: "3d66.com",
    apply: function() { window.SITE_SETTINGS={"3d66.com":{srcMatching:[{srcRegExp:"(//.+@IMG@!)[^?]*(.*)",processor:"$1detail-full$2"}]}}; }
  });

  // 4chan.org.js
  matchRules.push({
    domain: "4chan.org",
    apply: function() { window.SITE_SETTINGS={"4chan.org":{srcMatching:[{processor:({trigger:r})=>r.closest(".fileThumb").href,selectors:".fileThumb>img"},{srcRegExp:"(//i\\.4cdn\\.org/.+)[a-z](@IMG@)",processor:"$1$2"}]}}; }
  });

  // 500px.js
  matchRules.push({
    domain: "500px",
    apply: function() { window.SITE_SETTINGS={"500px":{ignore:'[class*="Elements__NsfwCoverWrapper"]',srcMatching:[{srcRegExp:"/photo/(\\d+)/",processor:({srcRegExpObj:e,triggerSrc:r})=>{const s=e.test(r)?RegExp.$1:"";return s&&(tools.cacheImage(s)||(()=>tools.fetch("//api.500px.com/v1/photos",{data:{ids:s,image_size:4096}}).then(e=>tools.cacheImage(s,e?.json?.photos?.[s]?.image_url?.[0]))))}},{srcRegExp:"/user_(?<type>avatar|cover)/(?<userId>\\d+)/",processor:({srcRegExpObj:e,triggerSrc:r})=>{const{type:s,userId:o}=e.exec(r)?.groups||{},c=`${s}_${o}`;return o&&(tools.cacheImage(c)||(()=>tools.fetch(`//api.500px.com/v1/users/${o}`).then(e=>tools.cacheImage(c,e?.json?.user?.userpic_url||e?.json?.user?.cover_url))))}},{srcRegExp:"/group_avatar/(\\d+)/",processor:({srcRegExpObj:e,triggerSrc:r})=>{const s=e.test(r)?RegExp.$1:"";return s&&(tools.cacheImage(s)||(()=>tools.fetch(`//legacy-api.500px.com/v1/groups/${s}`).then(e=>e?.json?.group?.avatars&&tools.cacheImage(s,e.json.group.avatars[Object.keys(e.json.group.avatars).sort((e,r)=>parseInt(r)-parseInt(e))[0]].url))))}},{srcRegExp:"(//.+@IMG@!p)\\d+",processor:"$15"},{srcRegExp:"(//.+@IMG@!a)\\d+",processor:"$14"}]}}; }
  });

  // 51miz.com.js
  matchRules.push({
    domain: "51miz.com",
    apply: function() { window.SITE_SETTINGS={"51miz.com":{referrerAddedHostnames:["51miz.com"],srcMatching:[{srcRegExp:"(//.+@IMG@)!.*",processor:"$1"}]}}; }
  });

  // 51yuansu.com.js
  matchRules.push({
    domain: "51yuansu.com",
    apply: function() { window.SITE_SETTINGS={"51yuansu.com":{referrerAddedHostnames:["51yuansu.com"],srcMatching:[{srcRegExp:"(//.+?\\.51yuansu\\.com/.+?_)\\d+(@IMG@).*",processor:"$1800$2"}]}}; }
  });

  // 58pic.com.js
  matchRules.push({
    domain: "58pic.com",
    apply: function() { window.SITE_SETTINGS={"58pic.com":{srcMatching:[{srcRegExp:"(//preview\\.qiantucdn\\.com/.+@IMG@)!.*",processor:"$1!w1024_nowater"}]}}; }
  });

  // 5ch.net.js
  matchRules.push({
    domain: "5ch.net",
    apply: function() { window.SITE_SETTINGS={"5ch.net":{srcMatching:[{srcRegExp:"https?://jump\\.5ch\\.net/\\?(https?://)?(.+)",processor:({srcRegExpObj:e,triggerSrc:t})=>e.test(t)&&{commonRulesOnly:!0,triggerSrc:`${RegExp.$1||"https://"}${RegExp.$2}`},selectors:'a[href*="jump.5ch.net"]'}]}}; }
  });

  // 699pic.com.js
  matchRules.push({
    domain: "699pic.com",
    apply: function() { window.SITE_SETTINGS={"699pic.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:":has(>img~video)"},{srcRegExp:"(//.+?\\.699pic\\.com/video_cover/.+@IMG@).*",processor:"$1"},{srcRegExp:"(//.+?\\.699pic\\.com/images/.+@IMG@!).*",processor:"$1seo.v1"}]}}; }
  });

  // 99ppt.com.js
  matchRules.push({
    domain: "99ppt.com",
    apply: function() { window.SITE_SETTINGS={"99ppt.com":{ignore:".model_btn01",referrerAddedHostnames:["pic.haokj.cn"],srcMatching:[{processor:({trigger:e})=>{const t=e.closest("a")?.href,o=/(\d+)\.html$/.exec(t)?.[1];return o&&(tools.cacheImage(o)||(()=>tools.fetch(t,{dataType:"html"}).then(({doc:e})=>{const t=e?.querySelector(".imgxx");return t&&{src:t.dataset.original,title:t.alt}}).then(e=>tools.cacheImage(o,e))))},selectors:'a[href^="/"]>img.lazy'}]}}; }
  });

  // 9gag.com.js
  matchRules.push({
    domain: "9gag.com",
    apply: function() { window.SITE_SETTINGS={"9gag.com":{srcMatching:[{srcRegExp:"(//img-9gag-fun\\.9cache\\.com/photo/\\w+_)\\d+\\w*(@IMG@)",processor:"$1700b$2"},{srcRegExp:"(//accounts-cdn\\.9gag\\.com/media/avatar/\\d+_)\\d+(.*@IMG@)",processor:"$1800$2"}]}}; }
  });

  // acfun.cn.js
  matchRules.push({
    domain: "acfun.cn",
    apply: function() { window.SITE_SETTINGS={"acfun.cn":{srcMatching:[{srcRegExp:"(//.+\\.kwimgs\\.com/uhead/.+_)\\w+(@IMG@)",processor:"$1o$2"},{srcRegExp:"(//.+\\.(?:acfun\\.cn|(?:aixifan|kwimgs)\\.com)/[^?]+)\\?image.*",processor:"$1"}]}}; }
  });

  // acpjournals.org.js
  matchRules.push({
    domain: "acpjournals.org",
    apply: function() { window.SITE_SETTINGS={"acpjournals.org":{srcMatching:[{srcRegExp:"/medium/(\\w+)\\.jpg",processor:"/large/$1.jpeg"}]}}; }
  });

  // addons.mozilla.org.js
  matchRules.push({
    domain: "addons.mozilla.org",
    apply: function() { window.SITE_SETTINGS={"addons.mozilla.org":{srcMatching:[{srcRegExp:"(//addons\\.mozilla\\.org/user-media/addon_icons/.+?-)\\d+(@IMG@)",processor:"$1128$2"},{srcRegExp:"(//addons\\.mozilla\\.org/user-media/previews/)\\w+(/.+)@IMG@",processor:"$1full$2.png"}]}}; }
  });

  // afdian.com.js
  matchRules.push({
    domain: "afdian.com",
    apply: function() { window.SITE_SETTINGS={"afdian.com":{srcMatching:[{processor:({trigger:e})=>tools.cacheImage(`${/\/p\/(\w{32})/.test(e.closest(".feed-content")?.querySelector(".title-box a")?.href)?RegExp.$1:""}_${tools.getElementIndex(e)}`),selectors:".img-box"}]}}; }
  });

  // agoda.com.js
  matchRules.push({
    domain: "agoda.com",
    apply: function() { window.SITE_SETTINGS={"agoda.com":{srcMatching:[{srcRegExp:"(//.+?\\.bstatic\\.com/.+/)\\w+(/\\d+@IMG@.*)",processor:"$1max3000$2"},{srcRegExp:"([^?]+)\\?.+",processor:({trigger:c})=>["$1",r=>r.width*r.height<=c.width*c.height]}]}}; }
  });

  // aixifan.com.js
  matchRules.push({
    domain: "aixifan.com",
    apply: function() { window.SITE_SETTINGS={"aixifan.com":{srcMatching:[{srcRegExp:"(//.+\\.kwimgs\\.com/uhead/.+_)\\w+(@IMG@)",processor:"$1o$2"},{srcRegExp:"(//.+\\.(?:acfun\\.cn|(?:aixifan|kwimgs)\\.com)/[^?]+)\\?image.*",processor:"$1"}]}}; }
  });

  // ajpw.tv.js
  matchRules.push({
    domain: "ajpw.tv",
    apply: function() { window.SITE_SETTINGS={"ajpw.tv":{srcMatching:[{processor:({trigger:r})=>r.querySelector(".image-rotator-image"),selectors:".pop-card"}]}}; }
  });

  // akiba-web.com.js
  matchRules.push({
    domain: "akiba-web.com",
    apply: function() { window.SITE_SETTINGS={"akiba-web.com":{srcMatching:[{srcRegExp:"(//www\\.giga-web\\.jp/.+/(?:sample/\\d+|pac))(?:_\\w+)?(@IMG@)",processor:"$1_l$2"}]}}; }
  });

  // alibaba-inc.com.js
  matchRules.push({
    domain: "alibaba-inc.com",
    apply: function() { window.SITE_SETTINGS={"alibaba-inc.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // alibaba.com.js
  matchRules.push({
    domain: "alibaba.com",
    apply: function() { window.SITE_SETTINGS={"alibaba.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // alicdn.com.js
  matchRules.push({
    domain: "alicdn.com",
    apply: function() { window.SITE_SETTINGS={"alicdn.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // aliexpress.js
  matchRules.push({
    domain: "aliexpress",
    apply: function() { window.SITE_SETTINGS={aliexpress:{ignore:".search-card-item div:empty",srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:e})=>r.test(e)&&tools.getUrlWithParams(e,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // alimama.com.js
  matchRules.push({
    domain: "alimama.com",
    apply: function() { window.SITE_SETTINGS={"alimama.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // aliwx.com.cn.js
  matchRules.push({
    domain: "aliwx.com.cn",
    apply: function() { window.SITE_SETTINGS={"aliwx.com.cn":{srcMatching:[{srcRegExp:"(img-tailor\\.11222\\.cn/bcv/)\\w+(/.+?@IMG@)",processor:"$1raw$2"}]}}; }
  });

  // allelitewrestling.com.js
  matchRules.push({
    domain: "allelitewrestling.com",
    apply: function() { window.SITE_SETTINGS={"allelitewrestling.com":{srcMatching:[{srcRegExp:"(//static\\.wixstatic\\.com/.+?@IMG@).*",processor:"$1"}]}}; }
  });

  // allhistory.com.js
  matchRules.push({
    domain: "allhistory.com",
    apply: function() { window.SITE_SETTINGS={"allhistory.com":{srcMatching:[{srcRegExp:"((?:pic|img)\\.allhistory\\.com/[^?]+).*",processor:"$1"}]}}; }
  });

  // amazon.js
  matchRules.push({
    domain: "amazon",
    apply: function() { window.SITE_SETTINGS={amazon:{onPageLoad:()=>{const e=tools.buildSrcRegExp("(//.*\\.(?:ssl-images|media)-amazon\\.(?:com|[a-z]{2})/images/.*?([-\\w]+))\\..+(@IMG@)");tools.cacheImage(JSON.parse(/'initial'\s*:\s*(\[[^']+\])/.exec(tools.getElementsByTextContent("ImageBlockATF")[0]?.textContent)?.[1]||"null")?.reduce((s,{hiRes:a,thumb:t})=>e.test(t)?[...s,[RegExp.$2,a.replace(e,"$1$3")]]:s,[]))},ignore:"#magnifierLens",srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:'[data-elementid="vse-cards-video-thumbnail"]'},{srcRegExp:"(//.*\\.(?:ssl-images|media)-amazon\\.(?:com|[a-z]{2})/images/.*?([-\\w]+))\\..+(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:s})=>e.test(s)&&(tools.cacheImage(RegExp.$2)||RegExp.$1+RegExp.$3)}]}}; }
  });

  // andino.shop.js
  matchRules.push({
    domain: "andino.shop",
    apply: function() { window.SITE_SETTINGS={"andino.shop":{srcMatching:[{srcRegExp:".+?\\?remote=([^&]+)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&decodeURIComponent(RegExp.$1)},{srcRegExp:"(/storage/images/.+?\\?.+?)width=.*",processor:"$1"}]}}; }
  });

  // aplaybox.com.js
  matchRules.push({
    domain: "aplaybox.com",
    apply: function() { window.SITE_SETTINGS={"aplaybox.com":{referrerAddedHostnames:["oss.aplaybox.com"]}}; }
  });

  // app.runwayml.com.js
  matchRules.push({
    domain: "app.runwayml.com",
    apply: function() { window.SITE_SETTINGS={"app.runwayml.com":{srcMatching:[{srcRegExp:"^.+?\\.runwayml\\.cloud/.+\\?.*\\binput_image=([^&]+).*",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&[decodeURIComponent(RegExp.$1),r]}]}}; }
  });

  // apple.com.js
  matchRules.push({
    domain: "apple.com",
    apply: function() { window.SITE_SETTINGS={"apple.com":{ignore:'[data-testid="play-button"]',srcMatching:[{srcRegExp:"(//store\\.storeimages\\.cdn-apple\\.com/[^?]+\\?).*",processor:"$1wid=1000&fmt=png-alpha"},{srcRegExp:"(//.+?\\.mzstatic\\.com/.+?@IMG@/)(\\d+)x(\\2|\\d+).*(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:p})=>e.test(p)&&`${RegExp.$1}1200x1200${RegExp.$2===RegExp.$3?"cc":"mv"}${RegExp.$4}`}]}}; }
  });

  // arca.live.js
  matchRules.push({
    domain: "arca.live",
    apply: function() { window.SITE_SETTINGS={"arca.live":{srcMatching:[{processor:({trigger:r})=>r.closest(".vrow.column")?.querySelector(".vrow-preview img"),selectors:".vrow.column:has(.vrow-preview) .vcol.col-title"},{srcRegExp:"(//ac)(?:-.+)?(\\.namu\\.la/[^?]+).*",processor:"$1-o$2"}]}}; }
  });

  // archive.org.js
  matchRules.push({
    domain: "archive.org",
    apply: function() { window.SITE_SETTINGS={"archive.org":{srcMatching:[{srcRegExp:"//archive\\.org/services/img/(.+)",processor:({srcRegExpObj:o,triggerSrc:r})=>{const a=o.exec(r)?.[1];return a&&(tools.cacheImage(a)||tools.detectImage(`/download/${a}/${a}.jpg`).catch(()=>tools.fetch(`/download/${a}/${a}_files.xml`,{dataType:"xml",cors:!0}).then(({doc:o})=>{const t=o.evaluate('(/files/file[@source="original" and (format="AVIF" or format="BMP" or format="GIF" or format="GIFV" or format="ICO" or format="JFIF" or format="JPEG" or format="JPG" or format="PNG" or format="PNJ" or format="SVG" or format="WEBP")]|/files/file[@source="derivative" and (format="AVIF" or format="BMP" or format="GIF" or format="GIFV" or format="ICO" or format="JFIF" or format="JPEG" or format="JPG" or format="PNG" or format="PNJ" or format="SVG" or format="WEBP")])[1]/@name',o,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue?.value;return tools.cacheImage(a,t?`/download/${a}/${t}`:r)})))}}]}}; }
  });

  // artstation.com.js
  matchRules.push({
    domain: "artstation.com",
    apply: function() { window.SITE_SETTINGS={"artstation.com":{srcMatching:[{srcRegExp:"(//cdn\\w?\\.artstation\\.com/p/users/covers/.+/)small(/.+@IMG@.*)",processor:"$1default$2"},{srcRegExp:"(//cdn\\w?\\.artstation\\.com/p/marketplace/.+/.+_)small(/.+@IMG@.*)",processor:"$1big$2"},{srcRegExp:"(//cdn\\w?\\.artstation\\.com/.+?/)(?:\\d{14}/)?(?:medium|\\w+_square|thumbnail)(/.+@IMG@.*)",processor:"$1large$2"}]}}; }
  });

  // atresplayer.com.js
  matchRules.push({
    domain: "atresplayer.com",
    apply: function() { window.SITE_SETTINGS={"atresplayer.com":{srcMatching:[{srcRegExp:"(//imagenes\\.atresplayer\\.com/.+?/)(\\d+)x(\\d+)(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${Number(RegExp.$2)>Number(RegExp.$3)?"1920x960":"720x1280"}${RegExp.$4}`}]}}; }
  });

  // aucfan.com.js
  matchRules.push({
    domain: "aucfan.com",
    apply: function() { window.SITE_SETTINGS={"aucfan.com":{srcMatching:[{srcRegExp:"//auctions\\.afimg\\.jp/(\\w+)/(mo|ya)/thumbnail/.+@IMG@",processor:({srcRegExpObj:s,triggerSrc:e})=>s.test(e)&&tools.fetchHdImageFromPageMeta(e,`//aucview.aucfan.com/${"mo"===RegExp.$2?"mbok":"yahoo"}/${RegExp.$1}/`,{fallbackSrc:e})},{srcRegExp:"(//.*\\.(?:ssl-images|media)-amazon\\.(?:com|[a-z]{2})/images/.*?([-\\w]+))\\..+(@IMG@)",processor:"$1$3"},{srcRegExp:"(//i\\.ebayimg\\.com/.+/s-l)\\d+(?:/p)?(@IMG@)",processor:"$12000$2"},{srcRegExp:"(//thumbs\\d+\\.ebaystatic\\.com/.+/l)\\d+(/.+@IMG@)",processor:"$12000$2"},{srcRegExp:"(//i\\.ebayimg\\.com/.+/\\$_)\\d+(@IMG@)",processor:"$110$2"},{srcRegExp:"(//.+?\\.mbokimg\\.mbok\\.jp/\\d+/)\\d+(/.+@IMG@)",processor:"$17$2"},{srcRegExp:"(.+?\\.mercdn\\.net/)thumb/item/.+(/.+@IMG@).*",processor:"$1item/detail/orig/photos$2"},{srcRegExp:"(.+?\\.mercari-shops-static\\.com/.+/)(?:small|medium|large)(/.+@IMG@).*",processor:"$1xlarge$2"},{srcRegExp:"(//.+?\\.c\\.yimg\\.jp/i/)\\w(/.+)",processor:"$1f$2"},{srcRegExp:"(//.+?\\.wear2\\.jp/.+)_\\d+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // auctions.yahoo.co.jp.js
  matchRules.push({
    domain: "auctions.yahoo.co.jp",
    apply: function() { window.SITE_SETTINGS={"auctions.yahoo.co.jp":{srcMatching:[{srcRegExp:"//.+?(/image/[^?]+).*",processor:"//auctions.c.yimg.jp$1"}]}}; }
  });

  // aweidao1.com.js
  matchRules.push({
    domain: "aweidao1.com",
    apply: function() { window.SITE_SETTINGS={"aweidao1.com":{srcMatching:[{srcRegExp:"(image\\d+\\.aweidao1\\.com/)thumb(/.+@IMG@)",processor:"$1image$2"}]}}; }
  });

  // baidu.com.js
  matchRules.push({
    domain: "baidu.com",
    apply: function() { !function(){const e="(.+?)(?:-[-\\w]+-process[,\\w]+)?(\\?.*?)&?x-bce-process=[^&]+(.*)",t="$1$2$3",o="(//.+?\\.(?:baidu|bdstatic)\\.com/it/.+?&fm=\\d+).*",r="$1";window.SITE_SETTINGS={"baidu.com":{srcMatching:[{processor:({trigger:e,triggerSrc:t})=>{const c=e.closest("a"),s=e.dataset.objurl||decodeURIComponent(/objurl=([^&]+)/.exec(c?.href)?.[1]||"");if(!s)try{s=JSON.parse(e.closest("[data-show-ext]")?.dataset.showExt||"null").objurl}catch(e){}return tools.cacheImage(t)||(()=>tools.detectImage(s).catch(()=>tools.fetch(c?.href,{dataType:"html"}).then(({doc:e})=>({src:e?.querySelector("#currentImg")?.src||t})).catch(()=>({src:t}))).then(({src:e})=>tools.cacheImage(t,e?.replace(new RegExp(o),r))))},selectors:'a[href*="objurl"] img,[data-show-ext] img'},{srcRegExp:"(//(?:.+\\.)?(?:bdstatic|himg\\.(?:baidu|bdimg))\\.com/.+)/portrait/(.+)",processor:"$1/portraith/$2"},{srcRegExp:"//(?:gimg\\d*\\.baidu|.+?\\.(?:bdstatic|bdimg))\\.com/.+?\\bsrc=([^&]+)",processor:({srcRegExpObj:c,triggerSrc:s})=>{if(c.test(s)){const c=decodeURIComponent(RegExp.$1),s=new RegExp(e),a=new RegExp(o);return s.test(c)?c.replace(s,t):a.test(c)?c.replace(a,r):c}}},{srcRegExp:"store\\.is\\.autonavi\\.com/showpic/.+",processor:"$&"},{srcRegExp:"(//.+\\.baidu\\.com/forum/).+?/sign=\\w+/(\\w+)(@IMG@)",processor:({srcRegExpObj:e,trigger:t,triggerSrc:o})=>{if(e.test(o)){const e=[RegExp.$1,RegExp.$2,RegExp.$3],r=tools.getContextualLocation(),c=t.closest("[data-tid]")?.dataset.tid||t.closest("[data-thread-id]")?.dataset.threadId||new URLSearchParams(r.search).get("tid")||/\/\/tieba\.baidu\.com\/p\/(\d+)/.exec(r.href)?.[1];return tools.cacheImage(e[1])||(()=>(c?tools.fetch("//tieba.baidu.com/photo/p",{data:{tid:c,pic_id:e[1],alt:"json"}}).then(e=>({src:e?.json?.data?.img?.original?.waterurl||e?.json?.data?.img?.medium?.waterurl,title:e?.json?.data?.title})):tools.detectImage([`${e[0]}pic/item/${e[1]}${e[2]}`,o],e=>238===e.width&&238===e.height)).then(t=>tools.cacheImage(e[1],t)))}}},{processor:e=>tools.getElementAttribute(e,"original"),selectors:"img[original]"},{srcRegExp:"(//.+?\\.(?:baidu|bdstatic)\\.com/it/.+?&fm=\\d+).*",processor:"$1"},{srcRegExp:"(.+@IMG@)@(?:\\w_\\w+,?)+.*",processor:"$1"}]}}}(); }
  });

  // bandcamp.com.js
  matchRules.push({
    domain: "bandcamp.com",
    apply: function() { window.SITE_SETTINGS={"bandcamp.com":{srcMatching:[{srcRegExp:"(f\\d+\\.bcbits\\.com/img/.+_)\\d+(@IMG@)?",processor:"$10$2"}]}}; }
  });

  // bangumi.tv.js
  matchRules.push({
    domain: "bangumi.tv",
    apply: function() { window.SITE_SETTINGS={"bangumi.tv":{ignore:".overlay,#captcha_img_code",srcMatching:[{srcRegExp:"(//lain\\.bgm\\.tv/).+?/(pic/cover/.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//lain\\.bgm\\.tv/pic/user/)\\w(/.+@IMG@)",processor:["$1c$2","$1l$2"]},{srcRegExp:"(//lain\\.bgm\\.tv/pic/(?:\\w+/)+)\\w(/.+@IMG@)",processor:"$1l$2"}]}}; }
  });

  // batdongsan.com.vn.js
  matchRules.push({
    domain: "batdongsan.com.vn",
    apply: function() { window.SITE_SETTINGS={"batdongsan.com.vn":{anonymous:!0,srcMatching:[{srcRegExp:"(//.+?\\.pgimgs\\.com/.+?\\.)[A-Z]\\d+(?:X\\d+|\\w+)?((?:/.+)?@IMG@)",processor:"$1V800$2"},{srcRegExp:"(//.+?\\.iproperty\\.com\\.my/.+/)\\d+x\\d+[^/]*(/.+@IMG@)",processor:"$12000x2000-fit$2"},{srcRegExp:"(.+?/)(?:resize|crop)/\\d+x\\d+/(.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // behance.net.js
  matchRules.push({
    domain: "behance.net",
    apply: function() { window.SITE_SETTINGS={"behance.net":{srcMatching:[{srcRegExp:"(//.+\\.behance\\.net/projects/)\\w+(/.+@IMG@)",processor:"$1original$2"},{srcRegExp:"(//.+\\.behance\\.net/project_modules/)(?:\\w+_)?\\d+(/.+@IMG@)",processor:"$1fs$2"},{srcRegExp:"(//.+\\.behance\\.net/(?:user|team)/)\\d+(/.+@IMG@)",processor:"$1276$2"}]}}; }
  });

  // bestbuy.ca.js
  matchRules.push({
    domain: "bestbuy.ca",
    apply: function() { window.SITE_SETTINGS={"bestbuy.ca":{ignore:".img-overlay,.thumbnailItemContainer_CWxw7 img[class*=middle]",srcMatching:[{srcRegExp:"(//pisces\\.bbystatic\\.com/)prescaled/\\d+/\\d+/(.+@IMG@).*",processor:"$1$2"},{srcRegExp:"(//(?:pisces\\.bbystatic\\.com|merchandising-assets\\.bestbuy\\.ca)/.+@IMG@).*",processor:"$1"},{srcRegExp:"(//multimedia\\.bbycastatic\\.ca/.+?/)\\d+x\\d+(/.+@IMG@)",processor:["$11500x1500$2","$1500x500$2"]}]}}; }
  });

  // bestbuy.com.js
  matchRules.push({
    domain: "bestbuy.com",
    apply: function() { window.SITE_SETTINGS={"bestbuy.com":{ignore:".img-overlay,.thumbnailItemContainer_CWxw7 img[class*=middle]",srcMatching:[{srcRegExp:"(//pisces\\.bbystatic\\.com/)prescaled/\\d+/\\d+/(.+@IMG@).*",processor:"$1$2"},{srcRegExp:"(//(?:pisces\\.bbystatic\\.com|merchandising-assets\\.bestbuy\\.ca)/.+@IMG@).*",processor:"$1"},{srcRegExp:"(//multimedia\\.bbycastatic\\.ca/.+?/)\\d+x\\d+(/.+@IMG@)",processor:["$11500x1500$2","$1500x500$2"]}]}}; }
  });

  // bgm.tv.js
  matchRules.push({
    domain: "bgm.tv",
    apply: function() { window.SITE_SETTINGS={"bgm.tv":{ignore:".overlay,#captcha_img_code",srcMatching:[{srcRegExp:"(//lain\\.bgm\\.tv/).+?/(pic/cover/.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//lain\\.bgm\\.tv/pic/user/)\\w(/.+@IMG@)",processor:["$1c$2","$1l$2"]},{srcRegExp:"(//lain\\.bgm\\.tv/pic/(?:\\w+/)+)\\w(/.+@IMG@)",processor:"$1l$2"}]}}; }
  });

  // bilibili.com.js
  matchRules.push({
    domain: "bilibili.com",
    apply: function() { window.SITE_SETTINGS={"bilibili.com":{maxLookupDepth:7,ignore:".play-mask,.animated-banner,.bili-dyn-card-video__cover__mask",srcMatching:[{thumbType:"posters",processor:({trigger:s})=>s.querySelector('img[src*="hdslb.com/bfs/"],[style*="hdslb.com/bfs/"]'),selectors:':has(>[class*="inline-player"],>.video-box):has(img[src*="hdslb.com/bfs/"],[style*="hdslb.com/bfs/"])'},{thumbType:"posters",srcRegExp:"(.+\\.hdslb\\.com/bfs/(?:archive|live)/.+?@IMG@)[^?]*(\\?.*)?",processor:"$1$2"},{srcRegExp:"(.+\\.hdslb\\.com/.+?@IMG@)[^?]*(\\?.*)?",processor:"$1$2"},{srcRegExp:"(patchwiki\\.biligame\\.com/images/.+?/)thumb/(.+?@IMG@).*",processor:"$1$2"},{srcRegExp:"(.+\\.bili(?:game|img)\\.com/.+?@IMG@).*",processor:"$1"},{processor:({trigger:s})=>s.shadowRoot?.querySelector("#canvas>.layers:nth-child(2)>.layer:first-child img"),selectors:"bili-avatar"}]}}; }
  });

  // biligame.com.js
  matchRules.push({
    domain: "biligame.com",
    apply: function() { window.SITE_SETTINGS={"biligame.com":{maxLookupDepth:7,ignore:".play-mask,.animated-banner,.bili-dyn-card-video__cover__mask",srcMatching:[{thumbType:"posters",processor:({trigger:s})=>s.querySelector('img[src*="hdslb.com/bfs/"],[style*="hdslb.com/bfs/"]'),selectors:':has(>[class*="inline-player"],>.video-box):has(img[src*="hdslb.com/bfs/"],[style*="hdslb.com/bfs/"])'},{thumbType:"posters",srcRegExp:"(.+\\.hdslb\\.com/bfs/(?:archive|live)/.+?@IMG@)[^?]*(\\?.*)?",processor:"$1$2"},{srcRegExp:"(.+\\.hdslb\\.com/.+?@IMG@)[^?]*(\\?.*)?",processor:"$1$2"},{srcRegExp:"(patchwiki\\.biligame\\.com/images/.+?/)thumb/(.+?@IMG@).*",processor:"$1$2"},{srcRegExp:"(.+\\.bili(?:game|img)\\.com/.+?@IMG@).*",processor:"$1"},{processor:({trigger:s})=>s.shadowRoot?.querySelector("#canvas>.layers:nth-child(2)>.layer:first-child img"),selectors:"bili-avatar"}]}}; }
  });

  // bing.com.js
  matchRules.push({
    domain: "bing.com",
    apply: function() { window.SITE_SETTINGS={"bing.com":{noReferrer:!0,ignore:".videoplaying",srcMatching:[{srcRegExp:"//.+(\\.bing\\.(?:com|net))/.+\\?.*(?<=[?&])thId=([^&]+)",processor:({srcRegExpObj:e,trigger:t,triggerSrc:r})=>{var s=JSON.parse(t.closest("a")?.getAttribute("m")||"null");return JSON.parse(s?.CustomData||"null")?.MediaUrl||(e.test(r)?`//th.${RegExp.$1}/th/id/${s?.ThumbnailInfo?.ThumbnailId||RegExp.$2}`:r)},selectors:"a[m] .bceimg"},{srcRegExp:"(//.+\\.bing\\.(?:com|net)/th(?:(?:/id/[^?]+)|[?&]+id=[^&]+)).*",processor:({srcRegExpObj:e,trigger:t,triggerSrc:r})=>{var s=JSON.parse(t.closest(".iusc")?.getAttribute("m")||t.closest("[data-m]")?.dataset.m||"null"),g=e.test(r)||e.test(s?.turl)?RegExp.$1:"";return(s?.murl||g)&&tools.detectImage([s?.murl,g])},selectors:".iusc .mimg,[data-m] img:not(.cimg)"},{srcRegExp:"//.+\\.bing\\.(?:com|net)/th[?&]+q=.+",processor:({srcRegExpObj:e,triggerSrc:t})=>{let r;if(e.test(t)){const e=new URL(t),s=e.searchParams;s.getAll("q").length>1?(s.set("w",4*parseInt(s.get("w"))),s.set("h",4*parseInt(s.get("h")))):(s.delete("w"),s.delete("h")),s.set("qlt",100),r=e.href}return r}}]}}; }
  });

  // book.qq.com.js
  matchRules.push({
    domain: "book.qq.com",
    apply: function() { window.SITE_SETTINGS={"book.qq.com":{srcMatching:[{srcRegExp:"(//.+?\\.(?:qidian|qpic|yuewen)\\.c(?:n|om)/.+)/\\d+(?:@IMG@)?",processor:"$1/0"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:({srcRegExpObj:o,trigger:c})=>o.test(tools.getBackgroundImageSrc(c))&&`${RegExp.$1}o${RegExp.$2}`,selectors:".cover"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:"$1o$2"}]}}; }
  });

  // booking.com.js
  matchRules.push({
    domain: "booking.com",
    apply: function() { window.SITE_SETTINGS={"booking.com":{srcMatching:[{srcRegExp:"(//.+?\\.bstatic\\.com/.+/)\\w+(/\\d+@IMG@.*)",processor:"$1max3000$2"}]}}; }
  });

  // booth.pm.js
  matchRules.push({
    domain: "booth.pm",
    apply: function() { window.SITE_SETTINGS={"booth.pm":{referrerAddedHostnames:["pximg.net"],srcMatching:[{srcRegExp:"(//.+\\.pximg\\.net/user-profile/.+)_\\d+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/.+/.+_thumb/.+)_\\w+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)(?=/).+(/uploads/.+/)(?:.+_)?(\\d+@IMG@)",processor:"$1$2$3"},{srcRegExp:"(//.+\\.pixiv\\.net/images/post/\\d+)/w/\\d+(/.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/).+(/img/.+?)(_p\\d+)?(?:_.+)?(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:p})=>e.test(p)&&tools.detectImage([`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}${RegExp.$4}`,`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}.png`])},{srcRegExp:"(//.+\\.pximg\\.net/)\\w+/\\d+x\\d+[^/]*/(.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)/c!?/[^/]+(/.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // bsky.app.js
  matchRules.push({
    domain: "bsky.app",
    apply: function() { window.SITE_SETTINGS={"bsky.app":{srcMatching:[{srcRegExp:"(//.+?\\.bsky\\.app/img/avatar)_\\w+(/.+)(?:@.+)?",processor:"$1$2"},{srcRegExp:"(//.+?\\.bsky\\.app/img/feed_)\\w+(/.+)(?:@.+)?",processor:"$1fullsize$2"}]}}; }
  });

  // bunnings.js
  matchRules.push({
    domain: "bunnings",
    apply: function() { window.SITE_SETTINGS={bunnings:{maxLookupDepth:5,srcMatching:[{srcRegExp:"(.+?/image-id/\\w+).*",processor:"$1"}]}}; }
  });

  // byrutgame.org.js
  matchRules.push({
    domain: "byrutgame.org",
    apply: function() { window.SITE_SETTINGS={"byrutgame.org":{srcMatching:[{srcRegExp:"(//byrutgame\\.org/.+/)thumbs/(.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // bzmh.org.js
  matchRules.push({
    domain: "bzmh.org",
    apply: function() { window.SITE_SETTINGS={"bzmh.org":{srcMatching:[{srcRegExp:"//pro-api\\.mgsearcher\\.com/.+/image\\?.*\\burl=([^&]+)",processor:({srcRegExpObj:r,triggerSrc:e})=>r.test(e)&&decodeURIComponent(RegExp.$1)}]}}; }
  });

  // camelcamelcamel.com.js
  matchRules.push({
    domain: "camelcamelcamel.com",
    apply: function() { window.SITE_SETTINGS={"camelcamelcamel.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:'[data-elementid="vse-cards-video-thumbnail"]'},{srcRegExp:"(//.*\\.(?:ssl-images|media)-amazon\\.(?:com|[a-z]{2})/images/.*?([-\\w]+))\\..+(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:c})=>e.test(c)&&(tools.cacheImage(RegExp.$2)||RegExp.$1+RegExp.$3)}]}}; }
  });

  // cameo.com.js
  matchRules.push({
    domain: "cameo.com",
    apply: function() { window.SITE_SETTINGS={"cameo.com":{srcMatching:[{srcRegExp:"https?://.*?/(https?://cdn\\.cameo\\.com/v/)(thumb-.*@IMG@)",processor:"$1no-wm-$2"},{srcRegExp:"https?://.*?/(https?://cdn\\.cameo\\.com/thumbnails/.*?)(?:-wm)+(.+@IMG@)",processor:"$1-wm$2"}]}}; }
  });

  // camvideos.me.js
  matchRules.push({
    domain: "camvideos.me",
    apply: function() { window.SITE_SETTINGS={"camvideos.me":{srcMatching:[{srcRegExp:"(//fastimages\\.org/images/.+)\\.th(@IMG@)",processor:"$1$2"}]}}; }
  });

  // cangku.moe.js
  matchRules.push({
    domain: "cangku.moe",
    apply: function() { window.SITE_SETTINGS={"cangku.moe":{srcMatching:[{srcRegExp:".*(https?://.+@IMG@).*",processor:({srcRegExpObj:e,trigger:c})=>e.exec(c.querySelector(".cover")?.dataset.src)?.[1],selectors:".post-card-content"}]}}; }
  });

  // canva.cn.js
  matchRules.push({
    domain: "canva.cn",
    apply: function() { window.SITE_SETTINGS={"canva.cn":{srcMatching:[{srcRegExp:"//.+?\\.canva\\.cn/(?<picId>[^/]+)/\\d+/(?<picIndex>\\d+)/",processor:({srcRegExpObj:e,triggerSrc:a})=>{const{picId:c,picIndex:t}=e.exec(a)?.groups||{};return c&&(tools.cacheImage(`${c}_${t}`)||(()=>tools.fetch("/_ajax/csrf3/marketplace2").then(e=>e?.json?.A).then(e=>tools.fetch("/_ajax/marketplace2/page",{data:{instance:{"A?":"K",A:c}},headers:{"x-csrf-token":e},method:"POST"}).then(e=>tools.cacheImage(e?.json?.preloadImages?.map(({X:e}={},a)=>[`${c}_${a}`,tools.getLargestImageInList(e.V||e,"C","D")?.B])).get(`${c}_${t}`)))))}}]}}; }
  });

  // carousell.js
  matchRules.push({
    domain: "carousell",
    apply: function() { window.SITE_SETTINGS={carousell:{srcMatching:[{srcRegExp:"(//.+?\\.karousell\\.com/.+?)(?:_(?:progressive|thumbnail))+(@IMG@)?",processor:"$1$2"}]}}; }
  });

  // catch.co.nz.js
  matchRules.push({
    domain: "catch.co.nz",
    apply: function() { window.SITE_SETTINGS={"catch.co.nz":{srcMatching:[{srcRegExp:"(//s\\.catch\\.com\\.au/.+)_[^/]+(@IMG@)",processor:"$1$2"},{srcRegExp:"(/magazine/.+?)(?:-\\d+x\\d+)?(@IMG@)",processor:"$1$2"}]}}; }
  });

  // catch.com.au.js
  matchRules.push({
    domain: "catch.com.au",
    apply: function() { window.SITE_SETTINGS={"catch.com.au":{srcMatching:[{srcRegExp:"(//s\\.catch\\.com\\.au/.+)_[^/]+(@IMG@)",processor:"$1$2"},{srcRegExp:"(/magazine/.+?)(?:-\\d+x\\d+)?(@IMG@)",processor:"$1$2"}]}}; }
  });

  // cellphones.com.vn.js
  matchRules.push({
    domain: "cellphones.com.vn",
    apply: function() { window.SITE_SETTINGS={"cellphones.com.vn":{srcMatching:[{srcRegExp:"//.+?\\.cellphones\\.com\\.vn/.+?https?://(.+)",processor:"//$1"}]}}; }
  });

  // chatgpt.com.js
  matchRules.push({
    domain: "chatgpt.com",
    apply: function() { window.SITE_SETTINGS={"chatgpt.com":{referrerAddedHostnames:["oaiusercontent.com"]}}; }
  });

  // chaturbate.com.js
  matchRules.push({
    domain: "chaturbate.com",
    apply: function() { window.SITE_SETTINGS={"chaturbate.com":{srcMatching:[{srcRegExp:"//thumb(\\.live\\.mmcdn\\.com/)riw/(.+)@IMG@.*",processor:()=>[`//jpeg$1stream?room=$2&f=${Date.now()}`]},{srcRegExp:"//static-pub\\.highwebmedia\\.com/.+@IMG@",processor:({trigger:e,triggerSrc:o})=>{const t=/\/photoset\/detail\/.+?\/(\d+)/.exec(e.closest("a")?.href)?.[1];return t&&(tools.cacheImage(t)||(()=>tools.fetch(`/photo_videos/api/photoset_links/${t}/`).then(e=>tools.cacheImage(t,/\/photos\//.test(e?.json?.urls?.[0])?RegExp.$_:o))))},selectors:'a[href*="/photoset/detail/"]>img'}]}}; }
  });

  // chemistwarehouse.js
  matchRules.push({
    domain: "chemistwarehouse",
    apply: function() { window.SITE_SETTINGS={chemistwarehouse:{ignore:".lb-nav",srcMatching:[{srcRegExp:"(//static\\.chemistwarehouse\\.(?:co\\.nz|com\\.au)/.+_)\\d+(@IMG@)",processor:"$1800$2"}]}}; }
  });

  // chii.in.js
  matchRules.push({
    domain: "chii.in",
    apply: function() { window.SITE_SETTINGS={"chii.in":{ignore:".overlay,#captcha_img_code",srcMatching:[{srcRegExp:"(//lain\\.bgm\\.tv/).+?/(pic/cover/.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//lain\\.bgm\\.tv/pic/user/)\\w(/.+@IMG@)",processor:["$1c$2","$1l$2"]},{srcRegExp:"(//lain\\.bgm\\.tv/pic/(?:\\w+/)+)\\w(/.+@IMG@)",processor:"$1l$2"}]}}; }
  });

  // chuangshi.qq.com.js
  matchRules.push({
    domain: "chuangshi.qq.com",
    apply: function() { window.SITE_SETTINGS={"chuangshi.qq.com":{srcMatching:[{srcRegExp:"(//.+?\\.(?:qidian|qpic|yuewen)\\.c(?:n|om)/.+)/\\d+(?:@IMG@)?",processor:"$1/0"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:({srcRegExpObj:c,trigger:e})=>c.test(tools.getBackgroundImageSrc(e))&&`${RegExp.$1}o${RegExp.$2}`,selectors:".cover"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:"$1o$2"}]}}; }
  });

  // civitai.com.js
  matchRules.push({
    domain: "civitai.com",
    apply: function() { window.SITE_SETTINGS={"civitai.com":{ignore:'img[src*="user avatar decoration"]',srcMatching:[{srcRegExp:"(//image\\.civitai\\.com/.+)/[\\w=,]+(/.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // cnu.cc.js
  matchRules.push({
    domain: "cnu.cc",
    apply: function() { window.SITE_SETTINGS={"cnu.cc":{ignore:".work-thumbnail .author",srcMatching:[{srcRegExp:"(//imgoss\\.cnu\\.cc/.+?x-oss-process=)[^&]+(.*)",processor:"$1style/content$2"},{srcRegExp:"(//www\\.cnu\\.cc/uploads/avatar/images/\\w+_)\\d+(@IMG@)",processor:"$1200$2"}]}}; }
  });

  // coomer.su.js
  matchRules.push({
    domain: "coomer.su",
    apply: function() { window.SITE_SETTINGS={"coomer.su":{srcMatching:[{srcRegExp:"//img\\.coomer\\.su/thumbnail/(.+)",processor:["//n1.coomer.su/$1"]}]}}; }
  });

  // coupang.com.js
  matchRules.push({
    domain: "coupang.com",
    apply: function() { window.SITE_SETTINGS={"coupang.com":{srcMatching:[{srcRegExp:"//thumbnail(\\d+\\.coupangcdn\\.com)/.+?(/image\\d*/.+@IMG@)",processor:"//image$1$2"}]}}; }
  });

  // craigslist.org.js
  matchRules.push({
    domain: "craigslist.org",
    apply: function() { window.SITE_SETTINGS={"craigslist.org":{srcMatching:[{srcRegExp:"(//images\\.craigslist\\.org/.+_)\\w+(@IMG@)",processor:"$11200x900$2"}]}}; }
  });

  // crunchyroll.com.js
  matchRules.push({
    domain: "crunchyroll.com",
    apply: function() { window.SITE_SETTINGS={"crunchyroll.com":{ignore:'[class*="playable-card__hover-info"]',srcMatching:[{srcRegExp:"(//.+?\\.crunchyroll\\.com/)cdn-cgi/image/[^/]*/(.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // ctrip.com.js
  matchRules.push({
    domain: "ctrip.com",
    apply: function() { window.SITE_SETTINGS={"ctrip.com":{srcMatching:[{srcRegExp:"(//.+\\.(?:c-ctrip|tripcdn)\\.com/.+?)(?:_\\w+)*(@IMG@)",processor:"$1$2"}]}}; }
  });

  // curseforge.com.js
  matchRules.push({
    domain: "curseforge.com",
    apply: function() { window.SITE_SETTINGS={"curseforge.com":{srcMatching:[{srcRegExp:"(//(?:\\d+\\.)?media\\.forgecdn\\.net/avatars/)thumbnails/(\\d+/\\d+/)\\d+/\\d+/(\\d+)(?:_\\w+)?(\\..+)",processor:"$1$2$3$4"}]}}; }
  });

  // customink.com.js
  matchRules.push({
    domain: "customink.com",
    apply: function() { window.SITE_SETTINGS={"customink.com":{srcMatching:[{srcRegExp:"(//.+?\\.customink\\.com/.+?)_(?:large|medium|small)(?:_\\w+)?(@IMG@).*",processor:["$1$2","$1_large$2"]}]}}; }
  });

  // dailymotion.com.js
  matchRules.push({
    domain: "dailymotion.com",
    apply: function() { window.SITE_SETTINGS={"dailymotion.com":{srcMatching:[{srcRegExp:"/video/(\\w+)",processor:({srcRegExpObj:e,trigger:t,triggerSrc:o})=>{const r=e.test((t.closest('a[href^="/video/"]')||t.closest('[data-testid="video-card"]')?.querySelector('a[href^="/video/"]'))?.href)?RegExp.$1:"";return r&&(tools.cacheImage(r)||(()=>tools.fetch(`/player/metadata/video/${r}`).then(e=>tools.cacheImage(r,{src:o,title:e?.json?.title,...tools.getLargestImageInList(e?.json?.thumbnails)||null}))))}},{srcRegExp:"[^/]+(?=/x\\d+$)",processor:({srcRegExpObj:e,triggerSrc:t})=>tools.cacheImage(e.exec(t)?.[0])}]}}; }
  });

  // dangdang.com.js
  matchRules.push({
    domain: "dangdang.com",
    apply: function() { window.SITE_SETTINGS={"dangdang.com":{ignore:".pic_kong",srcMatching:[{srcRegExp:"(//.*\\.(?:ddimg\\.cn|dangdang\\.com)/[^_]+?)_[^oy]((?:_?\\w+)?@IMG@)",processor:"$1_o$2"}]}}; }
  });

  // ddproperty.com.js
  matchRules.push({
    domain: "ddproperty.com",
    apply: function() { window.SITE_SETTINGS={"ddproperty.com":{srcMatching:[{srcRegExp:"(//.+?\\.pgimgs\\.com/.+?\\.)[A-Z]\\d+(?:X\\d+|\\w+)?((?:/.+)?@IMG@)",processor:"$1V800$2"},{srcRegExp:"(//.+?\\.iproperty\\.com\\.my/.+/)\\d+x\\d+[^/]*(/.+@IMG@)",processor:"$12000x2000-fit$2"}]}}; }
  });

  // designspiration.com.js
  matchRules.push({
    domain: "designspiration.com",
    apply: function() { window.SITE_SETTINGS={"designspiration.com":{srcMatching:[{processor:({trigger:r})=>r.querySelector("img"),selectors:".gridItemInnerWrap"}]}}; }
  });

  // desuarchive.org.js
  matchRules.push({
    domain: "desuarchive.org",
    apply: function() { window.SITE_SETTINGS={"desuarchive.org":{srcMatching:[{processor:({trigger:e})=>e.closest(".thread_image_link").href,selectors:".thread_image_link .post_image"},{srcRegExp:"(//desu-usergeneratedcontent\\.xyz/.+?/)thumb(/.+)[a-z](@IMG@)",processor:"$1image$2$3"}]}}; }
  });

  // deviantart.com.js
  matchRules.push({
    domain: "deviantart.com",
    apply: function() { !function(){function e(e,t){return window.scrfToken||(window.scrfToken=tools.getElementsByTextContent("__CSRF_TOKEN__")[0]?.textContent.match(/__CSRF_TOKEN__\s*=\s*['"]([^'"]+)['"]/)?.[1]),tools.fetch(e,{data:{...t,include_session:!1,csrf_token:window.scrfToken}}).then(({json:e})=>e)}function t(t,a){return tools.cacheImage(t)||/deviantart\.com\/[^/]+\/art\//.test(a)&&function(t,a){const{deviationId:i,username:o}=/deviantart\.com\/(?<username>[^/]+)\/art\/.+?(?<deviationId>\d+)$/.exec(a)?.groups||{};return()=>e("/_puppy/dadeviation/init",{deviationid:i,type:"art",username:o}).then(e=>r({...e?.deviation||{},imageId:t},t))}(t,a)||/deviantart\.com\/[^/]+\/(?:favourites|gallery)\//.test(a)&&function(t,a){const{folderName:i,username:o}=/deviantart\.com\/(?<username>[^/]+)\/(?<folderName>[^/]+)\//.exec(a)?.groups||{};function n({media:e,subfolders:t,title:r}={}){const a=/\/\/images-wixmp-\w{24}\.wixmp\.com\/.+\/(\w{7})[-\w.]+$/.exec(e?.baseUri)?.[1];return a?[{imageId:a,media:e,title:r},...t?.flatMap(({subfolders:e,thumb:t={}})=>n({...t,subfolders:e}))||[]]:[]}return()=>e(`/_puppy/dauserprofile/init/${i}`,{username:o,with_subfolders:!0}).then(e=>r(e?.gruser?.page?.modules?.flatMap(({name:e,moduleData:t})=>{switch(e){case"folders":return t?.folders?.results?.flatMap(({subfolders:e,thumb:t={}})=>n({...t,subfolders:e}))||[];case"folder_deviations":return t?.deviations?.flatMap(n)||[];case"cover_deviation":return n(t?.coverDeviation?.coverDeviation||{})}}),t))}(t,a)||a?.hasOwnProperty("media")&&r({...a,imageId:t},t)}function r(e=[],t){return tools.cacheImage([].concat(e).reduce((e,{imageId:t,media:{baseUri:r,prettyName:a,token:i,types:o}={},title:n})=>{const s=o?.find(({t:e})=>"fullview"===e)||o?.filter(({c:e})=>e).sort(({h:e,w:t},{h:r,w:a})=>e*t-r*a).pop()||null;return t?[...e,[t,{src:`${r}${s?.c?tools.prefixString(`${s.c.replace("<prettyName>",a||"").replace(/(?<=\/)\w+,[^\/]+(?=\/)/,e=>e.split(",").filter(e=>/^[wh]_/.test(e)).join())}`,"/"):""}${i?`?token=${i[0]}`:""}`,..."Untitled"!==n&&{title:n}}]]:e},[])),tools.cacheImage(t)}window.SITE_SETTINGS={"deviantart.com":{srcMatching:[{srcRegExp:"(//a\\.deviantart\\.net/avatars)(?:-\\w+)?(/.+@IMG@).*",processor:"$1-big$2"},{exclusive:!1,srcRegExp:"//images-wixmp-\\w{24}\\.wixmp\\.com/.+?/(\\w{7})[-\\w]+?@IMG@",processor:({srcRegExpObj:e,trigger:r,triggerSrc:a})=>e.test(a)&&t(RegExp.$1,r.closest(".j93c8")?.previousElementSibling?.href||JSON.parse(r.closest("figure[data-deviation]")?.dataset.deviation||"null")||r.closest("a")?.href)||a,selectors:".du9kK + .j93c8 img,figure[data-deviation] img"}]}}}(); }
  });

  // dgtle.com.js
  matchRules.push({
    domain: "dgtle.com",
    apply: function() { window.SITE_SETTINGS={"dgtle.com":{srcMatching:[{srcRegExp:"(//.+\\.dgtle\\.com/.+?)(?:_\\d+){0,2}(@IMG@).*",processor:"$1$2"}]}}; }
  });

  // dhgate.com.js
  matchRules.push({
    domain: "dhgate.com",
    apply: function() { window.SITE_SETTINGS={"dhgate.com":{srcMatching:[{srcRegExp:"(//.+?\\.dhresource\\.com/.*?)\\d+x\\d+(/.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // dianping.com.js
  matchRules.push({
    domain: "dianping.com",
    apply: function() { window.SITE_SETTINGS={"dianping.com":{onPageLoad:()=>{if(location.pathname?.startsWith("/note/")){const e=tools.buildSrcRegExp("//qcloud\\.dpfile\\.com/\\w+/(\\w+).+@IMG@");tools.cacheImage(JSON.parse(/window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\})/.exec(tools.getElementsByTextContent("__INITIAL_STATE__")[0]?.textContent)?.[1]||"null")?.recommendInfo?.recommendInfo?.flatMap(({storyFeedPics:t})=>t?.reduce((t,{bigUrl:o})=>e.test(o)?[...t,[RegExp.$1,o]]:t,[])||[]))}},srcMatching:[{srcRegExp:"(//.+\\.meituan\\.net/)(?:[\\d.]+/)?(.+?@IMG@).*",processor:"$1$2"},{srcRegExp:"//qcloud\\.dpfile\\.com/\\w+/(\\w+).+@IMG@",processor:({srcRegExpObj:e,trigger:t,triggerSrc:o})=>{if(e.test(o)){const e=RegExp.$1,n=tools.cacheImage(e),s=JSON.parse(t.closest("[data-mv]")?.dataset.mv||"null"),c=s?.valLab?.feed_type&&s.valLab.index;return n?tools.detectImage([n,o]):c?()=>tools.fetch(`/note/${c}`,{dataType:"html"}).then(({doc:e})=>{const{url:t,title:n}=JSON.parse(/window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\})/.exec(tools.getElementsByTextContent("__INITIAL_STATE__",e)[0]?.textContent)?.[1]||"null")?.feedInfo?.feedInfo?.feedPicList?.[0]||{};return tools.detectImage([t,o]).then(e=>({...e,title:n}))}).then(({src:t,title:o})=>tools.cacheImage(e,{src:t,title:o})):o}}}]}}; }
  });

  // discord.com.js
  matchRules.push({
    domain: "discord.com",
    apply: function() { window.SITE_SETTINGS={"discord.com":{srcMatching:[{srcRegExp:"(//.+@IMG@\\?.*&?size=).*",processor:"$14096"},{srcRegExp:"(//.+/attachments/.+\\?.*?)(?:&?(?:height|quality|width)=[^&]*)+(.*)",processor:"$1$2"},{srcRegExp:"//.+/external/.+/(https?)/([^?]+).*",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&{triggerSrc:`${RegExp.$1}://${decodeURIComponent(RegExp.$2)}`,commonRulesOnly:!0}}]}}; }
  });

  // dizilah.com.js
  matchRules.push({
    domain: "dizilah.com",
    apply: function() { window.SITE_SETTINGS={"dizilah.com":{srcMatching:[{srcRegExp:"(//img\\.dizi\\.la/.+?/)responsive-images(/.+?)_{3}.+(@IMG@)",processor:"$1conversions$2-medium$3"},{srcRegExp:"(//img\\.dizi\\.la/.+)-thumb(@IMG@)",processor:["$1-medium$2"]}]}}; }
  });

  // dlsite.com.js
  matchRules.push({
    domain: "dlsite.com",
    apply: function() { window.SITE_SETTINGS={"dlsite.com":{srcMatching:[{srcRegExp:"(//img\\.dlsite\\.jp/)resize(/.+)_\\d+x\\d+(@IMG@)",processor:"$1modpub$2$3"}]}}; }
  });

  // douban.com.js
  matchRules.push({
    domain: "douban.com",
    apply: function() { window.SITE_SETTINGS={"douban.com":{srcMatching:[{srcRegExp:"(//img\\d+\\.doubanio\\.com/p?view/\\w+/).*(/public/.+@IMG@)",processor:({srcRegExpObj:o,trigger:c})=>{const e=tools.getBackgroundImageSrc(getComputedStyle(c).backgroundImage.split(/\s*,\s*/).at(-1)),r=o.exec(e);return r?[`${r[1]}ul${r[2]}`,`${r[1]}l${r[2]}`,e]:e},selectors:'.avatar[style*="background-image"]'},{srcRegExp:"(//img\\d+\\.doubanio\\.com/p?view/\\w+/).*(/public/.+@IMG@)",processor:["$1ul$2","$1l$2"]},{srcRegExp:"(//img\\d+\\.doubanio\\.com/icon/)up?([-\\d]+@IMG@)",processor:"$1ul$2"}]}}; }
  });

  // douyin.com.js
  matchRules.push({
    domain: "douyin.com",
    apply: function() { window.SITE_SETTINGS={"douyin.com":{maxLookupDepth:3,ignore:'.discover-video-card-img,[style*="background-image"]~img[src*="tos"],xg-video-container,.XWe15cU_,.S9w0tYH_',srcMatching:[{srcRegExp:"(//.*\\.douyinpic\\.com/)(?:aweme/\\d+x\\d+/)?(aweme-avatar/[^.?]+)(@IMG@)?.*",processor:["$1$2~noop$3","$1$2~noop.image","$&"]},{srcRegExp:"//.+?\\.(?:douyinpic|byteimg)\\.com/((?:tos-[-\\w]+|image-cut-tos(?:-priv)?|douyin-user-image-file)/\\w+).+@IMG@",processor:({srcRegExpObj:e,triggerSrc:o})=>e.test(o)&&tools.cacheImage(RegExp.$1)},{thumbType:"posters",getPlayer:({trigger:e})=>e?.querySelector(".xgplayer video"),processor:({trigger:e})=>e.querySelector("img"),selectors:".videoImage"},{thumbType:"posters",getPlayer:()=>document.querySelector(".xgplayer:not(.xgplayer-inactive) video"),processor:({trigger:e})=>e,selectors:'a[href*="live.douyin.com"] img'},{srcRegExp:"(//.*\\.(?:douyinpic|ecombdimg)\\.com/.+?~).+(@IMG@).*",processor:["$1noop$2"]}]}}; }
  });

  // douyu.com.js
  matchRules.push({
    domain: "douyu.com",
    apply: function() { window.SITE_SETTINGS={"douyu.com":{ignore:'[class*="playIcon"]',srcMatching:[{srcRegExp:"(//.+?\\.douyucdn\\.cn/.+_)(?:small|middle)(@IMG@).*",processor:"$1big$2"},{srcRegExp:"(//.+?\\.douyucdn\\.cn/.+?_src_\\d+@IMG@).*",processor:"$1"}]}}; }
  });

  // dreamina.capcut.com.js
  matchRules.push({
    domain: "dreamina.capcut.com",
    apply: function() { !function(){function e(r){const o=/\/(tos-[-\w]+\/\w+)/;return r?.flatMap(({author:r,collection:c,common_attr:s,image:a})=>[...o.test(r?.avatar_url)?[[RegExp.$1,RegExp.$_]]:[],...c?e(c.item_list):[],...o.test(t(a?.large_images)?.image_url)?[[RegExp.$1,RegExp.$_]]:[],...o.test(t(Object.entries(s?.cover_url_map||{}).map(([e,t])=>{const r=/^(?<height>\d+)$/.exec(e)?.groups||/^.*w:(?<width>\d+)-h:(?<height>\d+)$/.exec(e)?.groups||{};return{...r,width:r.width??r.height,url:t}}))?.url||s?.cover_url)?[[RegExp.$1,RegExp.$_]]:[]])}function t(e,t="width",r="height"){return(Array.isArray(e)?e:Object.entries(e||{}).map(([e,t])=>({height:parseInt(e),src:t}))).sort(({[t]:e=1,[r]:o=1},{[t]:c=1,[r]:s=1})=>(c*s||0)-(e*o||0))?.[0]}window.SITE_SETTINGS={"dreamina.capcut.com":{anonymous:!0,onPageLoad:()=>{const t=/^.*__get_explore_result\s*=\s*(\{.*?\})(?:;|$)/s;tools.cacheImage(e(JSON.parse(t.exec(tools.getElementsByTextContent("window.__get_explore_result=").find(({textContent:e})=>t.test(e))?.textContent)?.[1]||"null")?.data?.item_list))},referrerAddedHostnames:["byteimg.com","byteacctimg.com","ibyteimg.com"],srcMatching:[{srcRegExp:"(//.+?\\.i?byte(?:acct)?img\\.com/img/user-avatar/.+~).+(@IMG@)",processor:"$1noop$2"},{srcRegExp:"//.+?\\.i?byte(?:acct)?img\\.com/(tos-[-\\w]+/\\w+).+@IMG@",processor:({srcRegExpObj:e,triggerSrc:t})=>e.test(t)&&tools.cacheImage(RegExp.$1)||t}]}}}(); }
  });

  // dribbble.com.js
  matchRules.push({
    domain: "dribbble.com",
    apply: function() { window.SITE_SETTINGS={"dribbble.com":{srcMatching:[{srcRegExp:"(cdn\\.dribbble\\.com/users/\\d+/avatars/)(?:mini|small|normal)(/(?:.+@IMG@|data))",processor:"$1original$2"}]}}; }
  });

  // dt18.com.js
  matchRules.push({
    domain: "dt18.com",
    apply: function() { window.SITE_SETTINGS={"dt18.com":{ignore:'img[src*="play-box"]',referrerAddedHostnames:["dt18.com"],srcMatching:[{srcRegExp:"(//.+?\\.dt18\\.com/.+/)th.+?/(.+@IMG@)",processor:["$1t$2","$1$2"]},{srcRegExp:"(//cdn\\.dt18\\.com/images/names/)\\w+(/.+@IMG@)",processor:"$1big$2"},{srcRegExp:"//cdn\\.dt18\\.com/(?:covers|media/movies)/.+/(\\d+).*@IMG@",processor:({srcRegExpObj:e,triggerSrc:c})=>{const r=e.exec(c)?.[1],t=tools.buildSrcRegExp(`/full_covers/.+/${r}.*?-back-.*@IMG@`),o=[...document.querySelectorAll('a[href*="/full_covers/"]')].find(({href:e})=>t.test(e))?.href;return/\/back\//.test(c)?o:r&&(tools.cacheImage(r)||(()=>tools.fetch(`/movies/${r}`,{dataType:"html"}).then(({doc:e})=>e?.querySelector("#enlargecover")?.dataset.featherlight).then(e=>tools.cacheImage(r,e))))}},{srcRegExp:"//cdn\\.dt18\\.com/.+?/scenes/(\\d+)/\\d+/(\\d+).*?@IMG@",processor:({srcRegExpObj:e,triggerSrc:c})=>{const r=e.exec(c)?.slice(1).join("");return r&&(tools.cacheImage(r)||(()=>tools.fetch(`/scenes/${r}`,{dataType:"html"}).then(({doc:e})=>{const c=e?.querySelector("#playpriimage");return c&&{src:c.src,title:c.alt}}).then(e=>tools.cacheImage(r,e))))}}]}}; }
  });

  // duckduckgo.com.js
  matchRules.push({
    domain: "duckduckgo.com",
    apply: function() { window.SITE_SETTINGS={"duckduckgo.com":{srcMatching:[{srcRegExp:"(//external-content\\.duckduckgo\\.com/iu/\\?u=)([^&]+)",processor:({srcRegExpObj:e,triggerSrc:c})=>{if(e.test(c)){const e=RegExp.$1,c=decodeURIComponent(RegExp.$2),t=tools.cacheImage(new URL(c).searchParams.get("id")||/\/th\/id\/([^/?]+)/.exec(c)?.[1]);if(t)return[t,{...t,src:`${e}${encodeURIComponent(t.src)}`}];if(/.+\.bing\.(?:com|net)\/th\?id=.+/.test(c)){const e=new URL(RegExp["$&"]),c=e.searchParams;return c.delete("w"),c.delete("h"),c.set("qlt",100),e.href}return[c]}}}]}}; }
  });

  // duitang.com.js
  matchRules.push({
    domain: "duitang.com",
    apply: function() { window.SITE_SETTINGS={"duitang.com":{srcMatching:[{srcRegExp:"(.+\\.(?:dtstatic|duitang)\\.com/uploads/[^.]+).*(@IMG@).*",processor:"$1$2"}]}}; }
  });

  // dzen.ru.js
  matchRules.push({
    domain: "dzen.ru",
    apply: function() { window.SITE_SETTINGS={"dzen.ru":{ignore:'[class*="video-feed--video-player"]',srcMatching:[{srcRegExp:"(//avatars\\.dzeninfra\\.ru/get-zen.+/)\\w+",processor:"$1scale_2400"},{srcRegExp:"(//avatars\\.dzeninfra\\.ru/get-ynews/.+/)\\d+x\\d+",processor:"$1800x400"}]}}; }
  });

  // e-talenta.eu.js
  matchRules.push({
    domain: "e-talenta.eu",
    apply: function() { window.SITE_SETTINGS={"e-talenta.eu":{srcMatching:[{srcRegExp:"(//media\\.e-talenta\\.eu/foto/)\\d+/\\d+/(\\d+@IMG@.*)",processor:"$1$2"}]}}; }
  });

  // e621.net.js
  matchRules.push({
    domain: "e621.net",
    apply: function() { window.SITE_SETTINGS={"e621.net":{srcMatching:[{srcRegExp:"(//static\\d*\\.e621\\.net/data/)(?:crop|preview|sample)/(.+)(@IMG@)",processor:({srcRegExpObj:e,trigger:r,triggerSrc:t})=>{const c=e.exec(t),{fileUrl:s,largeUrl:a}=r.closest("[data-file-url]")?.dataset||{};return c&&(a||s||["$1$2.png","$1$2$3"])}}]}}; }
  });

  // ebay.js
  matchRules.push({
    domain: "ebay",
    apply: function() { window.SITE_SETTINGS={ebay:{srcMatching:[{srcRegExp:"(//i\\.ebayimg\\.com/.+/s-l)\\d+(?:/p)?(@IMG@)",processor:"$12000$2"},{srcRegExp:"(//thumbs\\d+\\.ebaystatic\\.com/.+/l)\\d+(/.+@IMG@)",processor:"$12000$2"},{srcRegExp:"(//i\\.ebayimg\\.com/.+/\\$_)\\d+(@IMG@)",processor:"$110$2"}]}}; }
  });

  // edition.cnn.com.js
  matchRules.push({
    domain: "edition.cnn.com",
    apply: function() { window.SITE_SETTINGS={"edition.cnn.com":{maxLookupDepth:4,srcMatching:[{srcRegExp:"(//media.cnn.com/api/v\\d+/images/.+@IMG@).*",processor:"$1?q=w_auto"}]}}; }
  });

  // elements.envato.com.js
  matchRules.push({
    domain: "elements.envato.com",
    apply: function() { window.SITE_SETTINGS={"elements.envato.com":{srcMatching:[{processor:({trigger:e,triggerSrc:t})=>{const{defaultSrc:r,link:a}=e instanceof HTMLAnchorElement?{defaultSrc:tools.getLargestImageSrc(e.parentElement?.parentElement?.querySelector("img"))?.src,link:e.getAttribute("href")}:{defaultSrc:t,link:e.parentElement.getAttribute("href")};return a&&(tools.cacheImage(a)||(()=>tools.fetch("/data-api/page/item-detail-neue",{data:{path:a,languageCode:document.documentElement.lang||"en"}}).then(e=>{const t=e?.json?.data?.status,a=e?.json?.data?.data?.item;return"success"===t?{src:tools.getLargestImageInList(Object.entries(a?.coverImageUrls||{}).map(([e,t])=>{const r=/^w(?<width>\d+)$/.exec(e)?.groups||/^.*(?<width>\d+)x(?<height>\d+)$/.exec(e)?.groups||{};return{...r,height:r.height??r.width/(a?.aspectRatio||1),url:t}}))?.url,title:a?.slug||a?.title}:r}).then(e=>tools.cacheImage(a,e))))},selectors:'a[href^="/"]:empty,a[href^="/"] > img'}]}}; }
  });

  // entamenext.com.js
  matchRules.push({
    domain: "entamenext.com",
    apply: function() { window.SITE_SETTINGS={"entamenext.com":{srcMatching:[{srcRegExp:"(//(?:.+\\.)?entamenext\\.com/.+/)\\d+x\\d+(/.+@IMG@)",processor:"$1ORG$2"}]}}; }
  });

  // epicgames.com.js
  matchRules.push({
    domain: "epicgames.com",
    apply: function() { window.SITE_SETTINGS={"epicgames.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:".css-u421q6,.css-yb58t8"},{srcRegExp:"(//.+?\\.epicgames\\.com/.+?)(?:_[a-z]+)+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // eporner.com.js
  matchRules.push({
    domain: "eporner.com",
    apply: function() { window.SITE_SETTINGS={"eporner.com":{ignore:'a>div[style*="background-image"]:empty',srcMatching:[{srcRegExp:"(//.+?\\.eporner\\.com/thumbs/.+_)\\d+(@IMG@)",processor:"$1360$2"},{srcRegExp:"(//.+?\\.eporner\\.com/gallery/.+)_\\d+x\\d+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // erome.com.js
  matchRules.push({
    domain: "erome.com",
    apply: function() { window.SITE_SETTINGS={"erome.com":{srcMatching:[{srcRegExp:"(//.+?\\.erome\\.com/.+/)thumbs/(.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // etao.com.js
  matchRules.push({
    domain: "etao.com",
    apply: function() { window.SITE_SETTINGS={"etao.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // etsy.com.js
  matchRules.push({
    domain: "etsy.com",
    apply: function() { window.SITE_SETTINGS={"etsy.com":{srcMatching:[{srcRegExp:"(//.+\\.etsystatic\\.com/isc/.+?_)\\d+x\\d+(.*@IMG@.*)",processor:"$1190x190$2"},{srcRegExp:"(//.+\\.etsystatic\\.com/.+?_)\\d+x(?:\\d+|N)(.*@IMG@.*)",processor:"$1fullxfull$2"},{srcRegExp:"(//.+\\.etsystatic\\.com/video/upload/)[^/]+/(.*@IMG@.*)",processor:"$1$2"}]}}; }
  });

  // f95zone.to.js
  matchRules.push({
    domain: "f95zone.to",
    apply: function() { window.SITE_SETTINGS={"f95zone.to":{srcMatching:[{srcRegExp:"(//(?:.+\\.)?f95zone\\.to/data/avatars/)\\w+(/.+@IMG@)",processor:"$1o$2"},{srcRegExp:"(//(?:.+\\.)?f95zone\\.to/.+/)thumb/(.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // fab.com.js
  matchRules.push({
    domain: "fab.com",
    apply: function() { !function(){function t(t,e){return t?.map(({images:t,mediaUrl:a,type:i}={})=>/\/image_previews\/[^/]+\/([^/]+)/.test("model"===i&&function(t,e="width",a="height"){return(Array.isArray(t)?t:Object.entries(t||{}).map(([t,e])=>({height:parseInt(t),src:e}))).sort(({[e]:t=1,[a]:i=1},{[e]:s=1,[a]:r=1})=>(s*r||0)-(t*i||0))?.[0]}(t)?.url||a)&&[RegExp.$1,{src:RegExp.$_,title:e}])||[]}window.SITE_SETTINGS={"fab.com":{onPageLoad:()=>{const e=JSON.parse((new DOMParser).parseFromString(document.querySelector("#js-dom-data-prefetched-data")?.firstChild.textContent||"","text/html").body.textContent.trim()||"null")?.initialState;tools.cacheImage([].concat(Object.entries(e?.api||{}).filter(([t])=>t.startsWith("/i/layouts/")).flatMap(([e,{result:a}])=>a?.blades?.flatMap(({tiles:e})=>e?.flatMap(({featuredListings:e,listing:a}={})=>[].concat(e||[],a||[]).flatMap(({thumbnails:e,title:a})=>t(e,a)))||[])||[]),t(Object.values(e?.entities?.medias||{})),Object.values(e?.entities?.searchResultsListing||{}).flatMap(({thumbnails:e,title:a})=>t(e,a))))},srcMatching:[{srcRegExp:"//.+?\\.fab\\.com/image_previews/[^/]+/([^/]+)/.+@IMG@",processor:({srcRegExpObj:t,triggerSrc:e})=>t.test(e)&&tools.cacheImage(RegExp.$1)}]}}}(); }
  });

  // facebook.com.js
  matchRules.push({
    domain: "facebook.com",
    apply: function() { !function(){function e(e,r){const o=e?.startsWith("http")?s.test(e.replaceAll("\\",""))&&(RegExp.$1||RegExp.$2||RegExp.$3||RegExp.$4):e;return o?tools.cacheImage(o)||(()=>tools.fetch(`/${o}`,{dataType:"html"}).then(({html:e})=>/"profile_?Photo"\s*:\s*\{.*?"url"\s*:\s*".*?[?&]fbid=([^&]+)/i.test(e)?t(RegExp.$1):/"profilePic(?:\d*|Large)"\s*:\s*\{.*?"uri"\s*:\s*"([^"]+)"/.exec(e)?.[1]).then(e=>tools.cacheImage(o,(e||r)?.replaceAll("\\",""))).catch(()=>r?.replaceAll("\\",""))):r?.replaceAll("\\","")}function t(e){return e?tools.fetch("https://www.facebook.com/photo/",{data:{fbid:e},dataType:"html"}).then(({html:e})=>/"image"\s*:\s*\{"uri"\s*:\s*"([^"]+)"[^{}]*\}/.exec(e)?.[1]?.replaceAll("\\","")):Promise.reject()}const r=new RegExp("\\/(\\d+_\\d+_\\d+)[^/]*\\?",""),s=new RegExp("^(?:https?:\\/\\/(?:www\\.)?facebook\\.com)?\\/(?:profile\\.php\\?id=(\\d+)|friends\\/.+?profile_id=(\\d+)|marketplace\\/profile\\/(\\d+)|([^/?]+))",""),o=new RegExp('"viewer_image"\\s*:\\s*\\{[^}]*"uri"\\s*:\\s*"([^"}]+\\/(\\d+_\\d+_\\d+)[^/]*\\?[^"}]*)"',"g");window.SITE_SETTINGS={"facebook.com":{onPageLoad:()=>{var e;tools.cacheImage((e=tools.getElementsByTextContent("viewer_image").find(({textContent:e})=>new RegExp(o.source,o.flags).test(e))?.textContent.matchAll(new RegExp(o.source,o.flags)),e&&[...e].map(([e,t,r])=>[r,JSON.parse(`"${t.replace(/\\\\/g,"\\")}"`)])))},srcMatching:[{processor:({trigger:e,triggerSrc:s})=>{const o=r.exec(s)?.[1];return tools.cacheImage(o)||(()=>tools.fetch(e.closest('a[href*="/events/"]')?.href,{dataType:"html"}).then(({html:e})=>t(new RegExp(`"photo"\\s*:\\s*\\{.*"uri"\\s*:\\s*"[^"]*?${o}[^"]*"[^}]*\\}[^}]*"id"\\s*:\\s*"(\\d+)"`).exec(e)?.[1])).then(e=>tools.cacheImage(o,e||s)).catch(()=>s))},selectors:'a[href*="/events/"] img,a[href*="/events/"] [style*="https://scontent."]'},{processor:({trigger:t,triggerSrc:r})=>{const s=t.closest('a[href*="/groups/"]')?.href,{groupId:o,profileId:c}=/\/groups\/(?<groupId>\d+)(?:\/user\/(?<profileId>\d+))?/.exec(s)?.groups||{};return c?e(c,r):tools.cacheImage(o)||(()=>tools.fetch(s,{dataType:"html"}).then(({doc:e})=>e.querySelector('img[data-imgperflogname="profileCoverPhoto"]')?.src).then(e=>tools.cacheImage(o,e)).catch(()=>r))},selectors:'a[href*="/groups/"] image:not(a a image),a[href*="/groups/"] img'},{processor:({trigger:e,triggerSrc:t})=>{const s=r.exec(t)?.[1];return tools.cacheImage(s)||(()=>tools.fetch(e.closest('a[href*="/marketplace/item"]')?.href,{dataType:"html"}).then(({html:e})=>new RegExp(`"image"\\s*:\\s*\\{.*?"uri"\\s*:\\s*"([^"]*?${s}[^"]*)"[^}]*\\}\\s*,\\s*"id"`).exec(e)?.[1]).then(e=>tools.cacheImage(s,e?.replaceAll("\\","")||t)).catch(()=>t))},selectors:'a[href*="/marketplace/item"] img'},{processor:({trigger:e,triggerSrc:s})=>{const o=e.closest('a[href*="/media/set"]')?.href,c=r.exec(s)?.[1];return tools.cacheImage(c)||(()=>tools.fetch(o,{dataType:"html"}).then(({html:e,doc:r})=>{const s=/\/photo\/.*?[?&]fbid=([^&]+)/.exec(r.querySelector(`a[href*="set=${/\/media\/set\b.*?\?.*set=([^&]+)/.exec(o)?.[1]}"]:has(img[src*="${c}"])`)?.href)?.[1]||new RegExp(`"image"\\s*:\\s*\\{[^}]+?${c}[^}]+\\}\\s*,\\s*"id"\\s*:\\s*"(\\d+)"`).exec(e)?.[1];return s?t(s):/"image"\s*:\s*\{.*?"uri"\s*:\s*"(.*?)"/.exec(e)?.[1]?.replaceAll("\\","")}).then(e=>tools.cacheImage(c,e||s)).catch(()=>s))},selectors:'a[href*="/media/set"] img'},{processor:({trigger:e,triggerSrc:s})=>{const o=e.closest('a[href*="/photo"]')?.href,c=/^(?:https?:\/\/(?:www\.)?facebook\.com)?\/photo(?:\b.*?\?.*fbid=([^&]+)|s\/(?:[^/]+\/)?(\d+))/.exec(o),a=r.exec(s)?.[1];return tools.cacheImage(a)||(()=>t(c?.[1]||c?.[2]).then(e=>tools.cacheImage(a,e||s)).catch(()=>s))},selectors:'a[href*="/photo"] img'},{processor:({trigger:e,triggerSrc:s})=>{const o=r.exec(s)?.[1];return tools.cacheImage(o)||(()=>tools.fetch(e.closest('a[href*="/posts/"]')?.href,{dataType:"html"}).then(({html:e})=>t(new RegExp(`"photo_image"\\s*:\\s*\\{.*"uri"\\s*:\\s*"[^"]*?${o}[^"]*"[^}]*\\}[^}]*"id"\\s*:\\s*"(\\d+)"`).exec(e)?.[1])).then(e=>tools.cacheImage(o,e||s)).catch(()=>s))},selectors:'a[href*="/posts/"] img'},{processor:({trigger:t,triggerSrc:s})=>{const o=r.exec(s)?.[1];return tools.cacheImage(o)||(()=>tools.fetch(t.closest('a[href*="/stories/"]')?.href,{dataType:"html"}).then(({html:t})=>e(/"story_bucket_owner"\s*:\s*\{.*?"url"\s*:\s*"(https?:(?:\\?\/){2}scontent\.[^"]+)"/i.exec(t)?.[1],/"story_bucket_owner"\s*:\s*\{.*?"profilePicture"\s*:\s*\{.*?"uri"\s*:\s*"([^"]+)"/i.exec(t)?.[1])).then(e=>tools.cacheImage(o,e)).catch(()=>fallbackImage))},selectors:'a[href*="/stories/"] image'},{processor:({trigger:e,triggerSrc:r})=>{const s=/\/videos(?:\/\D+.+)?\/(\d+)/.exec(link=e.closest('a[href*="/videos/"]')?.href)?.[1];return tools.cacheImage(s)||(()=>t(s).then(e=>tools.cacheImage(s,e||r)).catch(()=>r))},selectors:'a[href*="/videos/"]'},{processor:({trigger:t,triggerSrc:r})=>e(/(?<=\/watch\/)[^/]+/.exec(t.closest('a[href*="/watch/"]')?.href)?.[0],r),selectors:'a[href*="/watch/"] image'},{processor:({trigger:t,triggerSrc:r})=>e(t.closest("a")?.href,r),selectors:'a[href*="facebook.com/"] image,a[href*="facebook.com/"] img,a[href*="marketplace/profile/"] image,a[href*="profile.php"] image,a[href*="profile_id"] img'},{srcRegExp:"//external\\..+?\\.fbcdn\\.net/.+\\?.*[?&]?url=([^&]+).*",processor:({srcRegExpObj:e,triggerSrc:t})=>({triggerSrc:decodeURIComponent(e.exec(t)?.[1]??""),commonRulesOnly:!0})}]}}}(); }
  });

  // fanart.tv.js
  matchRules.push({
    domain: "fanart.tv",
    apply: function() { window.SITE_SETTINGS={"fanart.tv":{srcMatching:[{srcRegExp:"(//images\\.fanart\\.tv/).+(/.+@IMG@)",processor:"$1fanart$2"}]}}; }
  });

  // fandango.com.js
  matchRules.push({
    domain: "fandango.com",
    apply: function() { window.SITE_SETTINGS={"fandango.com":{srcMatching:[{srcRegExp:"(//images\\.fandango\\.com/imagerelay/)\\d+/\\d+(/.+?)(?:/redesign/.+)",processor:"$10/0$2"},{srcRegExp:"(//images\\.fandango\\.com)(?:/.+)?((?<!/)/images/.+@IMG@)",processor:"$1$2"},{srcRegExp:"https?://resizing\\.flixster\\.com/.+(https?://.+)",processor:"$1"},{srcRegExp:"(//images\\d*\\.vudu\\.com/.+-)\\d+",processor:["$1360","$1300"]}]}}; }
  });

  // fapreactor.com.js
  matchRules.push({
    domain: "fapreactor.com",
    apply: function() { window.SITE_SETTINGS={"fapreactor.com":{referrerAddedHostnames:["fapreactor.com"],srcMatching:[{srcRegExp:"(//.+?/pics/post/)(?:full/)?([^/]+@IMG@)",processor:"$1full/$2"}]}}; }
  });

  // fastimages.org.js
  matchRules.push({
    domain: "fastimages.org",
    apply: function() { window.SITE_SETTINGS={"fastimages.org":{srcMatching:[{srcRegExp:"(//fastimages\\.org/images/.+)\\.th(@IMG@)",processor:"$1$2"}]}}; }
  });

  // fengniao.com.js
  matchRules.push({
    domain: "fengniao.com",
    apply: function() { window.SITE_SETTINGS={"fengniao.com":{ignore:".picBox .btn",referrerAddedHostnames:["img-space.com"],srcMatching:[{srcRegExp:"(//.+?\\.img-space\\.com/.+\\?).*?&(auth_key=[^&]+)?.*",processor:["$1$2"]}]}}; }
  });

  // flickr.com.js
  matchRules.push({
    domain: "flickr.com",
    apply: function() { !function(){function e(e,o=""){return window.flickrApiKey||(window.flickrApiKey=/"?(?:api|site)_key"?\s*[:=]\s*"(\w+)"/.exec(tools.getElementsByTextContent("api_key,site_key")[0]?.textContent)?.[1]),window.flickrCsrf||(window.flickrCsrf=/csrf=([^&]+)/.test(document.querySelector('[data-track="footer-language"]')?.href)?RegExp.$1:""),window.flickrApiKey&&e?tools.cacheImage(e)||(()=>tools.fetch("https://api.flickr.com/services/rest",{data:{extras:"sizes",photo_id:e,method:"flickr.photos.getInfo",api_key:window.flickrApiKey,csrf:window.flickrCsrf,format:"json",nojsoncallback:1}}).then(t=>tools.cacheImage(e,t?.json?.photo?.sizes?.size?.filter(e=>"photo"===e.media).pop()?.source||o))):o}window.SITE_SETTINGS={"flickr.com":{ignore:".spaceball,.photo-display-item .meta",srcMatching:[{srcRegExp:"(//.+?\\.(?:static\\.?)?flickr\\.com/\\d+/buddyicons/.+?)(?:_\\w)?(@IMG@.*)",processor:"$1_r$2"},{exclusive:!1,srcRegExp:"(//.+?\\.(?:static\\.?)?flickr\\.com/.*coverphoto.*?)(?:_\\w)?(@IMG@.*)",processor:"$1_h$2",selectors:".cover"},{srcRegExp:"(//.+?\\.(?:static\\.?)?flickr\\.com/(?:\\d+/)+(\\d+)_.+?)(?:_\\w)?(@IMG@)",processor:({srcRegExpObj:o,triggerSrc:t})=>o.test(t)&&e(RegExp.$2,t.replace(o,`${RegExp.$1}_b${RegExp.$3}`))},{srcRegExp:"/photos/.+?/(\\d+)/",processor:({srcRegExpObj:o,trigger:t})=>e(o.exec(t.querySelector('a[href*="/photos/"]')?.href)?.[1]),selectors:".restricted-image"},{srcRegExp:"//.+\\.istockphoto\\.com/id/(\\d+)/.+@IMG@",processor:({triggerSrc:e,srcRegExpObj:o})=>{const t=o.test(e)&&RegExp.$1;return t&&(tools.cacheImage(t)||(()=>tools.fetch("https://www.istockphoto.com/collaboration/board_assets.json",{data:{asset_ids:t}}).then(e=>tools.cacheImage(t,{src:e?.json?.[0]?.delivery_urls?.comp1024||e?.json?.[0]?.delivery_urls?.comp,title:e?.json?.[0]?.title}))))}}]}}}(); }
  });

  // flickr.net.js
  matchRules.push({
    domain: "flickr.net",
    apply: function() { !function(){function e(e,o=""){return window.flickrApiKey||(window.flickrApiKey=/"?(?:api|site)_key"?\s*[:=]\s*"(\w+)"/.exec(tools.getElementsByTextContent("api_key,site_key")[0]?.textContent)?.[1]),window.flickrCsrf||(window.flickrCsrf=/csrf=([^&]+)/.test(document.querySelector('[data-track="footer-language"]')?.href)?RegExp.$1:""),window.flickrApiKey&&e?tools.cacheImage(e)||(()=>tools.fetch("https://api.flickr.com/services/rest",{data:{extras:"sizes",photo_id:e,method:"flickr.photos.getInfo",api_key:window.flickrApiKey,csrf:window.flickrCsrf,format:"json",nojsoncallback:1}}).then(t=>tools.cacheImage(e,t?.json?.photo?.sizes?.size?.filter(e=>"photo"===e.media).pop()?.source||o))):o}window.SITE_SETTINGS={"flickr.net":{ignore:".spaceball,.photo-display-item .meta",srcMatching:[{srcRegExp:"(//.+?\\.(?:static\\.?)?flickr\\.com/\\d+/buddyicons/.+?)(?:_\\w)?(@IMG@.*)",processor:"$1_r$2"},{exclusive:!1,srcRegExp:"(//.+?\\.(?:static\\.?)?flickr\\.com/.*coverphoto.*?)(?:_\\w)?(@IMG@.*)",processor:"$1_h$2",selectors:".cover"},{srcRegExp:"(//.+?\\.(?:static\\.?)?flickr\\.com/(?:\\d+/)+(\\d+)_.+?)(?:_\\w)?(@IMG@)",processor:({srcRegExpObj:o,triggerSrc:t})=>o.test(t)&&e(RegExp.$2,t.replace(o,`${RegExp.$1}_b${RegExp.$3}`))},{srcRegExp:"/photos/.+?/(\\d+)/",processor:({srcRegExpObj:o,trigger:t})=>e(o.exec(t.querySelector('a[href*="/photos/"]')?.href)?.[1]),selectors:".restricted-image"},{srcRegExp:"//.+\\.istockphoto\\.com/id/(\\d+)/.+@IMG@",processor:({triggerSrc:e,srcRegExpObj:o})=>{const t=o.test(e)&&RegExp.$1;return t&&(tools.cacheImage(t)||(()=>tools.fetch("https://www.istockphoto.com/collaboration/board_assets.json",{data:{asset_ids:t}}).then(e=>tools.cacheImage(t,{src:e?.json?.[0]?.delivery_urls?.comp1024||e?.json?.[0]?.delivery_urls?.comp,title:e?.json?.[0]?.title}))))}}]}}}(); }
  });

  // fliggy.com.js
  matchRules.push({
    domain: "fliggy.com",
    apply: function() { window.SITE_SETTINGS={"fliggy.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // flipkart.com.js
  matchRules.push({
    domain: "flipkart.com",
    apply: function() { window.SITE_SETTINGS={"flipkart.com":{srcMatching:[{srcRegExp:"(//.+?\\.flixcart\\.com/image/)\\d+/\\d+/(.+@IMG@)",processor:["$1$2"]},{srcRegExp:"(//.+?\\.flixcart\\.com/blobio/)\\d+/\\d+(/.+@IMG@)",processor:["$12000/2000$2"]}]}}; }
  });

  // flixster.com.js
  matchRules.push({
    domain: "flixster.com",
    apply: function() { window.SITE_SETTINGS={"flixster.com":{srcMatching:[{srcRegExp:"https?://resizing\\.flixster\\.com/.+(https?://.+)",processor:"$1"}]}}; }
  });

  // fortnite.com.js
  matchRules.push({
    domain: "fortnite.com",
    apply: function() { window.SITE_SETTINGS={"fortnite.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:".css-u421q6,.css-yb58t8"},{srcRegExp:"(//.+?\\.epicgames\\.com/.+?)(?:_[a-z]+)+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // fox.com.js
  matchRules.push({
    domain: "fox.com",
    apply: function() { window.SITE_SETTINGS={"fox.com":{srcMatching:[{srcRegExp:"((?:\\w+\\.foxdcg|static-media\\.fox)\\.com/.+@IMG@).*",processor:"$1"}]}}; }
  });

  // freepik.com.js
  matchRules.push({
    domain: "freepik.com",
    apply: function() { !function(){function e(e){return decodeURIComponent(tools.getUrlWithParams(e,{w:2e3,h:void 0}))}window.SITE_SETTINGS={"freepik.com":{srcMatching:[{srcRegExp:"//www\\.freepik\\.com/.+?_(\\d+)\\.htm",processor:({srcRegExpObj:r,trigger:s,triggerSrc:t})=>{const c=r.exec(s.closest("a").href)?.[1];return c?tools.cacheImage(c)||(()=>tools.fetch(`/api/resources/${c}`).then(({json:{relatedResources:r,...s}}={})=>tools.cacheImage(Object.values(r||{}).flatMap(e=>Array.isArray(e.items)?e.items:Array.isArray(e)?e:[]).concat(s).map(({id:r,name:s,preview:t,previews:c,slug:o})=>[r?.toString(),{src:e(t?.url||tools.getLargestImageInList(c)?.url),title:s||o}])).get(c))):t},selectors:"a>img"},{srcRegExp:"(//videocdn\\.cdnpk\\.net/.+/)small(@IMG@)",processor:"$1large$2"},{srcRegExp:"//img\\.freepik\\.com/.+@IMG@",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&e(s)}]}}}(); }
  });

  // gamebanana.com.js
  matchRules.push({
    domain: "gamebanana.com",
    apply: function() { window.SITE_SETTINGS={"gamebanana.com":{srcMatching:[{srcRegExp:"(//images\\.gamebanana\\.com/.+/)[-\\d]+_(\\w+@IMG@)",processor:"$1$2"}]}}; }
  });

  // gamer.com.tw.js
  matchRules.push({
    domain: "gamer.com.tw",
    apply: function() { window.SITE_SETTINGS={"gamer.com.tw":{srcMatching:[{srcRegExp:"(//.+\\.bahamut\\.com\\.tw/avataruserpic/.+)_\\w+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.bahamut\\.com\\.tw/.+?@IMG@)\\?w=\\d+",processor:"$1"},{srcRegExp:"(//.+\\.bahamut\\.com\\.tw/)\\w(/.+@IMG@).*",processor:"$1B$2"}]}}; }
  });

  // gamer520.com.js
  matchRules.push({
    domain: "gamer520.com",
    apply: function() { window.SITE_SETTINGS={"gamer520.com":{srcMatching:[{srcRegExp:"(//shared\\.cdn\\.queniuqe\\.com/.+)\\.\\d+x\\d+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // gamersky.com.js
  matchRules.push({
    domain: "gamersky.com",
    apply: function() { window.SITE_SETTINGS={"gamersky.com":{srcMatching:[{srcRegExp:"(//.+?\\.gamersky\\.com/avatar/.+_)\\w+(@IMG@)",processor:"$1original$2"},{srcRegExp:"(//.+?\\.gamersky\\.com/image.+)_[A-Z]+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+?\\.gamersky\\.com/upimg/.+/)\\w+?(_\\d+@IMG@)",processor:["$1origin$2"]}]}}; }
  });

  // gamewith.jp.js
  matchRules.push({
    domain: "gamewith.jp",
    apply: function() { window.SITE_SETTINGS={"gamewith.jp":{srcMatching:[{srcRegExp:"(img\\.gamewith\\.jp/img/(?!original_))(.+@IMG@)",processor:["$1original_$2"]}]}}; }
  });

  // gaoding.com.js
  matchRules.push({
    domain: "gaoding.com",
    apply: function() { window.SITE_SETTINGS={"gaoding.com":{maxLookupDepth:3}}; }
  });

  // genius.com.js
  matchRules.push({
    domain: "genius.com",
    apply: function() { window.SITE_SETTINGS={"genius.com":{srcMatching:[{srcRegExp:"//.+?\\.genius\\.com/.+/(https?.+)",processor:({srcRegExpObj:e,triggerSrc:r})=>decodeURIComponent(e.exec(r)?.[1]||"").replace(tools.buildSrcRegExp("(?:\\d+x?)+(?=@IMG@)"),"original")},{thumbType:"posters",srcRegExp:"(//video\\.primis\\.tech/.+)_\\w+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // gewara.com.js
  matchRules.push({
    domain: "gewara.com",
    apply: function() { window.SITE_SETTINGS={"gewara.com":{onPageLoad:()=>{if(location.pathname?.startsWith("/note/")){const e=tools.buildSrcRegExp("//qcloud\\.dpfile\\.com/\\w+/(\\w+).+@IMG@");tools.cacheImage(JSON.parse(/window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\})/.exec(tools.getElementsByTextContent("__INITIAL_STATE__")[0]?.textContent)?.[1]||"null")?.recommendInfo?.recommendInfo?.flatMap(({storyFeedPics:t})=>t?.reduce((t,{bigUrl:o})=>e.test(o)?[...t,[RegExp.$1,o]]:t,[])||[]))}},srcMatching:[{srcRegExp:"(//.+\\.meituan\\.net/)(?:[\\d.]+/)?(.+?@IMG@).*",processor:"$1$2"},{srcRegExp:"//qcloud\\.dpfile\\.com/\\w+/(\\w+).+@IMG@",processor:({srcRegExpObj:e,trigger:t,triggerSrc:o})=>{if(e.test(o)){const e=RegExp.$1,s=tools.cacheImage(e),n=JSON.parse(t.closest("[data-mv]")?.dataset.mv||"null"),c=n?.valLab?.feed_type&&n.valLab.index;return s?tools.detectImage([s,o]):c?()=>tools.fetch(`/note/${c}`,{dataType:"html"}).then(({doc:e})=>{const{url:t,title:s}=JSON.parse(/window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\})/.exec(tools.getElementsByTextContent("__INITIAL_STATE__",e)[0]?.textContent)?.[1]||"null")?.feedInfo?.feedInfo?.feedPicList?.[0]||{};return tools.detectImage([t,o]).then(e=>({...e,title:s}))}).then(({src:t,title:o})=>tools.cacheImage(e,{src:t,title:o})):o}}}]}}; }
  });

  // github.com.js
  matchRules.push({
    domain: "github.com",
    apply: function() { window.SITE_SETTINGS={"github.com":{referrerAddedHostnames:["githubusercontent.com"],srcMatching:[{thumbType:"links",srcRegExp:"//github\\.com/.+/assets/.+",selectors:'a[href*="/assets/"]'},{srcRegExp:"//github\\.com/(.+/)(?:blob|raw)/(.+@IMG@).*",processor:"//raw.githubusercontent.com/$1$2"},{srcRegExp:"(//(?:avatars\\d*|marketplace-screenshots)\\.githubusercontent\\.com/[^?]+).*",processor:"$1"}]}}; }
  });

  // githubusercontent.com.js
  matchRules.push({
    domain: "githubusercontent.com",
    apply: function() { window.SITE_SETTINGS={"githubusercontent.com":{referrerAddedHostnames:["githubusercontent.com"],srcMatching:[{thumbType:"links",srcRegExp:"//github\\.com/.+/assets/.+",selectors:'a[href*="/assets/"]'},{srcRegExp:"//github\\.com/(.+/)(?:blob|raw)/(.+@IMG@).*",processor:"//raw.githubusercontent.com/$1$2"},{srcRegExp:"(//(?:avatars\\d*|marketplace-screenshots)\\.githubusercontent\\.com/[^?]+).*",processor:"$1"}]}}; }
  });

  // gog.com.js
  matchRules.push({
    domain: "gog.com",
    apply: function() { window.SITE_SETTINGS={"gog.com":{srcMatching:[{srcRegExp:"(//.+?\\.gog(?:-statics)?\\.com/\\w{64}).*(@IMG@)",processor:"$1$2"}]}}; }
  });

  // goofish.com.js
  matchRules.push({
    domain: "goofish.com",
    apply: function() { window.SITE_SETTINGS={"goofish.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // google.js
  matchRules.push({
    domain: "google",
    apply: function() { window.SITE_SETTINGS={google:{maxLookupDepth:4,onPageLoad:()=>{const e=/"([-\w]{14})",\[.*?\],\["(https?:\/\/.+?)"(?:,\d+)+\]/g;var t;tools.cacheImage((t=tools.getElementsByTextContent("global_data,AF_initDataCallback").find(({textContent:t})=>e.test(t))?.textContent.matchAll(e),t&&[...t].map(([e,t,o])=>[t,JSON.parse(`"${o.replace(/\\\\(?=u[a-f\d]+)/gi,"\\")}"`)])))},srcMatching:[{srcRegExp:"(//streetviewpixels-pa\\.googleapis\\.com/.+?&w=)(\\d+)&h=(\\d+)(.*)",processor:({srcRegExpObj:e,triggerSrc:t})=>e.test(t)&&`${RegExp.$1}1024&h=${Math.round(1024*parseInt(RegExp.$3)/parseInt(RegExp.$2))}${RegExp.$4}`},{srcRegExp:"(//(?:lh\\d+\\.google(?:usercontent)?|drive\\.google)\\.com/.+[/=])(?:[wh]\\d+-)+.*",processor:"$1w0"},{srcRegExp:"books\\.google\\..+\\bid=([^&]+)|books/edition/.+/([^?]+)",processor:({trigger:e,srcRegExpObj:t})=>t.test(e.closest("a")?.href)&&`/books/publisher/content/images/frontcover/${RegExp.$1||RegExp.$2}?fife=w10000`},{srcRegExp:"(books\\.google\\.com/.+?\\?fife=).*",processor:"$1w10000"},{processor:({trigger:e,triggerSrc:t})=>tools.cacheImage(e.closest("[data-item]")?.dataset.item)||t,selectors:"[data-item] img"},{processor:({trigger:e})=>{const t=e.closest("[data-vid]")?.dataset.vid||new URL(e.closest('a[href*="youtube.com/watch?v="]')?.href).searchParams.get("v");return t&&[`//i.ytimg.com/vi/${t}/maxresdefault.jpg`,`//i.ytimg.com/vi/${t}/hqdefault.jpg`,e=>120===e.width&&90===e.height]},selectors:'[data-curl*="youtube"][data-vid] img:not(a[href*="&t="] img),a[href*="youtube.com/watch?v="]:not(a[href*="&t="]) img'},{processor:({trigger:e})=>{const t=tools.cacheImage(e.closest("[data-tbnid]")?.dataset.tbnid||e.closest("[data-docid]")?.dataset.docid);return t&&{triggerSrc:t.src,commonRulesOnly:!0}},selectors:':is([data-tbnid],[data-docid]) img[alt]:not([alt=""])'},{processor:({trigger:e})=>/imgurl=([^&]+)/.test(e.closest("a").href)&&{triggerSrc:decodeURIComponent(RegExp.$1),commonRulesOnly:!0},selectors:'a[href*="imgurl="] img'}]}}; }
  });

  // hanime1.me.js
  matchRules.push({
    domain: "hanime1.me",
    apply: function() { window.SITE_SETTINGS={"hanime1.me":{maxLookupDepth:4,srcMatching:[{srcRegExp:"//\\w+(\\.nhentai\\.net/galleries/\\w+/)cover(@IMG@)",processor:"//i$11$2"},{srcRegExp:"//\\w+(\\.nhentai\\.net/galleries/\\w+/\\d+)\\w*(@IMG@)",processor:"//i$1$2"},{processor:({trigger:e,triggerSrc:r})=>{const a=new URL(e.closest("*:has(>a.overlay)").querySelector("a.overlay").href).searchParams.get("v");return a&&tools.fetchHdImageFromPageMeta(a,"/watch",{data:{v:a},fallbackSrc:r,withTitle:!0})},selectors:'a.overlay[href*="/watch"]+* img'}]}}; }
  });

  // hellorf.com.js
  matchRules.push({
    domain: "hellorf.com",
    apply: function() { window.SITE_SETTINGS={"hellorf.com":{srcMatching:[{srcRegExp:"//resource\\.zcool\\.cn/.+"},{srcRegExp:"(//img\\.zcool\\.cn/.+?@IMG@)@(?!1280|3000|2o).*",processor:"$1"},{srcRegExp:"(//hellorfimg\\.zcool\\.cn/.*)preview\\d*/(.+@IMG@).*",processor:["$1large/$2","//image.shutterstock.com/z/stock-photo-$2"]}]}}; }
  });

  // hiraki.co.jp.js
  matchRules.push({
    domain: "hiraki.co.jp",
    apply: function() { window.SITE_SETTINGS={"hiraki.co.jp":{srcMatching:[{srcRegExp:"(//.+?\\.hiraki\\.co\\.jp/.+_)[A-Z](\\d+@IMG@)",processor:"$1O$2"},{srcRegExp:"(//.+?\\.hiraki\\.co\\.jp/.+_)[A-Z](@IMG@)",processor:"$1O1$2"}]}}; }
  });

  // hitomi.la.js
  matchRules.push({
    domain: "hitomi.la",
    apply: function() { window.SITE_SETTINGS={"hitomi.la":{onPageLoad:()=>{tools.fetch("//ltn.gold-usergeneratedcontent.net/gg.js",{dataType:"javascript"}).then(({script:e})=>{window.galleryToken=/b:\s*['"](\d+)\/['"]/.exec(e)?.[1]}).catch(()=>{})},referrerAddedHostnames:["gold-usergeneratedcontent.net"],srcMatching:[{srcRegExp:"//(\\w)tn\\.gold-usergeneratedcontent\\.net/.+/(\\w+?(\\w{2})(\\w))@IMG@",processor:({srcRegExpObj:e,triggerSrc:t})=>window.galleryToken&&e.test(t)&&`//w${RegExp.$1.charCodeAt()-96}.gold-usergeneratedcontent.net/${window.galleryToken}/${parseInt(`${RegExp.$4}${RegExp.$3}`,16).toString(10)}/${RegExp.$2}.webp`}]}}; }
  });

  // huaban.com.js
  matchRules.push({
    domain: "huaban.com",
    apply: function() { window.SITE_SETTINGS={"huaban.com":{referrerAddedHostnames:["huaban.com","huabanimg.com"]}}; }
  });

  // huitu.com.js
  matchRules.push({
    domain: "huitu.com",
    apply: function() { window.SITE_SETTINGS={"huitu.com":{ignore:".watermark",srcMatching:[{srcRegExp:"(//pic\\d*\\.(?:nipic\\.com|n[tx]img\\.cn)/)(?:pic|file)(/.+)_\\d(@IMG@)",processor:"$1file$2_2$3"},{srcRegExp:"(//pic\\w?\\d*\\.huitu\\.com/)(?:pic|img|res)(/.+?)_\\d(?:_\\w\\d+x\\d+)?(@IMG@)",processor:"$1res$2_1$3"},{srcRegExp:"(//show\\.huitu\\.com/avatar/)(?:\\d+/)?(\\d+@IMG@)",processor:"$1$2"},{srcRegExp:"//taskupload\\d+\\.huitu\\.com/.+@IMG@"}]}}; }
  });

  // huya.com.js
  matchRules.push({
    domain: "huya.com",
    apply: function() { window.SITE_SETTINGS={"huya.com":{ignore:".img-box~*"}}; }
  });

  // ibaotu.com.js
  matchRules.push({
    domain: "ibaotu.com",
    apply: function() { window.SITE_SETTINGS={"ibaotu.com":{srcMatching:[{srcRegExp:"(//pic\\.ibaotu\\.com/.+@IMG@!).*",processor:"$1ww7004"}]}}; }
  });

  // iherb.com.js
  matchRules.push({
    domain: "iherb.com",
    apply: function() { window.SITE_SETTINGS={"iherb.com":{srcMatching:[{srcRegExp:"(//.+?\\.images-iherb\\.com/.+?/)\\w(/.+@IMG@)",processor:"$1l$2"},{srcRegExp:"(//.+?\\.images-iherb\\.com/.+?-)small(@IMG@)",processor:"$1large$2"},{srcRegExp:"(//.+?\\.(?:amazonaws|images-iherb)\\.com/.+?/)\\w(@IMG@)",processor:"$1l$2"}]}}; }
  });

  // imdb.com.js
  matchRules.push({
    domain: "imdb.com",
    apply: function() { window.SITE_SETTINGS={"imdb.com":{srcMatching:[{srcRegExp:"(//.*\\.media-amazon\\.com/images/.*?)\\._.+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // imgur.com.js
  matchRules.push({
    domain: "imgur.com",
    apply: function() { window.SITE_SETTINGS={"imgur.com":{srcMatching:[{srcRegExp:"(//i\\.imgur\\.com/\\w{7}).*?(@IMG@).*",processor:["$1.webp","$1$2"]},{srcRegExp:"(//i\\.imgur\\.com/\\w{7}).*?\\.mp4",processor:({srcRegExpObj:r,trigger:c})=>r.test(c.currentSrc)&&c.currentSrc.replace(r,"$1.webp"),selectors:"video"}]}}; }
  });

  // instacart.com.js
  matchRules.push({
    domain: "instacart.com",
    apply: function() { window.SITE_SETTINGS={"instacart.com":{srcMatching:[{srcRegExp:".+/(\\w+\\.cloudfront\\.net/.+/file/)\\w+?_(.+@IMG@)",processor:"//$1$2"},{srcRegExp:".+/(\\w+\\.cloudfront\\.net/.+@IMG@)",processor:"//$1"}]}}; }
  });

  // instagram.com.js
  matchRules.push({
    domain: "instagram.com",
    apply: function() { window.SITE_SETTINGS={"instagram.com":{srcMatching:[{processor:({trigger:o,triggerSrc:e})=>{const r=function(o){return/^(?:(.+?) se profielfoto|Profilový obrázek (.+?)|(.+?)s profilbillede|(.+?)s Profilbild|Εικόνα προφίλ του χρήστη (.+?)|(.+?)'s profile picture|Foto del perfil de (.+?)|Käyttäjän (.+?) profiilikuva|Photo de profil de (.+?)|Foto profil (.+?)|Immagine del profilo di (.+?)|(.+?)のプロフィール写真|(.+?)님의 프로필 사진|Gambar profil (.+?)|Profilbildet til (.+?)|Profielfoto van (.+?)|Zdjęcie profilowe (.+?)|Foto do perfil de (.+?)|Foto de perfil de (.+?)|Фото профиля (.+?)|รูปโปรไฟล์ของ (.+?)|Litrato sa profile ni (.+?)|(.+?)'in profil resmi|(.+?)的头像|(.+?)的大頭貼照|(.+?) এর প্রোফাইল ছবি|(.+?)નું પ્રોફાઇલ ચિત્ર|(.+?) का प्रोफ़ाइल चित्र|Slika profila (.+?)|(.+?) profilképe|(.+?) ಅವರ ಪ್ರೊಫೈಲ್ ಚಿತ್ರ|(.+?) എന്നയാളുടെ പ്രൊഫൈൽ ചിത്രം|(.+?) चे परिचय चित्र|(.+?) को प्रोफाइल तस्वीर|(.+?) ਦੀ ਪ੍ਰੋਫਾਈਲ ਫੋਟੋ|(.+?)ගේ පැතිකඩ පින්තූරය|Profilová fotka používateľa (.+?)|(.+?) இன் சுயவிவரப் படம்|(.+?) ప్రొఫైల్ చిత్రం|Ảnh đại diện của (.+?)|(.+?)的個人資料相片|Снимката на профила на (.+?)|Photo de profil de (.+?)|Fotografia de profil a contului (.+?)|Слика на профилу корисника (.+?)|Основна світлина (.+?))$/.exec(o.alt)?.slice(1).filter(Boolean)[0]||/^(?:Profielfoto|Profilová fotka|Profilbillede|Profilbild|Εικόνα προφίλ|Profile photo|Foto del perfil|Profiilikuva|Photo de profil|Foto profil|Immagine del profilo|プロフィール写真|프로필 사진|Profilbilde|Zdjęcie profilowe|Foto do perfil|Фото профиля|รูปโปรไฟล์|Litrato sa profile|Profil fotoğrafı|头像|大頭貼照|প্রোফাইল ফটো|પ્રોફાઇલ ફોટો|प्रोफ़ाइल फ़ोटो|Slika profila|Profilkép|ಪ್ರೊಫೈಲ್‌ ಫೋಟೋ|പ്രൊഫൈൽ ഫോട്ടോ|प्रोफाईल फोटो|प्रोफाइल फोटो|ਪ੍ਰੋਫ਼ਾਈਲ ਫ਼ੋਟੋ|ප්‍රොෆයිල ඡායාරූපය|சுயவிவரப் படம்|ప్రొఫైల్ ఫోటో|Ảnh đại diện|個人資料相片|Снимка на профила|Fotografie de profil|Фотографија на профилу|Основна світлина)$/i.test(o.alt)&&o.closest("header")?.querySelector("h2").textContent}(o);return r&&(tools.cacheImage(r)||(()=>function(o){return o?tools.fetch("https://www.instagram.com/api/v1/users/web_profile_info/",{data:{username:o}}).then(({json:o})=>tools.fetch(o?.data?.user?.id&&`https://www.instagram.com/api/v1/users/${o.data.user.id}/info/`).then(({json:o})=>tools.getLargestImageInList([].concat(o?.user?.hd_profile_pic_url_info||[],o?.user?.hd_profile_pic_versions||[]))?.url).catch(()=>o?.data?.user?.profile_pic_url_hd)):Promise.reject()}(r).then(o=>tools.cacheImage(r,o||e)).catch(()=>tools.cacheImage(r,e))))},selectors:"img[alt]"},{processor:({trigger:o,triggerSrc:e})=>{const r=/[?&]stp=[^&]+?_p\d+x\d+/;return o.src&&!r.test(o.src)&&r.test(e)?o.src:e},selectors:"img[srcset]"}],staticNetRequestRuleSetId:"net-request-rule-set__instagram.com"}}; }
  });

  // interpals.net.js
  matchRules.push({
    domain: "interpals.net",
    apply: function() { window.SITE_SETTINGS={"interpals.net":{srcMatching:[{srcRegExp:"(//ipstatic\\.net/)thumbs/\\d+x\\d+(/.+?)(?:_\\d{1,2})?(@IMG@).*",processor:"$1photos$2$3"}]}}; }
  });

  // iproperty.com.my.js
  matchRules.push({
    domain: "iproperty.com.my",
    apply: function() { window.SITE_SETTINGS={"iproperty.com.my":{srcMatching:[{srcRegExp:"(//.+?\\.pgimgs\\.com/.+?\\.)[A-Z]\\d+(?:X\\d+|\\w+)?((?:/.+)?@IMG@)",processor:"$1V800$2"},{srcRegExp:"(//.+?\\.iproperty\\.com\\.my/.+/)\\d+x\\d+[^/]*(/.+@IMG@)",processor:"$12000x2000-fit$2"}]}}; }
  });

  // iqiyi.com.js
  matchRules.push({
    domain: "iqiyi.com",
    apply: function() { window.SITE_SETTINGS={"iqiyi.com":{srcMatching:[{srcRegExp:"(.+?)_\\d+_\\d+(@IMG@).*",processor:["$1_0_0$2","$1_640_640$2"]}]}}; }
  });

  // istockphoto.com.js
  matchRules.push({
    domain: "istockphoto.com",
    apply: function() { window.SITE_SETTINGS={"istockphoto.com":{srcMatching:[{srcRegExp:"(//images\\.pexels\\.com/users/avatars/.+?@IMG@).*",processor:"$1?w=10000"},{srcRegExp:"(//.+\\.(?:pexels|unsplash)\\.com/(?:[^?](?!video-id))+)(?:\\?.*)?$",processor:"$1"},{srcRegExp:"//.+\\.istockphoto\\.com/id/(\\d+)/.+@IMG@",processor:({triggerSrc:s,srcRegExpObj:o})=>{const e=o.test(s)&&RegExp.$1;return e&&(tools.cacheImage(e)||(()=>tools.fetch("https://www.istockphoto.com/collaboration/board_assets.json",{data:{asset_ids:e}}).then(s=>tools.cacheImage(e,{src:s?.json?.[0]?.delivery_urls?.comp1024||s?.json?.[0]?.delivery_urls?.comp,title:s?.json?.[0]?.title}))))}}]}}; }
  });

  // itch.io.js
  matchRules.push({
    domain: "itch.io",
    apply: function() { window.SITE_SETTINGS={"itch.io":{srcMatching:[{srcRegExp:"//.+?\\.itch\\.zone/([^/]+)/.+@IMG@",processor:({srcRegExpObj:e,trigger:t,triggerSrc:r})=>{const c=e.exec(r)?.[1]||r;return tools.cacheImage(c)||(()=>tools.fetch(t.closest("a")?.href,{dataType:"html"}).then(({doc:e})=>{const t=e.querySelector('meta[property="og:image"]')?.content,r=e.querySelector('meta[property="og:title"],meta[name="twitter:title"]')?.content;return[...e.querySelectorAll('a[href*="/original/"]')].map(e=>[/\/([^/]+)\/original\//.exec(e.href)?.[1],e.href]).concat(t?[[c,{src:t,title:r}]]:[])}).then(e=>tools.cacheImage(e).get(c)).catch(()=>r))}}]}}; }
  });

  // iview.abc.net.au.js
  matchRules.push({
    domain: "iview.abc.net.au",
    apply: function() { window.SITE_SETTINGS={"iview.abc.net.au":{srcMatching:[{srcRegExp:"(//.+?\\.iview\\.abc\\.net\\.au/thumbs/)\\d+(/.+@IMG@)",processor:"$10$2"}]}}; }
  });

  // iwara.tv.js
  matchRules.push({
    domain: "iwara.tv",
    apply: function() { window.SITE_SETTINGS={"iwara.tv":{srcMatching:[{srcRegExp:"(//.+?\\.iwara\\.tv/image/)thumbnail(/.+@IMG@)",processor:["$1original$2","$&"]},{srcRegExp:"(//img\\.dlsite\\.jp/)resize(/.+)_\\d+x\\d+(@IMG@)",processor:"$1modpub$2$3"}]}}; }
  });

  // ixigua.com.js
  matchRules.push({
    domain: "ixigua.com",
    apply: function() { window.SITE_SETTINGS={"ixigua.com":{srcMatching:[{srcRegExp:"(//.+\\.bdxiguastatic\\.com/img/user-avatar/.+?~)\\d+x\\d+(.*)",processor:"$10x0$2"}]}}; }
  });

  // jamanetwork.com.js
  matchRules.push({
    domain: "jamanetwork.com",
    apply: function() { window.SITE_SETTINGS={"jamanetwork.com":{srcMatching:[{srcRegExp:"//cdn\\.jamanetwork\\.com/.+@IMG@.*",processor:({srcRegExpObj:r,trigger:c,triggerSrc:e})=>r.exec(c.closest("a")?.href)?.[0]||e}]}}; }
  });

  // jandan.net.js
  matchRules.push({
    domain: "jandan.net",
    apply: function() { window.SITE_SETTINGS={"jandan.net":{srcMatching:[{srcRegExp:"(//.+\\.moyu\\.im/).+?(/.+@IMG@).*",processor:"$1original$2"},{srcRegExp:"(//.+\\.toto\\.im/).+?(/.+@IMG@).*",processor:"$1large$2"},{srcRegExp:"(.+\\.360buyimg\\.com/).*((?:jfs|g\\d+)/.+@IMG@).*",processor:"$1n1/s800x800_$2"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",s=>100===s.width&&100===s.height]}]}}; }
  });

  // javbus.com.js
  matchRules.push({
    domain: "javbus.com",
    apply: function() { window.SITE_SETTINGS={"javbus.com":{srcMatching:[{srcRegExp:"//.+/data/attachment/forum/.+/(\\w+@IMG@)",processor:"//forum.javcdn.cc/i.imgur.com/$1"},{srcRegExp:"(//uc\\.javbus\\d*\\.com/.+avatar_)(?:small|middle)(@IMG@)",processor:"$1big$2"},{srcRegExp:"/thumbs?/(\\w+)(@IMG@)",processor:"/cover/$1_b$2"},{processor:({trigger:s})=>s.closest("a.sample-box")?.href,selectors:'a.sample-box[href*="pics.dmm.co.jp"] img'},{srcRegExp:"(//pics\\.dmm\\.co\\.jp/digital/video/.+?)ps(@IMG@)",processor:"$1pl$2"},{srcRegExp:"(//pics\\.dmm\\.co\\.jp/digital/video/.+?)(-\\d+@IMG@)",processor:"$1jp$2"},{srcRegExp:"/sample/(\\w+?)(_\\w+)?(@IMG@)",processor:"/bigsample/$1_b$2$3"}]}}; }
  });

  // javdb.com.js
  matchRules.push({
    domain: "javdb.com",
    apply: function() { window.SITE_SETTINGS={"javdb.com":{srcMatching:[{srcRegExp:"(//.+\\.jdbstatic\\.com/samples/.+?_)s(.*@IMG@)",processor:"$1l$2"}]}}; }
  });

  // javdb456.com.js
  matchRules.push({
    domain: "javdb456.com",
    apply: function() { window.SITE_SETTINGS={"javdb456.com":{srcMatching:[{srcRegExp:"(//.+\\.jdbstatic\\.com/samples/.+?_)s(.*@IMG@)",processor:"$1l$2"}]}}; }
  });

  // javsee.js
  matchRules.push({
    domain: "javsee",
    apply: function() { window.SITE_SETTINGS={javsee:{srcMatching:[{srcRegExp:"//.+/data/attachment/forum/.+/(\\w+@IMG@)",processor:"//forum.javcdn.cc/i.imgur.com/$1"},{srcRegExp:"(//uc\\.javbus\\d*\\.com/.+avatar_)(?:small|middle)(@IMG@)",processor:"$1big$2"},{srcRegExp:"/thumbs?/(\\w+)(@IMG@)",processor:"/cover/$1_b$2"},{processor:({trigger:s})=>s.closest("a.sample-box")?.href,selectors:'a.sample-box[href*="pics.dmm.co.jp"] img'},{srcRegExp:"(//pics\\.dmm\\.co\\.jp/digital/video/.+?)ps(@IMG@)",processor:"$1pl$2"},{srcRegExp:"(//pics\\.dmm\\.co\\.jp/digital/video/.+?)(-\\d+@IMG@)",processor:"$1jp$2"},{srcRegExp:"/sample/(\\w+?)(_\\w+)?(@IMG@)",processor:"/bigsample/$1_b$2$3"}]}}; }
  });

  // jd.js
  matchRules.push({
    domain: "jd",
    apply: function() { window.SITE_SETTINGS={jd:{ignore:".video-icon",srcMatching:[{srcRegExp:"(.+\\.360buyimg\\.com/).*((?:jfs|g\\d+)/.+@IMG@).*",processor:"$1n1/s800x800_$2"},{srcRegExp:"(//.+\\.360buyimg\\.com/.+?)_(?:mid|sma)(@IMG@)",processor:"$1_big$2"},{srcRegExp:"(s\\.tuniu\\.net/.+@IMG@).*",processor:"$1"},{srcRegExp:"(//(?:tuniupic\\.360buyimg|.+\\.tuniucdn)\\.com/.+?)(?:_w\\d+_h\\d+_c\\d+_t\\d+)*(@IMG@)",processor:["$1$2","$1_w800_h0_c0_t0$2"]}]}}; }
  });

  // jimeng.jianying.com.js
  matchRules.push({
    domain: "jimeng.jianying.com",
    apply: function() { !function(){function e(r){const o=/\/(tos-[-\w]+\/\w+)/;return r?.flatMap(({author:r,collection:s,common_attr:c,image:i})=>[...o.test(r?.avatar_url)?[[RegExp.$1,RegExp.$_]]:[],...s?e(s.item_list):[],...o.test(t(i?.large_images)?.image_url)?[[RegExp.$1,RegExp.$_]]:[],...o.test(t(Object.entries(c?.cover_url_map||{}).map(([e,t])=>{const r=/^(?<height>\d+)$/.exec(e)?.groups||/^.*w:(?<width>\d+)-h:(?<height>\d+)$/.exec(e)?.groups||{};return{...r,width:r.width??r.height,url:t}}))?.url||c?.cover_url)?[[RegExp.$1,RegExp.$_]]:[]])}function t(e,t="width",r="height"){return(Array.isArray(e)?e:Object.entries(e||{}).map(([e,t])=>({height:parseInt(e),src:t}))).sort(({[t]:e=1,[r]:o=1},{[t]:s=1,[r]:c=1})=>(s*c||0)-(e*o||0))?.[0]}window.SITE_SETTINGS={"jimeng.jianying.com":{anonymous:!0,onPageLoad:()=>{const t=/^.*__get_explore_result\s*=\s*(\{.*?\})(?:;|$)/s;tools.cacheImage(e(JSON.parse(t.exec(tools.getElementsByTextContent("window.__get_explore_result=").find(({textContent:e})=>t.test(e))?.textContent)?.[1]||"null")?.data?.item_list))},referrerAddedHostnames:["byteimg.com","byteacctimg.com","ibyteimg.com"],srcMatching:[{srcRegExp:"(//.+?\\.i?byte(?:acct)?img\\.com/img/user-avatar/.+~).+(@IMG@)",processor:"$1noop$2"},{srcRegExp:"//.+?\\.i?byte(?:acct)?img\\.com/(tos-[-\\w]+/\\w+).+@IMG@",processor:({srcRegExpObj:e,triggerSrc:t})=>e.test(t)&&tools.cacheImage(RegExp.$1)||t}]}}}(); }
  });

  // joyreactor.js
  matchRules.push({
    domain: "joyreactor",
    apply: function() { window.SITE_SETTINGS={joyreactor:{referrerAddedHostnames:["joyreactor.*"],srcMatching:[{srcRegExp:"(//.+?/pics/post/)(?:full/)?([^/]+@IMG@)",processor:"$1full/$2"}]}}; }
  });

  // justwatch.com.js
  matchRules.push({
    domain: "justwatch.com",
    apply: function() { window.SITE_SETTINGS={"justwatch.com":{ignore:".youtube-player__play-button",srcMatching:[{srcRegExp:"(//.+\\.justwatch\\.com/(?:images/)?poster/\\d+/)s\\d+(/.+)",processor:"$1s718$2"},{srcRegExp:"(//.+?/backdrop/\\d+/)s\\d+(/.+)",processor:"$1s1920$2"}]}}; }
  });

  // kanald.com.tr.js
  matchRules.push({
    domain: "kanald.com.tr",
    apply: function() { window.SITE_SETTINGS={"kanald.com.tr":{srcMatching:[{srcRegExp:"(//.+?/i/.+?/\\d+/)\\d+x\\d+(/.+)",processor:"$10x0$2"}]}}; }
  });

  // kemono.su.js
  matchRules.push({
    domain: "kemono.su",
    apply: function() { window.SITE_SETTINGS={"kemono.su":{srcMatching:[{srcRegExp:"//img\\.kemono\\.su/thumbnail/(.+@IMG@)",processor:"//n1.kemono.su/$1"}]}}; }
  });

  // kick.com.js
  matchRules.push({
    domain: "kick.com",
    apply: function() { window.SITE_SETTINGS={"kick.com":{srcMatching:[{srcRegExp:"(//.+?\\.kick\\.com/video_thumbnails/.+/)\\d+(@IMG@)",processor:"$11080$2"},{srcRegExp:"(//.+?\\.kick\\.com/images/user/.+-)thumb(@IMG@)",processor:"$1fullsize$2"},{srcRegExp:"(//.+?\\.kick\\.com/images/subcategories/\\d+/banner/)responsives/(.+?)___banner(?:_\\d+)+@IMG@",processor:"$1$2"},{processor:({trigger:e})=>e.querySelector("img"),selectors:".z-player:has(>img)"}]}}; }
  });

  // kinopoisk.ru.js
  matchRules.push({
    domain: "kinopoisk.ru",
    apply: function() { !function(){function e(e,t){const r=JSON.parse(e.querySelector("#__NEXT_DATA__")?.textContent||"{}").props,o=r?.apolloState.data[r?.apolloState.data.ROOT_QUERY[`film({"id":${r?.initialProps.pageProps.filmId}})`].__ref]?.poster?.avatarsUrl;return tools.cacheImage(t,o?`${o}/3840x`:t)}window.SITE_SETTINGS={"kinopoisk.ru":{ignore:".styles_vertical-poster-overlay__SucsL",srcMatching:[{srcRegExp:"(//avatars\\.mds\\.yandex\\.net/get-(?:kinopoisk-image|ott)/.+/)\\d*x?\\d*",processor:["$13840x","$11920x"]},{srcRegExp:"(//avatars\\.mds\\.yandex\\.net/get-bunker/.+/)\\d*x?\\d*",processor:"$1384x384"},{processor:({trigger:t,triggerSrc:r})=>tools.cacheImage(r)||document.querySelector("#__NEXT_DATA__")&&e(document,r)||(()=>tools.fetch(t.closest("a")?.href,{dataType:"html"}).then(({doc:t})=>e(t,r))),selectors:'a[href^="/film/"] img'},{processor:({trigger:e,triggerSrc:t})=>{const r=JSON.parse(document.querySelector("#__NEXT_DATA__")?.textContent||"{}").props,o=Object.entries(r.apolloState.data[r.apolloState.data.ROOT_QUERY[`movie({"id":${r.initialProps.pageProps.movieId}})`].__ref]||{}).reduce((e,[t,r])=>t.startsWith("images:")&&r.items?.length?{...e,...r.items.reduce((e,{id:t,image:{avatarsUrl:r}})=>({...e,[t]:r}),{})}:e,{})[/\/picture\/(\d+)/.exec(e.closest("a")?.href)?.[1]];return o?`${o}/3840x`:t},selectors:'a[href^="/picture/"] img'}]}}}(); }
  });

  // klingai.com.js
  matchRules.push({
    domain: "klingai.com",
    apply: function() { window.SITE_SETTINGS={"klingai.com":{srcMatching:[{srcRegExp:"(//.+?\\.klingai\\.com/.+):\\d+x\\d+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // kmart.co.nz.js
  matchRules.push({
    domain: "kmart.co.nz",
    apply: function() { window.SITE_SETTINGS={"kmart.co.nz":{srcMatching:[{srcRegExp:"(//.+?\\.yotpo\\.com/Review/.+?/)\\w+(@IMG@).*",processor:"$1original$2"}]}}; }
  });

  // kmart.com.au.js
  matchRules.push({
    domain: "kmart.com.au",
    apply: function() { window.SITE_SETTINGS={"kmart.com.au":{srcMatching:[{srcRegExp:"(//.+?\\.yotpo\\.com/Review/.+?/)\\w+(@IMG@).*",processor:"$1original$2"}]}}; }
  });

  // kmart.com.js
  matchRules.push({
    domain: "kmart.com",
    apply: function() { window.SITE_SETTINGS={"kmart.com":{srcMatching:[{srcRegExp:"(.+\\.shld\\.net/[^?]+)(?:\\?.*\\bsrc=([^&]+).*)?",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&(decodeURIComponent(RegExp.$2||"")||RegExp.$1)}]}}; }
  });

  // konachan.com.js
  matchRules.push({
    domain: "konachan.com",
    apply: function() { window.SITE_SETTINGS={"konachan.com":{srcMatching:[{exclusive:!1,srcRegExp:"//(?:.+\\.)?(konachan\\.\\w+|yande\\.re)/.+/(\\w+)(?:/.*)?(@IMG@)",processor:({srcRegExpObj:e,trigger:a,triggerSrc:$})=>a.matches(".avatar")?tools.cacheImage($)||(()=>tools.fetch(a.closest("a").href,{dataType:"html"}).then(({doc:a})=>e.test(a.querySelector("#image")?.src)?tools.detectImage([`//${RegExp.$1}/image/${RegExp.$2}/${RegExp.$1}${RegExp.$3}`,`//${RegExp.$1}/jpeg/${RegExp.$2}/${RegExp.$1}${RegExp.$3}`]):Promise.reject()).then(e=>tools.cacheImage($,e))):["//$1/image/$2/$1$3","//$1/jpeg/$2/$1$3"],selectors:"a > .avatar"}]}}; }
  });

  // konachan.net.js
  matchRules.push({
    domain: "konachan.net",
    apply: function() { window.SITE_SETTINGS={"konachan.net":{srcMatching:[{exclusive:!1,srcRegExp:"//(?:.+\\.)?(konachan\\.\\w+|yande\\.re)/.+/(\\w+)(?:/.*)?(@IMG@)",processor:({srcRegExpObj:e,trigger:a,triggerSrc:t})=>a.matches(".avatar")?tools.cacheImage(t)||(()=>tools.fetch(a.closest("a").href,{dataType:"html"}).then(({doc:a})=>e.test(a.querySelector("#image")?.src)?tools.detectImage([`//${RegExp.$1}/image/${RegExp.$2}/${RegExp.$1}${RegExp.$3}`,`//${RegExp.$1}/jpeg/${RegExp.$2}/${RegExp.$1}${RegExp.$3}`]):Promise.reject()).then(e=>tools.cacheImage(t,e))):["//$1/image/$2/$1$3","//$1/jpeg/$2/$1$3"],selectors:"a > .avatar"}]}}; }
  });

  // krea.ai.js
  matchRules.push({
    domain: "krea.ai",
    apply: function() { window.SITE_SETTINGS={"krea.ai":{srcMatching:[{srcRegExp:"(//.+?\\.krea\\.ai/.+\\?.+?)&s=\\d+(.*)",processor:"$1$2"}]}}; }
  });

  // kuaishou.com.js
  matchRules.push({
    domain: "kuaishou.com",
    apply: function() { window.SITE_SETTINGS={"kuaishou.com":{srcMatching:[{srcRegExp:"(//.+\\.kwimgs\\.com/uhead/.+_)\\w+(@IMG@)",processor:"$1o$2"},{srcRegExp:"(//.+\\.(?:acfun\\.cn|(?:aixifan|kwimgs)\\.com)/[^?]+)\\?image.*",processor:"$1"}]}}; }
  });

  // lemon8-app.com.js
  matchRules.push({
    domain: "lemon8-app.com",
    apply: function() { !function(){const e=new RegExp("\\/tos-[-\\w]+\\/(\\w+)","");function t(t,r,a,n){const o=JSON.parse(decodeURIComponent(t.querySelector('script[type="application/json"][data-ttark]')?.textContent.replaceAll(/\s+/g,"")||"null"));if(o){if(a){const t=o.state?.loaderData?.["routes/$user_link_name_.$article_id"],s=t?.[`$ArticleDetail+${encodeURIComponent(a)}`];return tools.cacheImage([[r,t?.[`$UserDetail+${s?.author?.userId||""}`]?.avatar],...e.test(s?.largeImage?.url)?[[RegExp.$1,{src:s?.largeImage?.url,title:s?.title}]]:[],...s?.imageList?.map(({url:t},r)=>e.test(t)?[RegExp.$1,{src:t,title:s?.title&&`${s?.title}${s.imageList.length>1?`(${r+1})`:""}`}]:[])||[]])?.get(n)}if(r){const e=o.state?.loaderData?.["routes/$user_link_name"]?.[`$UserDetailV2+${encodeURIComponent(r)}`]?.avatar;return tools.cacheImage(r,e),e}}}window.SITE_SETTINGS={"lemon8-app.com":{ignoreMutationTargets:"iframe[inert]",srcMatching:[{processor:({trigger:r,triggerSrc:a})=>{const n=r.closest("a[href]")?.href,{userLinkName:o,articleId:s}=/(?<=lemon8-app.com\/)(?<userLinkName>[^/?]+)(?:\/(?<articleId>[^/?]+))?/.exec(n)?.groups||{},c=s?e.exec(a)?.[1]:o;return c&&(tools.cacheImage(c)||(()=>tools.fetch(n,{dataType:"html"}).then(({doc:e})=>{const r=e.getElementById("wci")?.className,a=e.getElementById("cs")?.className;if(r&&a){let e;return new Promise((r,a)=>{const l=setTimeout(a,1e4);e=document.createElement("iframe"),e.inert=!0,e.style.display="none",e.src=n,e.addEventListener("load",()=>{const a=t(e.contentDocument,o,s,c);a&&(clearTimeout(l),r(a))}),e.addEventListener("error",()=>{clearTimeout(l),a()}),document.body.appendChild(e)}).finally(()=>{e?.remove()})}return t(e,o,s,c)})))},selectors:'a[href^="/"] img'}]}}}(); }
  });

  // leonardo.ai.js
  matchRules.push({
    domain: "leonardo.ai",
    apply: function() { window.SITE_SETTINGS={"leonardo.ai":{srcMatching:[{srcRegExp:"//.+?\\.leonardo\\.ai/_next/image\\?.*url=([^&]+)",processor:({srcRegExpObj:e,triggerSrc:r})=>decodeURIComponent(e.exec(r)?.[1]||"")}]}}; }
  });

  // leshetu.net.js
  matchRules.push({
    domain: "leshetu.net",
    apply: function() { window.SITE_SETTINGS={"leshetu.net":{srcMatching:[{srcRegExp:"(//.+?\\.sfmao\\.net/.+@IMG@!)(?:thumbnail_)?(.+)",processor:"$1$2"}]}}; }
  });

  // liangxinyao.com.js
  matchRules.push({
    domain: "liangxinyao.com",
    apply: function() { window.SITE_SETTINGS={"liangxinyao.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // liblib.art.js
  matchRules.push({
    domain: "liblib.art",
    apply: function() { window.SITE_SETTINGS={"liblib.art":{srcMatching:[{srcRegExp:"([^?]+)\\?.+",processor:({trigger:i})=>["$1",h=>h.width*h.height<=i.width*i.height]}]}}; }
  });

  // lofter.com.js
  matchRules.push({
    domain: "lofter.com",
    apply: function() { window.SITE_SETTINGS={"lofter.com":{referrerAddedHostnames:["lf127.net"]}}; }
  });

  // maoyan.com.js
  matchRules.push({
    domain: "maoyan.com",
    apply: function() { window.SITE_SETTINGS={"maoyan.com":{onPageLoad:()=>{if(location.pathname?.startsWith("/note/")){const e=tools.buildSrcRegExp("//qcloud\\.dpfile\\.com/\\w+/(\\w+).+@IMG@");tools.cacheImage(JSON.parse(/window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\})/.exec(tools.getElementsByTextContent("__INITIAL_STATE__")[0]?.textContent)?.[1]||"null")?.recommendInfo?.recommendInfo?.flatMap(({storyFeedPics:t})=>t?.reduce((t,{bigUrl:o})=>e.test(o)?[...t,[RegExp.$1,o]]:t,[])||[]))}},srcMatching:[{srcRegExp:"(//.+\\.meituan\\.net/)(?:[\\d.]+/)?(.+?@IMG@).*",processor:"$1$2"},{srcRegExp:"//qcloud\\.dpfile\\.com/\\w+/(\\w+).+@IMG@",processor:({srcRegExpObj:e,trigger:t,triggerSrc:o})=>{if(e.test(o)){const e=RegExp.$1,s=tools.cacheImage(e),n=JSON.parse(t.closest("[data-mv]")?.dataset.mv||"null"),c=n?.valLab?.feed_type&&n.valLab.index;return s?tools.detectImage([s,o]):c?()=>tools.fetch(`/note/${c}`,{dataType:"html"}).then(({doc:e})=>{const{url:t,title:s}=JSON.parse(/window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\})/.exec(tools.getElementsByTextContent("__INITIAL_STATE__",e)[0]?.textContent)?.[1]||"null")?.feedInfo?.feedInfo?.feedPicList?.[0]||{};return tools.detectImage([t,o]).then(e=>({...e,title:s}))}).then(({src:t,title:o})=>tools.cacheImage(e,{src:t,title:o})):o}}}]}}; }
  });

  // mashable.com.js
  matchRules.push({
    domain: "mashable.com",
    apply: function() { window.SITE_SETTINGS={"mashable.com":{srcMatching:[{srcRegExp:"(//.+?\\.mashable\\.com/imagery/.+/[^.]+).*(@IMG@)",processor:"$1$2"}]}}; }
  });

  // mastodon.social.js
  matchRules.push({
    domain: "mastodon.social",
    apply: function() { window.SITE_SETTINGS={"mastodon.social":{srcMatching:[{processor:({trigger:a,triggerSrc:r})=>{const e=a.closest("a[href]")?.href||a.nextElementSibling?.querySelector("a[href]")?.href;return e&&tools.fetchHdImageFromPageMeta(r,e,{fallbackSrc:r})},selectors:'a[href]:not(a[href=""],a[href^="javascript"],a[href*="mastodon.social"]) img,img:has(+.status-card__actions a[href]:not(a[href=""],a[href^="javascript"],a[href*="mastodon.social"]))'},{srcRegExp:"(//files\\.mastodon\\.social/.+/)small(/\\w+@IMG@)",processor:["$1original$2"]}]}}; }
  });

  // mbok.jp.js
  matchRules.push({
    domain: "mbok.jp",
    apply: function() { window.SITE_SETTINGS={"mbok.jp":{srcMatching:[{srcRegExp:"(//.+?\\.mbokimg\\.mbok\\.jp/\\d+/)\\d+(/.+@IMG@)",processor:"$17$2"}]}}; }
  });

  // mediawiki.org.js
  matchRules.push({
    domain: "mediawiki.org",
    apply: function() { window.SITE_SETTINGS={"mediawiki.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // meetup.com.js
  matchRules.push({
    domain: "meetup.com",
    apply: function() { window.SITE_SETTINGS={"meetup.com":{srcMatching:[{srcRegExp:"(//.+?\\.meetupstatic\\.com/photos/.+/)\\w+(_\\d+@IMG@).*",processor:"$1highres$2"},{srcRegExp:"(//.+?\\.meetupstatic\\.com/images/.+/\\d+)/\\d+x\\d+(@IMG@).*",processor:"$1$2"}]}}; }
  });

  // meigongyun.com.js
  matchRules.push({
    domain: "meigongyun.com",
    apply: function() { window.SITE_SETTINGS={"meigongyun.com":{ignore:".card-figure .hover",referrerAddedHostnames:["meigongyun.com"],srcMatching:[{srcRegExp:"(//src\\.meigongyun\\.com/.+@IMG@)-cover",processor:"$1"},{srcRegExp:"(/avatar\\.php\\?.*size=).*",processor:"$1big"}]}}; }
  });

  // meituan.com.js
  matchRules.push({
    domain: "meituan.com",
    apply: function() { window.SITE_SETTINGS={"meituan.com":{onPageLoad:()=>{if(location.pathname?.startsWith("/note/")){const e=tools.buildSrcRegExp("//qcloud\\.dpfile\\.com/\\w+/(\\w+).+@IMG@");tools.cacheImage(JSON.parse(/window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\})/.exec(tools.getElementsByTextContent("__INITIAL_STATE__")[0]?.textContent)?.[1]||"null")?.recommendInfo?.recommendInfo?.flatMap(({storyFeedPics:t})=>t?.reduce((t,{bigUrl:o})=>e.test(o)?[...t,[RegExp.$1,o]]:t,[])||[]))}},srcMatching:[{srcRegExp:"(//.+\\.meituan\\.net/)(?:[\\d.]+/)?(.+?@IMG@).*",processor:"$1$2"},{srcRegExp:"//qcloud\\.dpfile\\.com/\\w+/(\\w+).+@IMG@",processor:({srcRegExpObj:e,trigger:t,triggerSrc:o})=>{if(e.test(o)){const e=RegExp.$1,s=tools.cacheImage(e),n=JSON.parse(t.closest("[data-mv]")?.dataset.mv||"null"),c=n?.valLab?.feed_type&&n.valLab.index;return s?tools.detectImage([s,o]):c?()=>tools.fetch(`/note/${c}`,{dataType:"html"}).then(({doc:e})=>{const{url:t,title:s}=JSON.parse(/window\.__INITIAL_STATE__\s*=\s*(\{[^;]+\})/.exec(tools.getElementsByTextContent("__INITIAL_STATE__",e)[0]?.textContent)?.[1]||"null")?.feedInfo?.feedInfo?.feedPicList?.[0]||{};return tools.detectImage([t,o]).then(e=>({...e,title:s}))}).then(({src:t,title:o})=>tools.cacheImage(e,{src:t,title:o})):o}}}]}}; }
  });

  // meiye.art.js
  matchRules.push({
    domain: "meiye.art",
    apply: function() { window.SITE_SETTINGS={"meiye.art":{srcMatching:[{srcRegExp:"(//image\\.meiye\\.art/[^?]+).*",processor:"$1"}]}}; }
  });

  // mercari.com.js
  matchRules.push({
    domain: "mercari.com",
    apply: function() { window.SITE_SETTINGS={"mercari.com":{srcMatching:[{srcRegExp:"(.+?\\.mercdn\\.net/)thumb/item/.+(/.+@IMG@).*",processor:"$1item/detail/orig/photos$2"},{srcRegExp:"(.+?\\.mercari-shops-static\\.com/.+/)(?:small|medium|large)(/.+@IMG@).*",processor:"$1xlarge$2"}]}}; }
  });

  // mi-store.js
  matchRules.push({
    domain: "mi-store",
    apply: function() { window.SITE_SETTINGS={"mi-store":{srcMatching:[{srcRegExp:"(//.+\\.mi-store(?:\\.(?:com|[a-z]{2}))+/.+/products/)thumbs(/.+@IMG@)",processor:"$1images$2"},{srcRegExp:"(//mi-store(?:\\.(?:com|[a-z]{2}))+/.+)_.+?(@IMG@)",processor:"$1$2"}]}}; }
  });

  // mi.com.js
  matchRules.push({
    domain: "mi.com",
    apply: function() { window.SITE_SETTINGS={"mi.com":{srcMatching:[{srcRegExp:"(//(?:.+\\.(?:app)?mifile\\.(?:com|cn)|static\\.home\\.mi\\.com)/.+?)(?:!\\d+x\\d+)?(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+\\.(?:(?:app)?mifile|mi-img)\\.(?:com|cn)/.+?@IMG@).*",processor:"$1"},{srcRegExp:"(//.+\\.market\\.xiaomi\\.com/thumbnail/\\w+/\\w)\\w*(?=/)",processor:"$1"}]}}; }
  });

  // midjourney.com.js
  matchRules.push({
    domain: "midjourney.com",
    apply: function() { window.SITE_SETTINGS={"midjourney.com":{srcMatching:[{srcRegExp:"(//cdn\\.midjourney\\.com/.+)(?:_[a-z\\d]+){2}(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//s\\.mj\\.run/.+)\\?.*",processor:"$1"}]}}; }
  });

  // missav.com.js
  matchRules.push({
    domain: "missav.com",
    apply: function() { window.SITE_SETTINGS={"missav.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:".thumbnail>div:has(img)"},{srcRegExp:"(//fivetiu\\.com/.+/\\w+)-\\w+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // mixbook.com.js
  matchRules.push({
    domain: "mixbook.com",
    apply: function() { window.SITE_SETTINGS={"mixbook.com":{srcMatching:[{srcRegExp:"//assets\\.mixbook\\.com/.+/images/templates/(\\w+)/.+(@IMG@)",processor:"//media.mixbook.com/images/templates/$1$2"}]}}; }
  });

  // moegirl.org.cn.js
  matchRules.push({
    domain: "moegirl.org.cn",
    apply: function() { window.SITE_SETTINGS={"moegirl.org.cn":{srcMatching:[{srcRegExp:"(//img\\.moegirl\\.org\\.cn/\\w+/)thumb/(.+?@IMG@).*",processor:"$1$2"},{srcRegExp:"//commons\\.moegirl\\.org\\.cn/extensions/Avatar/avatar\\.php.*",processor:"$&&res=original&nocache"}]}}; }
  });

  // momoshop.com.tw.js
  matchRules.push({
    domain: "momoshop.com.tw",
    apply: function() { window.SITE_SETTINGS={"momoshop.com.tw":{srcMatching:[{srcRegExp:"(//.+?\\.momoshop\\.com\\.tw/(?:\\d+/)?goodsimg/.+?_O)\\w+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+?\\.momoshop\\.com\\.tw/(?:\\d+/)?goodsimg/.+?_)\\w+?(\\d*@IMG@)",processor:"$1B$2"}]}}; }
  });

  // motherless.com.js
  matchRules.push({
    domain: "motherless.com",
    apply: function() { window.SITE_SETTINGS={"motherless.com":{ignore:".img-container :not(img)",srcMatching:[{srcRegExp:"((//cdn\\d*-)thumbs(\\.motherlessmedia\\.com/)thumbs(/\\w+)).*(@IMG@)",processor:["$2images$3images$4$5","$1$5",e=>150===e.width&&150===e.height]}]}}; }
  });

  // mp.weixin.qq.com.js
  matchRules.push({
    domain: "mp.weixin.qq.com",
    apply: function() { window.SITE_SETTINGS={"mp.weixin.qq.com":{srcMatching:[{srcRegExp:"(//mmbiz\\.q(?:logo|pic)\\.cn/(?:\\w*/){2}).*",processor:"$1"},{srcRegExp:"(//mp\\.weixin\\.qq\\.com/mp/qrcode?.*?&size=)\\d+(.*)",processor:"$1980$2"}]}}; }
  });

  // music.163.com.js
  matchRules.push({
    domain: "music.163.com",
    apply: function() { window.SITE_SETTINGS={"music.163.com":{ignore:".u-cover :not(img)"}}; }
  });

  // mydrivers.com.js
  matchRules.push({
    domain: "mydrivers.com",
    apply: function() { window.SITE_SETTINGS={"mydrivers.com":{srcMatching:[{srcRegExp:"(//.+?\\.mydrivers\\.com/img/\\d+/)(?:s_?)(.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+?\\.mydrivers\\.com/avatars/.+_)(?:small|medium)(@IMG@)",processor:"$1large$2"}]}}; }
  });

  // myfonts.com.js
  matchRules.push({
    domain: "myfonts.com",
    apply: function() { window.SITE_SETTINGS={"myfonts.com":{srcMatching:[{srcRegExp:"(//.+?\\.myfonts\\.net/cdn-cgi/image/).+(/images/.+)",processor:"$1$2"}]}}; }
  });

  // mynet.com.js
  matchRules.push({
    domain: "mynet.com",
    apply: function() { window.SITE_SETTINGS={"mynet.com":{srcMatching:[{srcRegExp:".*(//.+?\\.mynet\\.com(?:\\.tr)?/.+-)\\d+x\\d+(@IMG@)",processor:"$1autox0$2"}]}}; }
  });

  // myprotein.js
  matchRules.push({
    domain: "myprotein",
    apply: function() { window.SITE_SETTINGS={myprotein:{srcMatching:[{srcRegExp:"/images\\?url=([^&]+)",processor:({srcRegExpObj:c,triggerSrc:r})=>decodeURIComponent(c.exec(r)?.[1]||"")},{srcRegExp:"(//.+\\.thg?cdn\\.(?:com|cn)/).+(/[-\\d]+@IMG@)",processor:"$1productimg/original$2"},{srcRegExp:"(//.+\\.thg?cdn\\.(?:com|cn)/images/)(?:x?small|medium|large)(/.+@IMG@)",processor:"$1large$2"},{srcRegExp:"(//uploads-cdn\\.thg?blogs\\.(?:com|cn)/.+?)(?:-150x150)?(@IMG@)",processor:"$1$2"}]}}; }
  });

  // nejm.org.js
  matchRules.push({
    domain: "nejm.org",
    apply: function() { window.SITE_SETTINGS={"nejm.org":{srcMatching:[{processor:({trigger:e})=>{const s=e.closest("a")?.dataset,r=s?.searchResultId||s?.multimediaContentid;return!/_/.test(r)&&`/do/${r}/media/${r.split("/")[1]}_iso.jpg`},selectors:"a[data-search-result-id] img,a[data-multimedia-contentid] img"},{srcRegExp:"(/images/editorial/)small(/\\w+)_\\d+x\\d+.*?(@IMG@)",processor:["$1large$2_600x400$3"]},{srcRegExp:"(/images/.+?)_\\d+x\\d+.*?(@IMG@)",processor:"$1_600x400$2"},{srcRegExp:"(/ContentServer/images\\?id=[^&]+).*",processor:"$1"},{srcRegExp:"(/thumbnails/\\w+)-\\d+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // netflix.com.js
  matchRules.push({
    domain: "netflix.com",
    apply: function() { window.SITE_SETTINGS={"netflix.com":{srcMatching:[{processor:({trigger:e})=>{const t=/(?<=\/title\/)\d+/.exec(e.href)?.[0];return tools.fetchHdImageFromPageMeta(t,e.href)},selectors:'a[href*="netflix.com/title/"]'}]}}; }
  });

  // netsea.jp.js
  matchRules.push({
    domain: "netsea.jp",
    apply: function() { window.SITE_SETTINGS={"netsea.jp":{srcMatching:[{srcRegExp:"//\\D+(\\d+\\.netsea.jp/)(?:image/\\d+/\\d+/)?(.+/)(?:\\D+_)?(.+@IMG@)",processor:"//img$1$2$3"}]}}; }
  });

  // newegg.js
  matchRules.push({
    domain: "newegg",
    apply: function() { window.SITE_SETTINGS={newegg:{srcMatching:[{srcRegExp:"(/\\w+)compressall\\d*(/.+@IMG@)",processor:"$1compressall1280$2"},{srcRegExp:"/productimage/\\w+(/.+@IMG@)",processor:"/ProductImagecompressall1280$1"},{srcRegExp:"/reviewimg\\d+(/.+@IMG@)",processor:"/reviewimg1920$1"},{srcRegExp:"(//media\\.flixcar\\.com/.+)-[a-z]+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//\\w*\\.neweggimages\\.com\\.cn/.+/)p\\d+(/.+@IMG@)",processor:"$1p640$2"}]}}; }
  });

  // newworld.co.nz.js
  matchRules.push({
    domain: "newworld.co.nz",
    apply: function() { window.SITE_SETTINGS={"newworld.co.nz":{srcMatching:[{srcRegExp:"(//\\w+\\.fsimg\\.co\\.nz/.+?/image/)\\d+x\\d+(/.+@IMG@).*",processor:"$1master$2"},{srcRegExp:"(//\\w+\\.fsimg\\.co\\.nz/.+@IMG@).*",processor:"$1"}]}}; }
  });

  // nexusmods.com.js
  matchRules.push({
    domain: "nexusmods.com",
    apply: function() { window.SITE_SETTINGS={"nexusmods.com":{srcMatching:[{srcRegExp:"(//.+?\\.nexusmods\\.com/.+/)(?:t/(?:med|large|small)|thumbnails)/(.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // nhentai.net.js
  matchRules.push({
    domain: "nhentai.net",
    apply: function() { window.SITE_SETTINGS={"nhentai.net":{srcMatching:[{srcRegExp:"//t(\\d+\\.nhentai\\.net/.+/)(?:cover|thumb)(@IMG@).*",processor:"//i$11$2"},{srcRegExp:"//t(\\d+\\.nhentai\\.net/.+/\\d+)\\w*(@IMG@).*",processor:"//i$1$2"}]}}; }
  });

  // nike.js
  matchRules.push({
    domain: "nike",
    apply: function() { window.SITE_SETTINGS={nike:{srcMatching:[{srcRegExp:"(//static\\.nike\\.com/.+?/images/).+?/(\\w{8}(?:-\\w{4}){3}-\\w{12}/.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // nimo.tv.js
  matchRules.push({
    domain: "nimo.tv",
    apply: function() { window.SITE_SETTINGS={"nimo.tv":{srcMatching:[{srcRegExp:"(//.+?\\.nimo\\.tv/.+\\w+)_\\d+_\\d+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+?\\.nimo\\.tv/.+\\w+@IMG@/)\\w+(/img@IMG@)",processor:"$1$2"}]}}; }
  });

  // nipic.com.js
  matchRules.push({
    domain: "nipic.com",
    apply: function() { window.SITE_SETTINGS={"nipic.com":{ignore:".watermark",srcMatching:[{srcRegExp:"(//pic\\d*\\.(?:nipic\\.com|n[tx]img\\.cn)/)(?:pic|file)(/.+)_\\d(@IMG@)",processor:"$1file$2_2$3"},{srcRegExp:"(//pic\\w?\\d*\\.huitu\\.com/)(?:pic|img|res)(/.+?)_\\d(?:_\\w\\d+x\\d+)?(@IMG@)",processor:"$1res$2_1$3"},{srcRegExp:"(//show\\.huitu\\.com/avatar/)(?:\\d+/)?(\\d+@IMG@)",processor:"$1$2"},{srcRegExp:"//taskupload\\d+\\.huitu\\.com/.+@IMG@"}]}}; }
  });

  // njpwworld.com.js
  matchRules.push({
    domain: "njpwworld.com",
    apply: function() { window.SITE_SETTINGS={"njpwworld.com":{srcMatching:[{srcRegExp:"(\\w+)-.+?(@IMG@)",processor:"$1$2"}]}}; }
  });

  // nmbxd1.com.js
  matchRules.push({
    domain: "nmbxd1.com",
    apply: function() { window.SITE_SETTINGS={"nmbxd1.com":{srcMatching:[{srcRegExp:"(//image\\.nmb\\.best/)thumb(/.+@IMG@)",processor:"$1image$2"}]}}; }
  });

  // noelleeming.co.nz.js
  matchRules.push({
    domain: "noelleeming.co.nz",
    apply: function() { window.SITE_SETTINGS={"noelleeming.co.nz":{srcMatching:[{srcRegExp:"(noelleeming\\.co\\.nz/.+?@IMG@).*",processor:"$1"},{srcRegExp:"(media\\.flixcar\\.com/.+)-(?:preview|thumb)(@IMG@)",processor:"$1$2"}]}}; }
  });

  // nohat.cc.js
  matchRules.push({
    domain: "nohat.cc",
    apply: function() { window.SITE_SETTINGS={"nohat.cc":{srcMatching:[{srcRegExp:"(//.+?\\.nohat\\.me/\\w+?)_\\d{2,}@IMG@",processor:"$1.png"},{srcRegExp:"(//.+?\\.nohat\\.cc/thumb/\\w+/)\\d+(/.+@IMG@)",processor:"$11020$2"},{srcRegExp:"(//.+?\\.nohat\\.cc/imgs/\\w+/)\\d+(@IMG@)",processor:"$10$2"}]}}; }
  });

  // nowtv.com.tr.js
  matchRules.push({
    domain: "nowtv.com.tr",
    apply: function() { window.SITE_SETTINGS={"nowtv.com.tr":{srcMatching:[{srcRegExp:"(.+/)(?:posters|thumbnail)(/.+)",processor:"$1cover$2"}]}}; }
  });

  // nytimes.com.js
  matchRules.push({
    domain: "nytimes.com",
    apply: function() { window.SITE_SETTINGS={"nytimes.com":{srcMatching:[{srcRegExp:"(//.+?\\.nyt\\.com/.+?-)\\w+(?:-v\\d+)?(@IMG@).*",processor:["$1superJumbo$2"]}]}}; }
  });

  // nzsale.co.nz.js
  matchRules.push({
    domain: "nzsale.co.nz",
    apply: function() { window.SITE_SETTINGS={"nzsale.co.nz":{srcMatching:[{srcRegExp:"(//cdn\\.mysalemarketplace\\.com/.+)_\\d+x\\d+(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//cdn\\.mysalemarketplace\\.com/.+?@IMG@).*",processor:"$1"}]}}; }
  });

  // ok.ru.js
  matchRules.push({
    domain: "ok.ru",
    apply: function() { !function(){function e(e,t){return tools.fetch("/web-api/v2/imageLayer/getInfo",{data:{parameters:{photoId:e,type:t||"GROUP"}},method:"POST"}).then(({json:e})=>e?.success&&e?.result?.downloadUrl).then(t=>tools.cacheImage(e,t))}function t(t){const o=/(?<=\/)(?:group|profile)\/\d+/.exec(t)?.[0]||/(?<=ok.ru\/)[^/]+/.exec(t)?.[0];return o&&(tools.cacheImage(o)||(()=>tools.fetch(o,{dataType:"html"}).then(({doc:t})=>{const r=t.querySelector('#hook_Block_Avatar img,anonym-user-head [class*="avatar-container"] img'),a=/(?<=\/pphotos\/)\d+/.exec(t.querySelector(`a[href^="/${o}/pphotos"]`)?.href||r?.closest("a")?.href)?.[0]||new URLSearchParams(r?.nextElementSibling?.href).get("st.layer.photoId");return a?tools.cacheImage(a)||e(a):r?tools.getLargestImageSrc(r):null}).then(e=>tools.cacheImage(o,e))))}function o(t){return tools.fetch(t,{dataType:"html"}).then(({doc:t})=>{const o=t.querySelector(".media-block:is(.media-video,.media-photos)");if(o.matches(".media-video"))return JSON.parse(o.querySelector('[data-module="OKVideo"][data-options]')?.dataset.options||"null")?.poster;if(o.matches(".media-photos")){const t=new URL(o.querySelector(".media-photos_a:first-child")?.href).searchParams,r=t.get("st.layer.photoId");return r&&(tools.cacheImage(r)||e(r,t.get("st.layer.type")))}return Promise.reject()})}window.SITE_SETTINGS={"ok.ru":{onPageLoad:()=>{window.addEventListener("message",({data:{args:e,cmd:t}={},source:o})=>{if(o?.top===window&&"SET_XHR_TOKEN"===t)window.xhrToken=e.xhrToken})},srcMatching:[{processor:({trigger:t})=>{const o=new URLSearchParams(t.closest('a[href*="st.layer.photoId"]')?.href||t.nextElementSibling?.getAttribute("hrefattrs")||t.nextElementSibling?.href),r=o.get("st.layer.photoId")||JSON.parse(t.closest('a[data-query*="photoId"]')?.dataset.query||"null")?.photoId;return r&&(tools.cacheImage(r)||(()=>e(r,o.get("st.layer.type"))))},selectors:'a[href*="st.layer.photoId"] img,img:has(+a[hrefattrs*="st.layer.photoId"],+a[href*="st.layer.photoId"]),a[data-query*="photoId"] img'},{processor:({trigger:e})=>{const o=JSON.parse(e.dataset.query||"null")?.userId,r=e.closest("a")?.href;return o?t(`/profile/${o}`):r&&!/\/(?:app|game)\//.test(r)?t(r.replace("/dailyphoto","")):null},selectors:'.feed-avatar-img,.photo_img,.ucard_img_a img,a[href^="/group/"] img,a[href^="/profile/"] img,img[data-query*="userId"],[data-tsid="user-avatar"] img,a[href$="/dailyphoto"] img,[data-uikit-old*="Avatar"] img'},{processor:({trigger:e})=>t(e.closest(".entity-shortcut-menu_body")?.querySelector(".entity-shortcut-menu_a")?.href),selectors:".entity-shortcut-menu_body .entity-shortcut-menu_avatar img"},{processor:({trigger:t})=>{const o=/\d+/.exec(t.closest('[data-l^="ti"]')?.dataset.l)?.[0];return o&&(tools.cacheImage(o)||(()=>e(o)))},selectors:'[data-l^="ti"] img'},{processor:({trigger:e})=>{const t=e.getRootNode()?.host;return(t?.closest("vk-video-player")?.getAttribute("stub-thumb-url")||JSON.parse(t?.closest('[data-module="OKVideo"][data-options]')?.dataset.options||"null")?.poster)?.replace(/(?<=&fn=external_)\d+/,"8")},selectors:"video"},{processor:({trigger:e,triggerSrc:t})=>tools.cacheImage(t)||(()=>o(e.closest('[class*="card-photo-inner"]')?.nextElementSibling?.href).then(e=>tools.cacheImage(t,e))),selectors:'[class*="card-photo-inner"]:has(+a[href*="/topic/"]) img'},{processor:({trigger:e,triggerSrc:t})=>tools.cacheImage(t)||(()=>o(e.closest("hobby-side-block-card")?.querySelector(".hobby-side-block-link")?.href).then(e=>tools.cacheImage(t,e))),selectors:'hobby-side-block-card img[class*="card-photo-img"]'},{processor:({trigger:e,triggerSrc:t})=>tools.cacheImage(t)||(()=>o(e.closest(".media-topic")?.querySelector(".media-topic_a")?.href).then(o=>tools.cacheImage(t,{title:e.closest(".media-topic")?.querySelector(".media-topic_tx")?.textContent,..."string"==typeof o?{src:o}:o}))),selectors:'.media-topic_a+[class*="media-topic_img"] img'},{processor:({trigger:t})=>{const o=/(?<=\/pphotos\/)\d+/.exec(t.closest('a[href*="/pphotos/"]')?.href)?.[0];return o&&(tools.cacheImage(o)||(()=>e(o)))},selectors:'a[href*="/pphotos/"] img'},{processor:({trigger:t})=>{const o=/(?<=\/profile\/)\d+/.exec(t.closest('a[href*="/profile/"]')?.href)?.[0];return o&&(tools.cacheImage(o)||(()=>e(o)))},selectors:'a[href*="/profile/"] img'},{processor:({trigger:t,triggerSrc:o})=>{const{methodName:r,...a}=JSON.parse(t.closest("photo-album-card[album]")?.getAttribute("album")||"{}}")?.loadCollageData;return o&&(tools.cacheImage(o)||window.xhrToken&&r&&(()=>tools.fetch(`/web-api/v2/${r}`,{data:{parameters:a},headers:{tkn:window.xhrToken},method:"POST"}).then(({json:t})=>Array.isArray(t?.result)&&Promise.all(t.result.map(({id:t,imgSrc:o})=>Promise.resolve(tools.cacheImage(t)||e(t)).then(e=>e&&tools.cacheImage(o,e))))).then(()=>tools.cacheImage(o))))},selectors:'photo-album-card[album] img[class^="collageFrame_img"]'},{processor:({trigger:e})=>t(e.closest('[class*="container"]')?.querySelector("a")?.href),selectors:'[class*="container"]:has([class*="img-wrapper"] img):has(a) img'},{srcRegExp:"(?<=\\bfn=external_)\\d+",processor:"8"}]}}}(); }
  });

  // olevod.com.js
  matchRules.push({
    domain: "olevod.com",
    apply: function() { window.SITE_SETTINGS={"olevod.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:".case-img"}]}}; }
  });

  // onlyfans.com.js
  matchRules.push({
    domain: "onlyfans.com",
    apply: function() { window.SITE_SETTINGS={"onlyfans.com":{srcMatching:[{srcRegExp:"//thumbs\\.onlyfans\\.com/public/files/thumbs/\\w+(/.+@IMG@)",processor:"//public.onlyfans.com/files$1"}]}}; }
  });

  // op.gg.js
  matchRules.push({
    domain: "op.gg",
    apply: function() { window.SITE_SETTINGS={"op.gg":{srcMatching:[{srcRegExp:"(//.+?\\.akamaized\\.net/.+/)loading(/.+@IMG@).*",processor:"$1splash$2"}]}}; }
  });

  // open.spotify.com.js
  matchRules.push({
    domain: "open.spotify.com",
    apply: function() { !function(){const e={"00004851":"0000b273","00001e02":"0000b273","000011eb":"0000aa54","0000e1a3":"0000aa54","00006c11":"0000bebb","0000da84":"0000bebb","0000dec5":"000097ac","0000d72c":"000097ac","0000f178":"0000e5eb","00005174":"0000e5eb","0000101f":"000086f7","0000939b":"000086f7","0000f68d":"0000ba8a","00005f1f":"0000ba8a","0000955f":"0000eeee","0000bdcf":"0000eeee","0000703b":"000022a8","0000db5b":"000022a8","00000c35":"0000382d","000076bd":"0000382d","00009fbb":"00005e4e","00009256":"00005e4e","0000372b":"0000980d","00002d5b":"0000980d"};window.SITE_SETTINGS={"open.spotify.com":{maxLookupDepth:4,ignore:".S4OmZ_IZexmZ5dasPqW5,.I0bVSxvqA3rm5HvciMap,.yhlH4Dsjqw56Z58EOwvQ,.PkOz5g82CaoKk1J3GX0e",srcMatching:[{srcRegExp:"(//.+?\\.scdn\\.co/image/\\w{8})(\\w{8})(.+)",processor:({srcRegExpObj:b,triggerSrc:a})=>b.test(a)&&e[RegExp.$2]&&[`$1${e[RegExp.$2]}$3`]}]}}}(); }
  });

  // ozon.ru.js
  matchRules.push({
    domain: "ozon.ru",
    apply: function() { window.SITE_SETTINGS={"ozon.ru":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:"[reviewuuid]:has(img)"},{srcRegExp:"(//.+?\\.(?:ozone\\.ru|ozonusercontent\\.com)/.+/)\\w+/(.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",e=>100===e.width&&100===e.height]}]}}; }
  });

  // paknsave.co.nz.js
  matchRules.push({
    domain: "paknsave.co.nz",
    apply: function() { window.SITE_SETTINGS={"paknsave.co.nz":{srcMatching:[{srcRegExp:"(//\\w+\\.fsimg\\.co\\.nz/.+?/image/)\\d+x\\d+(/.+@IMG@).*",processor:"$1master$2"},{srcRegExp:"(//\\w+\\.fsimg\\.co\\.nz/.+@IMG@).*",processor:"$1"}]}}; }
  });

  // pbtech.js
  matchRules.push({
    domain: "pbtech",
    apply: function() { window.SITE_SETTINGS={pbtech:{srcMatching:[{srcRegExp:"/thumbs/(?:\\d+/)?(.+?@IMG@).*",processor:"/imgprod/default/$1"}]}}; }
  });

  // perplexity.ai.js
  matchRules.push({
    domain: "perplexity.ai",
    apply: function() { window.SITE_SETTINGS={"perplexity.ai":{srcMatching:[{srcRegExp:"(.+/)t_(?:limit|thumbnail)/(https?:.+)",processor:["$2","$1$2"]},{srcRegExp:"(.+/)t_(?:limit|thumbnail)/(.+)",processor:"$1$2"}]}}; }
  });

  // pexels.com.js
  matchRules.push({
    domain: "pexels.com",
    apply: function() { window.SITE_SETTINGS={"pexels.com":{srcMatching:[{srcRegExp:"(//images\\.pexels\\.com/users/avatars/.+?@IMG@).*",processor:"$1?w=10000"},{srcRegExp:"(//.+\\.(?:pexels|unsplash)\\.com/(?:[^?](?!video-id))+)(?:\\?.*)?$",processor:"$1"},{srcRegExp:"//.+\\.istockphoto\\.com/id/(\\d+)/.+@IMG@",processor:({triggerSrc:s,srcRegExpObj:o})=>{const e=o.test(s)&&RegExp.$1;return e&&(tools.cacheImage(e)||(()=>tools.fetch("https://www.istockphoto.com/collaboration/board_assets.json",{data:{asset_ids:e}}).then(s=>tools.cacheImage(e,{src:s?.json?.[0]?.delivery_urls?.comp1024||s?.json?.[0]?.delivery_urls?.comp,title:s?.json?.[0]?.title}))))}}]}}; }
  });

  // pinterest.js
  matchRules.push({
    domain: "pinterest",
    apply: function() { window.SITE_SETTINGS={pinterest:{srcMatching:[{srcRegExp:"(//i\\.pinimg\\.com/)(?:originals|\\d+x(?:\\d+(?:_\\w+)?)?)(/.+@IMG@)",processor:["$1originals$2","$1736x$2"]}]}}; }
  });

  // pixiv.net.js
  matchRules.push({
    domain: "pixiv.net",
    apply: function() { window.SITE_SETTINGS={"pixiv.net":{referrerAddedHostnames:["pximg.net"],srcMatching:[{srcRegExp:"(//.+\\.pximg\\.net/user-profile/.+)_\\d+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/.+/.+_thumb/.+)_\\w+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)(?=/).+(/uploads/.+/)(?:.+_)?(\\d+@IMG@)",processor:"$1$2$3"},{srcRegExp:"(//.+\\.pixiv\\.net/images/post/\\d+)/w/\\d+(/.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/).+(/img/.+?)(_p\\d+)?(?:_.+)?(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:p})=>e.test(p)&&tools.detectImage([`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}${RegExp.$4}`,`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}.png`])},{srcRegExp:"(//.+\\.pximg\\.net/)\\w+/\\d+x\\d+[^/]*/(.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)/c!?/[^/]+(/.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // pixivision.net.js
  matchRules.push({
    domain: "pixivision.net",
    apply: function() { window.SITE_SETTINGS={"pixivision.net":{referrerAddedHostnames:["pximg.net"],srcMatching:[{srcRegExp:"(//.+\\.pximg\\.net/user-profile/.+)_\\d+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/.+/.+_thumb/.+)_\\w+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)(?=/).+(/uploads/.+/)(?:.+_)?(\\d+@IMG@)",processor:"$1$2$3"},{srcRegExp:"(//.+\\.pixiv\\.net/images/post/\\d+)/w/\\d+(/.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/).+(/img/.+?)(_p\\d+)?(?:_.+)?(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:p})=>e.test(p)&&tools.detectImage([`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}${RegExp.$4}`,`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}.png`])},{srcRegExp:"(//.+\\.pximg\\.net/)\\w+/\\d+x\\d+[^/]*/(.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)/c!?/[^/]+(/.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // plurk.com.js
  matchRules.push({
    domain: "plurk.com",
    apply: function() { window.SITE_SETTINGS={"plurk.com":{srcMatching:[{processor:({trigger:r,triggerSrc:e})=>tools.fetchHdImageFromPageMeta(e,r.closest("a.meta")?.href,{fallbackSrc:e,withTitle:!0}),selectors:"a.meta img"},{processor:({trigger:r})=>r.alt,selectors:"a.pictureservices img[alt]"},{srcRegExp:"(//images\\.plurk\\.com/)\\w{2}_(.+)(@IMG@)",processor:["$1$2$3","$1$2.png"]},{srcRegExp:"(//imgs\\.plurk\\.com/.+_)\\w{2}(@IMG@)",processor:["$1lg$2","$1lg.png"]},{srcRegExp:"(//avatars\\.plurk\\.com/.+-)(?:medium|small)(.+)@IMG@",processor:"$1big$2.jpg"}]}}; }
  });

  // poco.cn.js
  matchRules.push({
    domain: "poco.cn",
    apply: function() { window.SITE_SETTINGS={"poco.cn":{srcMatching:[{srcRegExp:"//.+?(\\.pocoimg\\.cn/image/.+?)(?:_[A-Z]\\d+)?(@IMG@).*",processor:"//pic3$1$2"}]}}; }
  });

  // pornhub.com.js
  matchRules.push({
    domain: "pornhub.com",
    apply: function() { !function(){function e(e){return()=>tools.fetch(`/photo/${e}`,{dataType:"html"}).then(({doc:r})=>tools.cacheImage(e,r.querySelector("#photoImageSection .centerImage img")?.src))}window.SITE_SETTINGS={"pornhub.com":{ignore:".playlist-text",srcMatching:[{thumbType:"posters",processor:({trigger:e})=>{const r=new URL(e.href)?.searchParams.get("viewkey");return r&&tools.fetchHdImageFromPageMeta(r,e.href,{withTitle:!0})},selectors:'a[href*="view_video.php?viewkey="]'},{srcRegExp:"//.+\\.ph(?:n|pr)cdn\\.com/pics/.+?_(\\d+)@IMG@",processor:({srcRegExpObj:r,triggerSrc:o})=>{const c=r.exec(o)?.[1];return c&&(tools.cacheImage(c)||e(c))}},{srcRegExp:"/photo/(\\d+)",processor:({srcRegExpObj:r,trigger:o})=>{const c=r.exec(o.href)?.[1];return c&&(tools.cacheImage(c)||e(c))},selectors:'a[href^="/photo/"]'},{srcRegExp:"(//.+\\.ph(?:n|pr)cdn\\.com/images/categories/)\\d+x\\d+/(.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.ph(?:n|pr)cdn\\.com/.+?)\\(.+\\)(\\d+@IMG@)",processor:["$1$2"]},{srcRegExp:"(.+\\.nsimg\\.net/biopic/)\\d+x\\d+(/\\d+)",processor:"$1320x240$2"}]}}}(); }
  });

  // pornpics.com.js
  matchRules.push({
    domain: "pornpics.com",
    apply: function() { window.SITE_SETTINGS={"pornpics.com":{srcMatching:[{srcRegExp:"(//cdni\\.pornpics\\.com/)\\d+(/.+@IMG@)",processor:"$11280$2"}]}}; }
  });

  // pornxp.js
  matchRules.push({
    domain: "pornxp",
    apply: function() { window.SITE_SETTINGS={pornxp:{ignore:".item_preview"}}; }
  });

  // primevideo.com.js
  matchRules.push({
    domain: "primevideo.com",
    apply: function() { window.SITE_SETTINGS={"primevideo.com":{ignore:"._0r6cJW.ESUyK5",srcMatching:[{srcRegExp:"(//.+?\\.media-amazon\\.com/images/[^.]+).+(@IMG@)",processor:["$1$2"]},{processor:({trigger:e})=>e.querySelector("img"),selectors:'[data-testid="super-carousel-card"]'}]}}; }
  });

  // propertyguru.com.js
  matchRules.push({
    domain: "propertyguru.com",
    apply: function() { window.SITE_SETTINGS={"propertyguru.com":{srcMatching:[{srcRegExp:"(//.+?\\.pgimgs\\.com/.+?\\.)[A-Z]\\d+(?:X\\d+|\\w+)?((?:/.+)?@IMG@)",processor:"$1V800$2"},{srcRegExp:"(//.+?\\.iproperty\\.com\\.my/.+/)\\d+x\\d+[^/]*(/.+@IMG@)",processor:"$12000x2000-fit$2"}]}}; }
  });

  // pubg.com.js
  matchRules.push({
    domain: "pubg.com",
    apply: function() { window.SITE_SETTINGS={"pubg.com":{srcMatching:[{srcRegExp:"(//.+?\\.krafton\\.com/.+)_thumb(@IMG@)",processor:"$1$2"}]}}; }
  });

  // pximg.net.js
  matchRules.push({
    domain: "pximg.net",
    apply: function() { window.SITE_SETTINGS={"pximg.net":{referrerAddedHostnames:["pximg.net"],srcMatching:[{srcRegExp:"(//.+\\.pximg\\.net/user-profile/.+)_\\d+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/.+/.+_thumb/.+)_\\w+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)(?=/).+(/uploads/.+/)(?:.+_)?(\\d+@IMG@)",processor:"$1$2$3"},{srcRegExp:"(//.+\\.pixiv\\.net/images/post/\\d+)/w/\\d+(/.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/).+(/img/.+?)(_p\\d+)?(?:_.+)?(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:g})=>e.test(g)&&tools.detectImage([`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}${RegExp.$4}`,`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}.png`])},{srcRegExp:"(//.+\\.pximg\\.net/)\\w+/\\d+x\\d+[^/]*/(.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)/c!?/[^/]+(/.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // qdmm.com.js
  matchRules.push({
    domain: "qdmm.com",
    apply: function() { window.SITE_SETTINGS={"qdmm.com":{srcMatching:[{srcRegExp:"(//.+?\\.(?:qidian|qpic|yuewen)\\.c(?:n|om)/.+)/\\d+(?:@IMG@)?",processor:"$1/0"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:({srcRegExpObj:c,trigger:e})=>c.test(tools.getBackgroundImageSrc(e))&&`${RegExp.$1}o${RegExp.$2}`,selectors:".cover"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:"$1o$2"}]}}; }
  });

  // qidian.com.js
  matchRules.push({
    domain: "qidian.com",
    apply: function() { window.SITE_SETTINGS={"qidian.com":{srcMatching:[{srcRegExp:"(//.+?\\.(?:qidian|qpic|yuewen)\\.c(?:n|om)/.+)/\\d+(?:@IMG@)?",processor:"$1/0"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:({srcRegExpObj:c,trigger:e})=>c.test(tools.getBackgroundImageSrc(e))&&`${RegExp.$1}o${RegExp.$2}`,selectors:".cover"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:"$1o$2"}]}}; }
  });

  // qzone.qq.com.js
  matchRules.push({
    domain: "qzone.qq.com",
    apply: function() { window.SITE_SETTINGS={"qzone.qq.com":{srcMatching:[{srcRegExp:"(//.+\\.(?:qpic\\.cn|photo\\.store\\.qq\\.com)/.+?/)[abcilm](/[^&]+).*",processor:"$1b$2"},{srcRegExp:"(//.+\\.(?:qpic\\.cn|photo\\.store\\.qq\\.com)/.+?/)[abcilm]&.*",processor:"$1b"},{srcRegExp:"(//qlogo\\d+\\.store\\.qq\\.com/qzone/(?:\\d+/){2})\\d+.*",processor:"$1100"},{srcRegExp:"(//.+\\.qpic\\.cn/.+/)\\d+(?:\\?.*)?",processor:"$1"}]}}; }
  });

  // rakuten.co.jp.js
  matchRules.push({
    domain: "rakuten.co.jp",
    apply: function() { window.SITE_SETTINGS={"rakuten.co.jp":{srcMatching:[{processor:({trigger:r})=>r,selectors:".dui-card .image"}]}}; }
  });

  // razorsql.com.js
  matchRules.push({
    domain: "razorsql.com",
    apply: function() { window.SITE_SETTINGS={"razorsql.com":{srcMatching:[{processor:({trigger:r})=>r.closest("a").href,selectors:'a[href^="images/"] img'},{srcRegExp:"(//razorsql\\.com/images/.+?)_\\w+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // reddit.com.js
  matchRules.push({
    domain: "reddit.com",
    apply: function() { !function(){function e(e,t){return tools.fetch(e,{dataType:"html"}).then(({doc:e})=>{const r=e.querySelector("shreddit-embed"),s=/src="([^"]+)"/.exec(r?.getAttribute("html"))?.[1];if(!s){let r=e.querySelector('[post-type="video"][poster],gallery-carousel img,#post-image,[noun="image"]:has(img) img,[data-testid="trending-media"]:has(img,video) :is(img,video),[slot="text-body"] figure a:has(img)');return r.closest("shreddit-blurred-container")&&(r=r.closest("shreddit-blurred-container")?.querySelector('[slot="revealed"] img')||r),tools.getLargestImageSrc(r)?.src||t}if(/\/\/www\.youtube\.com\/embed\//.test(s))return o=s,tools.fetch(o,{dataType:"html"}).then(({doc:e})=>{try{return tools.getLargestImageInList(JSON.parse(/(?<=\"defaultThumbnail\\":\{\\"thumbnails\\":)\[[^\]]+\]/.exec(tools.getElementsByTextContent("ytcfg=",e)[0]?.textContent)?.[0]?.replaceAll("\\","")))?.url}catch(e){return Promise.reject()}});try{return new URL(s)?.searchParams.get("image")||t}catch(e){return t}var o}).then(e=>tools.cacheImage(t,e)).catch(()=>t)}window.SITE_SETTINGS={"reddit.com":{ignore:".lty-playbtn",srcMatching:[{scaleFree:!0,processor:({trigger:e})=>e.querySelector('[slot="revealed"] img'),selectors:"shreddit-blurred-container"},{processor:({trigger:e})=>e.getRootNode().host?.closest("a")?.href,selectors:'video[src*=".gif"]'},{processor:({trigger:t,triggerSrc:r})=>tools.cacheImage(r)||(()=>e(t.closest("shreddit-post[permalink]").getAttribute("permalink"),r)),selectors:'shreddit-post[permalink] [slot="thumbnail"] img'},{scaleFree:!0,processor:({trigger:t,triggerSrc:r})=>tools.cacheImage(r)||(()=>e(t.closest('[noun="recent_post"]').querySelector('a[href^="/r/"]:has(.i18n-list-item-post-title)')?.href,r)),selectors:'recent-posts [noun="recent_post"] :is(a,shreddit-pubsub-publisher) > img'},{processor:({trigger:t,triggerSrc:r})=>tools.cacheImage(r)||(()=>e(JSON.parse(t.closest("faceplate-tracker").dataset.faceplateTrackingContext||"null")?.post?.url,r)),selectors:"reddit-pdp-right-rail-post faceplate-tracker :not(faceplate-hovercard) a > img"},{processor:({trigger:t,triggerSrc:r})=>tools.cacheImage(r)||(()=>e(t.closest("a")?.href,r)),selectors:'faceplate-img,a[href*="//preview.redd.it/"] > img,a[href*="/search/"] img:not([avatar] img)'},{srcRegExp:"//.+/(?:profileIcon_snoo-?|avatars/)(.+?)-headshot.*(@IMG@).*",processor:"//i.redd.it/snoovatar/avatars/$1$2"},{srcRegExp:"(.*\\.(?:redditmedia|redditstatic)\\.com/.+@IMG@).*",processor:"$1"}]}}}(); }
  });

  // redgifs.com.js
  matchRules.push({
    domain: "redgifs.com",
    apply: function() { window.SITE_SETTINGS={"redgifs.com":{srcMatching:[{srcRegExp:"(//.+?\\.redgifs\\.com/.+-)(?:small|medium)(@IMG@)",processor:"$1large$2"}]}}; }
  });

  // roblox.com.js
  matchRules.push({
    domain: "roblox.com",
    apply: function() { window.SITE_SETTINGS={"roblox.com":{srcMatching:[{srcRegExp:"(//.+?\\.rbxcdn\\.com/.+/)(?:384/216|576/324)(/.+)",processor:"$1768/432$2"},{srcRegExp:"(//.+?\\.rbxcdn\\.com/.+/)(\\d+)/\\2(/.+)",processor:"$11024/1024$3"}]}}; }
  });

  // rottentomatoes.com.js
  matchRules.push({
    domain: "rottentomatoes.com",
    apply: function() { window.SITE_SETTINGS={"rottentomatoes.com":{srcMatching:[{srcRegExp:"(//images\\.fandango\\.com/imagerelay/)\\d+/\\d+(/.+?)(?:/redesign/.+)",processor:"$10/0$2"},{srcRegExp:"(//images\\.fandango\\.com)(?:/.+)?((?<!/)/images/.+@IMG@)",processor:"$1$2"},{srcRegExp:"https?://resizing\\.flixster\\.com/.+(https?://.+)",processor:"$1"},{srcRegExp:"(//images\\d*\\.vudu\\.com/.+-)\\d+",processor:["$1360","$1300"]}]}}; }
  });

  // rumble.com.js
  matchRules.push({
    domain: "rumble.com",
    apply: function() { window.SITE_SETTINGS={"rumble.com":{srcMatching:[{thumbType:"posters",srcRegExp:"(//.+?\\.com/video/.+?)\\w+(\\.\\d+)?(-small.+@IMG@)",processor:({srcRegExpObj:e,trigger:t,triggerSrc:o})=>{const c=e.exec(o),r=t.closest("[data-video-id]")?.dataset.videoId||o;return c&&(tools.cacheImage(r)||tools.detectImage(`${c[1]}qR4e${c[2]||""}${c[3]}`).catch(()=>tools.fetch((t.closest("a")||t.parentElement.querySelector("&>a"))?.href,{dataType:"html"}).then(({doc:e})=>{const t=e.querySelector('meta[property="og:image"]')?.content,c=e.querySelector('meta[property="og:title"]')?.content;return t?{src:t,title:c}:o}).catch(()=>o).then(e=>tools.cacheImage(r,e))))}}]}}; }
  });

  // ruten.com.tw.js
  matchRules.push({
    domain: "ruten.com.tw",
    apply: function() { window.SITE_SETTINGS={"ruten.com.tw":{srcMatching:[{srcRegExp:"(//.+?\\.rimg\\.com\\.tw/.+)_\\w(@IMG@)",processor:"$1$2"}]}}; }
  });

  // sciencedirect.com.js
  matchRules.push({
    domain: "sciencedirect.com",
    apply: function() { window.SITE_SETTINGS={"sciencedirect.com":{srcMatching:[{srcRegExp:"(//.+?\\.els-cdn\\.com/content/image/.+-cov)\\d+([wh]@IMG@)",processor:"$1200$2"},{srcRegExp:"(//.+?\\.els-cdn\\.com/content/image/.+)\\.sml",processor:"$1_lrg.jpg"},{srcRegExp:"(//.+?\\.els-cdn\\.com/content/image/.+?)(?:_lrg)?(@IMG@)",processor:"$1_lrg$2"}]}}; }
  });

  // seejav.js
  matchRules.push({
    domain: "seejav",
    apply: function() { window.SITE_SETTINGS={seejav:{srcMatching:[{srcRegExp:"//.+/data/attachment/forum/.+/(\\w+@IMG@)",processor:"//forum.javcdn.cc/i.imgur.com/$1"},{srcRegExp:"(//uc\\.javbus\\d*\\.com/.+avatar_)(?:small|middle)(@IMG@)",processor:"$1big$2"},{srcRegExp:"/thumbs?/(\\w+)(@IMG@)",processor:"/cover/$1_b$2"},{processor:({trigger:s})=>s.closest("a.sample-box")?.href,selectors:'a.sample-box[href*="pics.dmm.co.jp"] img'},{srcRegExp:"(//pics\\.dmm\\.co\\.jp/digital/video/.+?)ps(@IMG@)",processor:"$1pl$2"},{srcRegExp:"(//pics\\.dmm\\.co\\.jp/digital/video/.+?)(-\\d+@IMG@)",processor:"$1jp$2"},{srcRegExp:"/sample/(\\w+?)(_\\w+)?(@IMG@)",processor:"/bigsample/$1_b$2$3"}]}}; }
  });

  // sekaimon.com.js
  matchRules.push({
    domain: "sekaimon.com",
    apply: function() { window.SITE_SETTINGS={"sekaimon.com":{srcMatching:[{srcRegExp:"(//i\\.ebayimg\\.com/.+/s-l)\\d+(?:/p)?(@IMG@)",processor:"$12000$2"},{srcRegExp:"(//thumbs\\d+\\.ebaystatic\\.com/.+/l)\\d+(/.+@IMG@)",processor:"$12000$2"},{srcRegExp:"(//i\\.ebayimg\\.com/.+/\\$_)\\d+(@IMG@)",processor:"$110$2"}]}}; }
  });

  // sellpy.se.js
  matchRules.push({
    domain: "sellpy.se",
    apply: function() { window.SITE_SETTINGS={"sellpy.se":{srcMatching:[{srcRegExp:"(//.+?\\.sellpy\\.net/)fit-in/\\d+x\\d+/(.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // seznam.cz.js
  matchRules.push({
    domain: "seznam.cz",
    apply: function() { !function(){function e(t){return t?.flatMap(({data:{docId:t,snippet:{title:a,url:s}={}}={},subEntities:r})=>r?e(r):t?[[t,{src:s,title:a}]]:[])||[]}window.SITE_SETTINGS={"seznam.cz":{onPageLoad:()=>{const t=JSON.parse(document.querySelector("#renderer-state-data")?.dataset.state||"null");t&&tools.cacheImage(e([].concat(t.images?.detail?.entity||[],t.images?.imageEntities||[],t.images?.navigationImages||[])))},srcMatching:[{processor:({trigger:e,triggerSrc:t})=>{const a=e.closest("a")?.href,s=a&&new URL(a).searchParams.get("shareDocId")||/^imagesImageDetail_.+?(\w{16})$/.exec(e.closest("[data-e-child-portal]")?.dataset.eChildPortal)?.[1],r=tools.cacheImage(s),c=t.replace(/[?&]size=\d+/,"");return r?[r,c]:[c]},selectors:'img[src*="//img.obrazky.cz/"]'}]}}}(); }
  });

  // sfmao.net.js
  matchRules.push({
    domain: "sfmao.net",
    apply: function() { window.SITE_SETTINGS={"sfmao.net":{srcMatching:[{srcRegExp:"(//.+?\\.sfmao\\.net/.+@IMG@!)(?:thumbnail_)?(.+)",processor:"$1$2"}]}}; }
  });

  // shopee.js
  matchRules.push({
    domain: "shopee",
    apply: function() { window.SITE_SETTINGS={shopee:{ignore:'[alt="custom-overlay"],img:has(~.thumbnail-selected-mask),a ._h5Zq0.aXY7Pt .aXY7Pt.H7sp0t[style*="background-image"]',srcMatching:[{srcRegExp:"(//.+?\\.img\\.susercontent\\.com/[^_@]+).*",processor:["$1"]}]}}; }
  });

  // shopping.yahoo.co.jp.js
  matchRules.push({
    domain: "shopping.yahoo.co.jp",
    apply: function() { window.SITE_SETTINGS={"shopping.yahoo.co.jp":{srcMatching:[{srcRegExp:"(//.+?\\.c\\.yimg\\.jp/i/)\\w(/.+)",processor:"$1f$2"},{srcRegExp:"(//.+?\\.wear2\\.jp/.+)_\\d+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // shutterstock.com.js
  matchRules.push({
    domain: "shutterstock.com",
    apply: function() { window.SITE_SETTINGS={"shutterstock.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:':has(>picture[style*="pointer-events"])'},{srcRegExp:"(//.+\\.shutterstock\\.com/.+/)(?:stock-photo-)?([-\\w]+?)(?:\\d+\\w+)(-\\d+@IMG@)",processor:"$1$21000w$3"}]}}; }
  });

  // sifangmao.me.js
  matchRules.push({
    domain: "sifangmao.me",
    apply: function() { window.SITE_SETTINGS={"sifangmao.me":{srcMatching:[{srcRegExp:"(//.+?\\.sfmao\\.net/.+@IMG@!)(?:thumbnail_)?(.+)",processor:"$1$2"}]}}; }
  });

  // simpcity.su.js
  matchRules.push({
    domain: "simpcity.su",
    apply: function() { window.SITE_SETTINGS={"simpcity.su":{srcMatching:[{srcRegExp:"(//.+?\\.jpg\\d+\\.su/.+/avatars/)\\w(/.+@IMG@)",processor:"$1o$2"},{exclusive:!1,srcRegExp:"(//.+?\\.jpg\\d+\\.su/.+)\\.(?:md|th)(@IMG@)",processor:({srcRegExpObj:r,trigger:s,triggerSrc:e})=>(tools.getBackgroundImageSrc(s)||e).replace(r,"$1$2"),selectors:'img[style*="background-image"]'}]}}; }
  });

  // sinaimg.cn.js
  matchRules.push({
    domain: "sinaimg.cn",
    apply: function() { window.SITE_SETTINGS={"sinaimg.cn":{referrerAddedHostnames:["sinaimg.cn"],srcMatching:[{thumbType:"posters",processor:({trigger:e})=>e.querySelector('.wbpv-poster[style*="background-image"],.wbpv-podcast img:not([src=""]),.wbpv-miniplayer-podcast img:not([src=""])'),selectors:".wbp-video"},{srcRegExp:".+/(weiyinyue\\.music\\.sina\\.com\\.cn/.+@IMG@).*",processor:"//$1"},{srcRegExp:"(//mu\\d+\\.sinaimg\\.cn/)(?:(?:square|crop|frame)\\.[^/]+|original)/(.+@IMG@).*",processor:"$1$2"},{srcRegExp:"((?:.+\\.sinaimg\\.cn|image\\.storage\\.weibo\\.com)(?:/.+)?/)(?:small|large|thumbnail|\\w?mw\\d+|small|sq\\d+|thumb\\d+|bmiddle|orj\\d+|crop\\.[^/]+|square|wap\\d+)(/\\w+)(?:@IMG@)?.*",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&tools.detectImage([`${RegExp.$1}original${RegExp.$2}${"g"===RegExp.$2[22]?".gif":".jpg"}`,`${RegExp.$1}large${RegExp.$2}${"g"===RegExp.$2[22]?".gif":".jpg"}`],e=>75===e.width&&75===e.height)}]}}; }
  });

  // sketchfab.com.js
  matchRules.push({
    domain: "sketchfab.com",
    apply: function() { window.SITE_SETTINGS={"sketchfab.com":{ignore:".card__360-preview",srcMatching:[{srcRegExp:"/(?<type>avatars|models)/(?<id>\\w+)/",processor:({srcRegExpObj:e,triggerSrc:s})=>{const{type:t,id:a}=e.exec(s)?.groups||{};return a&&(tools.cacheImage(a)||(()=>tools.fetch(`//sketchfab.com/i/${t}/${a}`).then(e=>tools.cacheImage(a,tools.getLargestImageInList("avatars"===t?e?.json?.images:e?.json?.thumbnails?.images)?.url))))}}]}}; }
  });

  // smzdm.com.js
  matchRules.push({
    domain: "smzdm.com",
    apply: function() { window.SITE_SETTINGS={"smzdm.com":{srcMatching:[{srcRegExp:"(//avatarimg\\.(?:smzdm|zdmimg)\\.com/.+-)\\w+(@IMG@)",processor:"$1big$2"},{srcRegExp:"(//.+?\\.(?:smzdm|zdmimg)\\.com/images/user_logo/.+-)\\w+(@IMG@)",processor:"$1big$2"},{srcRegExp:"(//.+?\\.(?:smzdm|zdmimg)\\.com/.+@IMG@)_\\w+(@IMG@)",processor:["$1","$1_orig$2"]}]}}; }
  });

  // snapchat.com.js
  matchRules.push({
    domain: "snapchat.com",
    apply: function() { window.SITE_SETTINGS={"snapchat.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector('img[class*="SpotlightResultTile_thumbnail"]'),selectors:'[class*="SpotlightResultTile_mediaContainer"]'},{srcRegExp:"(//.+?\\.sc-cdn\\.net/\\w+/\\w+\\.)\\d+(\\.\\w+).*",processor:"$11306$2"},{srcRegExp:"//.+?\\.sc-cdn\\.net/aps/\\w+/(\\w+)",processor:({srcRegExpObj:e,triggerSrc:r})=>{if(e.test(r)){for(;e.test(r);)r=atob(RegExp.$1);return{triggerSrc:r}}}}]}}; }
  });

  // sohu.com.js
  matchRules.push({
    domain: "sohu.com",
    apply: function() { window.SITE_SETTINGS={"sohu.com":{srcMatching:[{srcRegExp:"(//.+?\\.itc\\.cn/)(?:[^/]+/)?(images.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // sotwe.com.js
  matchRules.push({
    domain: "sotwe.com",
    apply: function() { window.SITE_SETTINGS={"sotwe.com":{maxLookupDepth:5,srcMatching:[{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/(?:(?:[^/]+/)?default_)?profile_images/.+)_\\w+(?=@IMG@)(@IMG@)",processor:"$1$2"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/profile_banners/.+)/\\d+x\\d+",processor:"$1"},{thumbType:"posters",srcRegExp:"(//\\w+\\.twimg\\.com/amplify_video_thumb/.+\\?).*?\\b(format=[^&]+).*",processor:"$1$2&name=orig"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/media/.+?)(?:@IMG@:\\w+)?(.+[?&]name=)[^&]+(.*)",processor:"$1$2orig$3"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/.+\\?).*?\\b(format=[^&]+).*",processor:"$1$2&name=orig"}]}}; }
  });

  // soundcloud.com.js
  matchRules.push({
    domain: "soundcloud.com",
    apply: function() { window.SITE_SETTINGS={"soundcloud.com":{ignore:".sc-button",srcMatching:[{srcRegExp:"(//.+?\\.sndcdn\\.com/.+-)t\\d+x\\d+(@IMG@)",processor:["$1original$2","$1t500x500$2"]}]}}; }
  });

  // soutushenqi.com.js
  matchRules.push({
    domain: "soutushenqi.com",
    apply: function() { window.SITE_SETTINGS={"soutushenqi.com":{srcMatching:[{processor:({trigger:s})=>tools.cacheImage(s.dataset.src)||{triggerSrc:s.dataset.src},selectors:"canvas[data-src]"},{srcRegExp:"(//.+?\\.(?:baidu|bdstatic)\\.com/it/.+?&fm=\\d+).*",processor:"$1"},{srcRegExp:"(.+\\.(?:dtstatic|duitang)\\.com/uploads/[^.]+).*(@IMG@).*",processor:"$1$2"}]}}; }
  });

  // spankbang.com.js
  matchRules.push({
    domain: "spankbang.com",
    apply: function() { window.SITE_SETTINGS={"spankbang.com":{ignore:'[aria-label="Video Player"],.click_layer',srcMatching:[{srcRegExp:"(//.+?\\.sb-cd\\.com/.+?/)w:\\d+/(.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // sportsdirect.com.js
  matchRules.push({
    domain: "sportsdirect.com",
    apply: function() { window.SITE_SETTINGS={"sportsdirect.com":{srcMatching:[{srcRegExp:"(//.+?\\.sportsdirect\\.com/images/)products/((\\d{2})\\d+_)[^_]+(.*@IMG@)",processor:"$1imgzoom/$3/$2xxl$4"}]}}; }
  });

  // steamcommunity.com.js
  matchRules.push({
    domain: "steamcommunity.com",
    apply: function() { window.SITE_SETTINGS={"steamcommunity.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:".sale_capsule_image_ctn"},{srcRegExp:"(//avatars\\.fastly\\.steamstatic\\.com/.+?)(?:_medium)?(@IMG@)",processor:"$1_full$2"},{srcRegExp:"(//.+?\\.steamstatic\\.com/.+?)(?<!capsule)[._]\\d+x\\d+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // steampowered.com.js
  matchRules.push({
    domain: "steampowered.com",
    apply: function() { window.SITE_SETTINGS={"steampowered.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector("image,img,picture"),selectors:".sale_capsule_image_ctn"},{srcRegExp:"(//avatars\\.fastly\\.steamstatic\\.com/.+?)(?:_medium)?(@IMG@)",processor:"$1_full$2"},{srcRegExp:"(//.+?\\.steamstatic\\.com/.+?)(?<!capsule)[._]\\d+x\\d+(@IMG@)",processor:"$1$2"}]}}; }
  });

  // steemit.com.js
  matchRules.push({
    domain: "steemit.com",
    apply: function() { window.SITE_SETTINGS={"steemit.com":{srcMatching:[{srcRegExp:"(//steemitimages\\.com/u/[^/]+/avatar\\b).*",processor:"$1/large"},{srcRegExp:"https?://steemitimages\\.com/\\d+x\\d+/(https?://.+?\\.steemitimages\\.com/\\w+).*",processor:"$1"}]}}; }
  });

  // stock.adobe.com.js
  matchRules.push({
    domain: "stock.adobe.com",
    apply: function() { window.SITE_SETTINGS={"stock.adobe.com":{srcMatching:[{srcRegExp:"//.+?(\\.ftcdn\\.net/)(.+/)\\d+(_.+@IMG@)",processor:"//as2$1v2/$21000$3"}]}}; }
  });

  // stripchat.com.js
  matchRules.push({
    domain: "stripchat.com",
    apply: function() { window.SITE_SETTINGS={"stripchat.com":{srcMatching:[{processor:({trigger:r})=>r.querySelector("image,img,picture"),selectors:".video-thumb"},{srcRegExp:"(//static-cdn\\.strpst\\.com/.+/\\w+)-.+",processor:"$1"},{srcRegExp:"(//video-thumbs\\.strpst\\.com/.+/)\\d+(p/.+@IMG@)",processor:"$1720$2"}]}}; }
  });

  // suning.com.js
  matchRules.push({
    domain: "suning.com",
    apply: function() { window.SITE_SETTINGS={"suning.com":{srcMatching:[{srcRegExp:"(//(?:image|imgservice)\\d*\\.suning\\.cn/.+?)(?:_\\d+x\\d+)?(@IMG@).*",processor:"$1$2"}]}}; }
  });

  // t2tea.com.js
  matchRules.push({
    domain: "t2tea.com",
    apply: function() { window.SITE_SETTINGS={"t2tea.com":{srcMatching:[{srcRegExp:"(//cdn\\.intelligencebank\\.com/.+?/preset=)\\w+(/[^_]+).*",processor:"$1orginal$2"},{srcRegExp:"(//cdn\\.intelligencebank\\.com/.+?/)size=[^/]+(/.+)",processor:"$1original$2"}]}}; }
  });

  // taobao.com.js
  matchRules.push({
    domain: "taobao.com",
    apply: function() { window.SITE_SETTINGS={"taobao.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // taptap.cn.js
  matchRules.push({
    domain: "taptap.cn",
    apply: function() { window.SITE_SETTINGS={"taptap.cn":{srcMatching:[{thumbType:"posters",processor:({trigger:e})=>e.querySelector(".tap-player__poster-image"),selectors:".tap-player"}]}}; }
  });

  // target.com.js
  matchRules.push({
    domain: "target.com",
    apply: function() { window.SITE_SETTINGS={"target.com":{srcMatching:[{srcRegExp:"//target\\.scene7\\.com/is/image/[^?]+",processor:"$&?wid=800",selectors:'img[alt*="review"]'},{srcRegExp:"(//target\\.scene7\\.com/is/image/[^?]+).*",processor:"$1?wid=1200"},{srcRegExp:"(//edge\\.curalate\\.com/v\\d+/img/[^/]+).*",processor:"$1"}]}}; }
  });

  // tbs.com.js
  matchRules.push({
    domain: "tbs.com",
    apply: function() { window.SITE_SETTINGS={"tbs.com":{srcMatching:[{srcRegExp:"(//.+?/w_)\\d+(/.*)",processor:"$1auto$2"}]}}; }
  });

  // teams.live.com.js
  matchRules.push({
    domain: "teams.live.com",
    apply: function() { window.SITE_SETTINGS={"teams.live.com":{ignore:'img[itemtype*="Emoji"]',srcMatching:[{processor:({trigger:r,triggerSrc:e})=>r.dataset.gallerySrc||r.dataset.origSrc||e}]}}; }
  });

  // temu.com.js
  matchRules.push({
    domain: "temu.com",
    apply: function() { window.SITE_SETTINGS={"temu.com":{ignore:'[style*="background-image"]+video[src*="goods-vod.kwcdn.com"]'}}; }
  });

  // thatpervert.com.js
  matchRules.push({
    domain: "thatpervert.com",
    apply: function() { window.SITE_SETTINGS={"thatpervert.com":{referrerAddedHostnames:["thatpervert.com"],srcMatching:[{srcRegExp:"(//.+?/pics/post/)(?:full/)?([^/]+@IMG@)",processor:"$1full/$2"}]}}; }
  });

  // thewarehouse.co.nz.js
  matchRules.push({
    domain: "thewarehouse.co.nz",
    apply: function() { window.SITE_SETTINGS={"thewarehouse.co.nz":{srcMatching:[{srcRegExp:"(//.+\\.co\\.nz/)(?:dw/.+/)?(on/.+@IMG@).*",processor:"$1$2"},{srcRegExp:"(//themarket\\.azureedge\\.net/resizer/view\\?.+?)&w=.*",processor:"$1&w=0"}]}}; }
  });

  // thinkofliving.com.js
  matchRules.push({
    domain: "thinkofliving.com",
    apply: function() { window.SITE_SETTINGS={"thinkofliving.com":{srcMatching:[{srcRegExp:"(//.+?\\.pgimgs\\.com/.+?\\.)[A-Z]\\d+(?:X\\d+|\\w+)?((?:/.+)?@IMG@)",processor:"$1V800$2"},{srcRegExp:"(//.+?\\.iproperty\\.com\\.my/.+/)\\d+x\\d+[^/]*(/.+@IMG@)",processor:"$12000x2000-fit$2"}]}}; }
  });

  // threads.com.js
  matchRules.push({
    domain: "threads.com",
    apply: function() { window.SITE_SETTINGS={"threads.com":{srcMatching:[{processor:({trigger:o,triggerSrc:e})=>{const i=/\/@([^\/]+)$/.exec(o.closest('a[href^="/@"]')?.href)?.[1]||function(o){return/^(?:(.+?) se profielfoto|Profilový obrázek (.+?)|(.+?)s profilbillede|(.+?)s Profilbild|Εικόνα προφίλ του χρήστη (.+?)|(.+?)'s profile picture|Foto del perfil de (.+?)|Käyttäjän (.+?) profiilikuva|Photo de profil de (.+?)|Foto profil (.+?)|Immagine del profilo di (.+?)|(.+?)のプロフィール写真|(.+?)님의 프로필 사진|Gambar profil (.+?)|Profilbildet til (.+?)|Profielfoto van (.+?)|Zdjęcie profilowe (.+?)|Foto do perfil de (.+?)|Foto de perfil de (.+?)|Фото профиля (.+?)|รูปโปรไฟล์ของ (.+?)|Litrato sa profile ni (.+?)|(.+?)'in profil resmi|(.+?)的头像|(.+?)的大頭貼照|(.+?) এর প্রোফাইল ছবি|(.+?)નું પ્રોફાઇલ ચિત્ર|(.+?) का प्रोफ़ाइल चित्र|Slika profila (.+?)|(.+?) profilképe|(.+?) ಅವರ ಪ್ರೊಫೈಲ್ ಚಿತ್ರ|(.+?) എന്നയാളുടെ പ്രൊഫൈൽ ചിത്രം|(.+?) चे परिचय चित्र|(.+?) को प्रोफाइल तस्वीर|(.+?) ਦੀ ਪ੍ਰੋਫਾਈਲ ਫੋਟੋ|(.+?)ගේ පැතිකඩ පින්තූරය|Profilová fotka používateľa (.+?)|(.+?) இன் சுயவிவரப் படம்|(.+?) ప్రొఫైల్ చిత్రం|Ảnh đại diện của (.+?)|(.+?)的個人資料相片|Снимката на профила на (.+?)|Photo de profil de (.+?)|Fotografia de profil a contului (.+?)|Слика на профилу корисника (.+?)|Основна світлина (.+?))$/.exec(o.alt)?.slice(1).filter(Boolean)[0]||/^(?:Profielfoto|Profilová fotka|Profilbillede|Profilbild|Εικόνα προφίλ|Profile photo|Foto del perfil|Profiilikuva|Photo de profil|Foto profil|Immagine del profilo|プロフィール写真|프로필 사진|Profilbilde|Zdjęcie profilowe|Foto do perfil|Фото профиля|รูปโปรไฟล์|Litrato sa profile|Profil fotoğrafı|头像|大頭貼照|প্রোফাইল ফটো|પ્રોફાઇલ ફોટો|प्रोफ़ाइल फ़ोटो|Slika profila|Profilkép|ಪ್ರೊಫೈಲ್‌ ಫೋಟೋ|പ്രൊഫൈൽ ഫോട്ടോ|प्रोफाईल फोटो|प्रोफाइल फोटो|ਪ੍ਰੋਫ਼ਾਈਲ ਫ਼ੋਟੋ|ප්‍රොෆයිල ඡායාරූපය|சுயவிவரப் படம்|ప్రొఫైల్ ఫోటో|Ảnh đại diện|個人資料相片|Снимка на профила|Fotografie de profil|Фотографија на профилу|Основна світлина)$/i.test(o.alt)&&o.closest("header")?.querySelector("h2").textContent}(o);return i&&(tools.cacheImage(i)||(()=>tools.fetch(`/@${i}`,{dataType:"html"}).then(({doc:o})=>{const e=tools.getElementsByTextContent("hd_profile_pic_versions,profile_pic_url",o)[0]?.textContent;return tools.getLargestImageInList(JSON.parse(/"hd_profile_pic_versions"\s*:\s*(\[[^\]]+\])/.exec(e)?.[1]||"null"))?.url||JSON.parse(/"profile_pic_url"\s*:\s*("[^"]+")/.exec(e)?.[1])}).then(o=>tools.cacheImage(i,o||e)).catch(()=>tools.cacheImage(i,e))))},selectors:"img:not(picture>img)"}]}}; }
  });

  // tiktok.com.js
  matchRules.push({
    domain: "tiktok.com",
    apply: function() { window.SITE_SETTINGS={"tiktok.com":{srcMatching:[{srcRegExp:"(//p\\d+).*(\\.tiktokcdn\\.com/.+/)\\d+x\\d+(/.+(?:\\.image|@IMG@)).*",processor:"$1$2720x720$3"},{srcRegExp:"(//p\\d+).*(\\.tiktokcdn\\.com/.+?~).+?(\\.image|@IMG@).*",processor:["$1$2noop$3"]}]}}; }
  });

  // tineye.com.js
  matchRules.push({
    domain: "tineye.com",
    apply: function() { window.SITE_SETTINGS={"tineye.com":{srcMatching:[{processor:({trigger:e})=>tools.cacheImage(e.href||/\w+/.exec(e.id)?.[0]),selectors:"a,img[id]"}]}}; }
  });

  // tmall.js
  matchRules.push({
    domain: "tmall",
    apply: function() { window.SITE_SETTINGS={tmall:{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // tnaflix.com.js
  matchRules.push({
    domain: "tnaflix.com",
    apply: function() { window.SITE_SETTINGS={"tnaflix.com":{srcMatching:[{srcRegExp:"(//.+?\\.tna(?:flix|static)\\.com/(?:thumb/)?)[\\w:]+(/.+@IMG@)",processor:"$1a$2"}]}}; }
  });

  // tntdrama.com.js
  matchRules.push({
    domain: "tntdrama.com",
    apply: function() { window.SITE_SETTINGS={"tntdrama.com":{srcMatching:[{srcRegExp:"(//.+?/w_)\\d+(/.*)",processor:"$1auto$2"}]}}; }
  });

  // trademe.co.nz.js
  matchRules.push({
    domain: "trademe.co.nz",
    apply: function() { window.SITE_SETTINGS={"trademe.co.nz":{maxLookupDepth:12,srcMatching:[{srcRegExp:"(//trademe\\.tmcdn\\.co\\.nz/photoserver/)\\w+(/\\d+@IMG@)",processor:"$1plusw$2"},{srcRegExp:"(//trademe\\.tmcdn\\.co\\.nz/).+(/agent_individual_profile.+@IMG@)",processor:"$1tm/property/agent_individual_profile$2"}]}}; }
  });

  // trillertv.com.js
  matchRules.push({
    domain: "trillertv.com",
    apply: function() { window.SITE_SETTINGS={"trillertv.com":{srcMatching:[{srcRegExp:"/fighter/.+/(\\d+)",processor:({srcRegExpObj:e,trigger:r})=>e.test(r.closest("a")?.href)&&`/thumbs/o/profile/${RegExp.$1}_300x300.webp`,selectors:'a[href^="/fighter/"] img'},{srcRegExp:"(//.+?\\.trillertv\\.com/thumbs/o/.+?_)\\d+x\\d+(@IMG@)",processor:"$1300x300$2"},{srcRegExp:"(//.+?\\.trillertv\\.com/thumbs/.+?-)(\\d+)x(\\d+)(\\w*@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${parseInt(RegExp.$2)>parseInt(RegExp.$3)?"1920x1080":"800x1280"}${RegExp.$4}`}]}}; }
  });

  // trip.com.js
  matchRules.push({
    domain: "trip.com",
    apply: function() { window.SITE_SETTINGS={"trip.com":{srcMatching:[{srcRegExp:"(//.+\\.(?:c-ctrip|tripcdn)\\.com/.+?)(?:_\\w+)*(@IMG@)",processor:"$1$2"}]}}; }
  });

  // truthsocial.com.js
  matchRules.push({
    domain: "truthsocial.com",
    apply: function() { window.SITE_SETTINGS={"truthsocial.com":{srcMatching:[{srcRegExp:"(//.+?\\.truthsocial\\.com/.+/)small(/.+@IMG@)",processor:"$1original$2"}]}}; }
  });

  // trutv.com.js
  matchRules.push({
    domain: "trutv.com",
    apply: function() { window.SITE_SETTINGS={"trutv.com":{srcMatching:[{srcRegExp:"(//.+?/w_)\\d+(/.*)",processor:"$1auto$2"}]}}; }
  });

  // tuchong.com.js
  matchRules.push({
    domain: "tuchong.com",
    apply: function() { window.SITE_SETTINGS={"tuchong.com":{srcMatching:[{srcRegExp:"(//photo\\.tuchong\\.com/\\d+/)\\w+(/.+@IMG@)",processor:"$1wp$2"}]}}; }
  });

  // tumblr.com.js
  matchRules.push({
    domain: "tumblr.com",
    apply: function() { window.SITE_SETTINGS={"tumblr.com":{srcMatching:[{srcRegExp:"(//.*\\.media\\.tumblr\\.com/avatar_.*)_\\d+(?:sq)?(@IMG@)",processor:"$1_128$2"},{srcRegExp:"(//(?:.*\\.media|static)\\.tumblr\\.com/.*?)_\\d+(?:sq)?((?:_v\\d+)?@IMG@)",processor:"$1_1280$2"},{srcRegExp:"(//(?:.*\\.media|static)\\.tumblr\\.com/(.*?)/s)(\\d+)x\\d+(.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:t})=>e.test(t)&&(tools.cacheImage(RegExp.$2.replace("/",":"))||(parseInt(RegExp.$3)<540?()=>tools.fetch(t.replace(e,"$12048x2048$4"),{dataType:"html"}).then(({doc:e})=>{const t=JSON.parse(e.querySelector("#___INITIAL_STATE___")?.textContent||null)?.ImageUrlPage,r=t?.photo?.imageResponse,s=r?.find(({hasOriginalDimensions:e})=>e)||tools.getLargestImageInList(r);return tools.cacheImage(s.mediaKey,{src:s.url,title:t?.altText})}):t))},{processor:({trigger:e,triggerSrc:t})=>e.parentElement.dataset.lightbox.high_res||e.parentElement.dataset.bigPhoto||t,selectors:"[data-lightbox] > img,[data-big-photo] > img"}]}}; }
  });

  // tuniu.com.js
  matchRules.push({
    domain: "tuniu.com",
    apply: function() { window.SITE_SETTINGS={"tuniu.com":{ignore:".video-icon",srcMatching:[{srcRegExp:"(.+\\.360buyimg\\.com/).*((?:jfs|g\\d+)/.+@IMG@).*",processor:"$1n1/s800x800_$2"},{srcRegExp:"(//.+\\.360buyimg\\.com/.+?)_(?:mid|sma)(@IMG@)",processor:"$1_big$2"},{srcRegExp:"(s\\.tuniu\\.net/.+@IMG@).*",processor:"$1"},{srcRegExp:"(//(?:tuniupic\\.360buyimg|.+\\.tuniucdn)\\.com/.+?)(?:_w\\d+_h\\d+_c\\d+_t\\d+)*(@IMG@)",processor:["$1$2","$1_w800_h0_c0_t0$2"]}]}}; }
  });

  // tver.jp.js
  matchRules.push({
    domain: "tver.jp",
    apply: function() { window.SITE_SETTINGS={"tver.jp":{srcMatching:[{srcRegExp:"(//.+?\\.tver\\.jp/images/.+/)(?:small|large)(/.+@IMG@)",processor:"$1xlarge$2"}]}}; }
  });

  // twitch.tv.js
  matchRules.push({
    domain: "twitch.tv",
    apply: function() { window.SITE_SETTINGS={"twitch.tv":{srcMatching:[{srcRegExp:"(//.+?\\.jtvnw\\.net/(?:cf_vods|previews-ttv)/.+-)\\d+x\\d+(@IMG@)",processor:"$11920x1080$2"},{srcRegExp:"(//.+?\\.jtvnw\\.net/jtv_user_pictures/.+-)\\d+x\\d+(@IMG@)",processor:"$1600x600$2"},{srcRegExp:"(//.+?\\.jtvnw\\.net/(?:cf_vods|ttv-boxart)/.+)-\\d+x\\d+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\bpreview)-\\d+x\\d+(@IMG@)",processor:"$1$2"},{processor:({trigger:t})=>t.querySelector("image,img,picture"),selectors:".tw-aspect:has(.preview-card-thumbnail__image)"},{srcRegExp:"//(\\w+)\\.cloudfront\\.net/(\\w+)/storyboards/(\\w+)-strip.*(@IMG@)",processor:["//static-cdn.jtvnw.net/cf_vods/$1/$2/thumb/thumb$3-1920x1080$4","//static-cdn.jtvnw.net/cf_vods/$1/$2/thumb/thumb0-1920x1080$4"]}]}}; }
  });

  // twitter.com.js
  matchRules.push({
    domain: "twitter.com",
    apply: function() { window.SITE_SETTINGS={"twitter.com":{maxLookupDepth:5,srcMatching:[{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/(?:(?:[^/]+/)?default_)?profile_images/.+)_\\w+(?=@IMG@)(@IMG@)",processor:"$1$2"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/profile_banners/.+)/\\d+x\\d+",processor:"$1"},{thumbType:"posters",srcRegExp:"(//\\w+\\.twimg\\.com/amplify_video_thumb/.+\\?).*?\\b(format=[^&]+).*",processor:"$1$2&name=orig"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/media/.+?)(?:@IMG@:\\w+)?(.+[?&]name=)[^&]+(.*)",processor:"$1$2orig$3"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/.+\\?).*?\\b(format=[^&]+).*",processor:"$1$2&name=orig"}]}}; }
  });

  // unsplash.com.js
  matchRules.push({
    domain: "unsplash.com",
    apply: function() { window.SITE_SETTINGS={"unsplash.com":{srcMatching:[{srcRegExp:"(//images\\.pexels\\.com/users/avatars/.+?@IMG@).*",processor:"$1?w=10000"},{srcRegExp:"(//.+\\.(?:pexels|unsplash)\\.com/(?:[^?](?!video-id))+)(?:\\?.*)?$",processor:"$1"},{srcRegExp:"//.+\\.istockphoto\\.com/id/(\\d+)/.+@IMG@",processor:({triggerSrc:s,srcRegExpObj:o})=>{const e=o.test(s)&&RegExp.$1;return e&&(tools.cacheImage(e)||(()=>tools.fetch("https://www.istockphoto.com/collaboration/board_assets.json",{data:{asset_ids:e}}).then(s=>tools.cacheImage(e,{src:s?.json?.[0]?.delivery_urls?.comp1024||s?.json?.[0]?.delivery_urls?.comp,title:s?.json?.[0]?.title}))))}}]}}; }
  });

  // v.qq.com.js
  matchRules.push({
    domain: "v.qq.com",
    apply: function() { window.SITE_SETTINGS={"v.qq.com":{srcMatching:[{processor:({trigger:r})=>r.querySelector("image,img,picture"),thumbType:"posters",getPlayer:()=>document.querySelector("#hover-player-card video[src]"),selectors:".video-poster-wrap,.video-card-wrap .top-half,.banner-card__poster-container"},{srcRegExp:"(//.+?\\.qpic\\.cn/.+)_pic_\\d+x\\d+/\\d+.*",processor:"$1/0"},{srcRegExp:"(//.+?\\.qpic\\.cn/.+)/q\\d+",processor:"$1"},{srcRegExp:"(//.+?\\.qpic\\.cn/.+)/\\d+(?:\\?.*)?$",processor:"$1/0"}]}}; }
  });

  // vcg.com.js
  matchRules.push({
    domain: "vcg.com",
    apply: function() { window.SITE_SETTINGS={"vcg.com":{srcMatching:[{srcRegExp:"(//.+\\.cfp\\.cn/.+/vcg/)\\d+(/.+?@IMG@)",processor:["//$1nowater800$2","//$1800$2"]}]}}; }
  });

  // vecteezy.com.js
  matchRules.push({
    domain: "vecteezy.com",
    apply: function() { window.SITE_SETTINGS={"vecteezy.com":{srcMatching:[{srcRegExp:"(//.+?\\.vecteezy\\.com/.+/avatar/.+/).+?_(.*@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+?\\.vecteezy\\.com/system/resources/.+/).+(/[^/]+@IMG@)",processor:"$1original$2"}]}}; }
  });

  // vero.co.js
  matchRules.push({
    domain: "vero.co",
    apply: function() { window.SITE_SETTINGS={"vero.co":{srcMatching:[{srcRegExp:"(//.+?\\.cloudfront\\.net/.+)_.+@IMG@",processor:"$1"}]}}; }
  });

  // video.qq.com.js
  matchRules.push({
    domain: "video.qq.com",
    apply: function() { window.SITE_SETTINGS={"video.qq.com":{srcMatching:[{processor:({trigger:r})=>r.querySelector("image,img,picture"),thumbType:"posters",getPlayer:()=>document.querySelector("#hover-player-card video[src]"),selectors:".video-poster-wrap,.video-card-wrap .top-half,.banner-card__poster-container"},{srcRegExp:"(//.+?\\.qpic\\.cn/.+)_pic_\\d+x\\d+/\\d+.*",processor:"$1/0"},{srcRegExp:"(//.+?\\.qpic\\.cn/.+)/q\\d+",processor:"$1"},{srcRegExp:"(//.+?\\.qpic\\.cn/.+)/\\d+(?:\\?.*)?$",processor:"$1/0"}]}}; }
  });

  // vidhub1.cc.js
  matchRules.push({
    domain: "vidhub1.cc",
    apply: function() { window.SITE_SETTINGS={"vidhub1.cc":{srcMatching:[{srcRegExp:"(//img\\d+\\.doubanio\\.com/p?view/\\w+/).*(/public/.+@IMG@)",processor:({srcRegExpObj:o,trigger:c})=>{const e=tools.getBackgroundImageSrc(getComputedStyle(c).backgroundImage.split(/\s*,\s*/).at(-1)),r=o.exec(e);return r?[`${r[1]}ul${r[2]}`,`${r[1]}l${r[2]}`,e]:e},selectors:'.avatar[style*="background-image"]'},{srcRegExp:"(//img\\d+\\.doubanio\\.com/p?view/\\w+/).*(/public/.+@IMG@)",processor:["$1ul$2","$1l$2"]},{srcRegExp:"(//img\\d+\\.doubanio\\.com/icon/)up?([-\\d]+@IMG@)",processor:"$1ul$2"}]}}; }
  });

  // vjshi.com.js
  matchRules.push({
    domain: "vjshi.com",
    apply: function() { window.SITE_SETTINGS={"vjshi.com":{referrerAddedHostnames:["vjshi.com"],srcMatching:[{srcRegExp:"(//.+?\\.vjshi\\.com/.+)/main(@IMG@)",processor:["$1$2"]}]}}; }
  });

  // vroid.com.js
  matchRules.push({
    domain: "vroid.com",
    apply: function() { window.SITE_SETTINGS={"vroid.com":{referrerAddedHostnames:["pximg.net"],srcMatching:[{srcRegExp:"(//.+\\.pximg\\.net/user-profile/.+)_\\d+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/.+/.+_thumb/.+)_\\w+(@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)(?=/).+(/uploads/.+/)(?:.+_)?(\\d+@IMG@)",processor:"$1$2$3"},{srcRegExp:"(//.+\\.pixiv\\.net/images/post/\\d+)/w/\\d+(/.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net/).+(/img/.+?)(_p\\d+)?(?:_.+)?(@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&tools.detectImage([`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}${RegExp.$4}`,`${RegExp.$1}img-original${RegExp.$2}${RegExp.$3||"_ugoira0"}.png`])},{srcRegExp:"(//.+\\.pximg\\.net/)\\w+/\\d+x\\d+[^/]*/(.+@IMG@)",processor:"$1$2"},{srcRegExp:"(//.+\\.pximg\\.net)/c!?/[^/]+(/.+@IMG@)",processor:"$1$2"}]}}; }
  });

  // vudu.com.js
  matchRules.push({
    domain: "vudu.com",
    apply: function() { window.SITE_SETTINGS={"vudu.com":{srcMatching:[{srcRegExp:"(//images\\d*\\.vudu\\.com/.+-)\\d+",processor:["$1360","$1300"]}]}}; }
  });

  // wallhaven.cc.js
  matchRules.push({
    domain: "wallhaven.cc",
    apply: function() { window.SITE_SETTINGS={"wallhaven.cc":{srcMatching:[{processor:({trigger:e})=>e.querySelector('a[href*="/w/"]'),selectors:'.thumb:has(a[href*="/w/"])'},{srcRegExp:"(wallhaven\\.cc/)w/((\\w{2})\\w+)",processor:({srcRegExpObj:e,trigger:r})=>e.test(r.closest("a")?.href)&&tools.detectImage([`//w.${RegExp.$1}full/${RegExp.$3}/wallhaven-${RegExp.$2}.jpg`,`//w.${RegExp.$1}full/${RegExp.$3}/wallhaven-${RegExp.$2}.png`])},{srcRegExp:"(wallhaven\\.cc/images/user/avatar/)\\d+(/.+@IMG@)",processor:"$1200$2"}]}}; }
  });

  // warehousestationery.co.nz.js
  matchRules.push({
    domain: "warehousestationery.co.nz",
    apply: function() { window.SITE_SETTINGS={"warehousestationery.co.nz":{srcMatching:[{srcRegExp:"(//.+\\.co\\.nz/)(?:dw/.+/)?(on/.+@IMG@).*",processor:"$1$2"},{srcRegExp:"(//themarket\\.azureedge\\.net/resizer/view\\?.+?)&w=.*",processor:"$1&w=0"}]}}; }
  });

  // wattpad.com.js
  matchRules.push({
    domain: "wattpad.com",
    apply: function() { window.SITE_SETTINGS={"wattpad.com":{srcMatching:[{srcRegExp:"(//.+\\.wattpad\\.com/cover/\\d+-).+(@IMG@)",processor:"$1512$2"},{srcRegExp:"(//.+\\.wattpad\\.com/useravatar/\\w+\\.).+(@IMG@)",processor:"$1256$2"},{srcRegExp:"(//.+\\.wattpad\\.com/userbgs/\\w+\\.).+(@IMG@)",processor:"$11920$2"}]}}; }
  });

  // webcamdownloads.org.js
  matchRules.push({
    domain: "webcamdownloads.org",
    apply: function() { window.SITE_SETTINGS={"webcamdownloads.org":{srcMatching:[{srcRegExp:"(//fastimages\\.org/images/.+)\\.th(@IMG@)",processor:"$1$2"}]}}; }
  });

  // weibo.cn.js
  matchRules.push({
    domain: "weibo.cn",
    apply: function() { window.SITE_SETTINGS={"weibo.cn":{referrerAddedHostnames:["sinaimg.cn"],srcMatching:[{thumbType:"posters",processor:({trigger:e})=>e.querySelector('.wbpv-poster[style*="background-image"],.wbpv-podcast img:not([src=""]),.wbpv-miniplayer-podcast img:not([src=""])'),selectors:".wbp-video"},{srcRegExp:".+/(weiyinyue\\.music\\.sina\\.com\\.cn/.+@IMG@).*",processor:"//$1"},{srcRegExp:"(//mu\\d+\\.sinaimg\\.cn/)(?:(?:square|crop|frame)\\.[^/]+|original)/(.+@IMG@).*",processor:"$1$2"},{srcRegExp:"((?:.+\\.sinaimg\\.cn|image\\.storage\\.weibo\\.com)(?:/.+)?/)(?:small|large|thumbnail|\\w?mw\\d+|small|sq\\d+|thumb\\d+|bmiddle|orj\\d+|crop\\.[^/]+|square|wap\\d+)(/\\w+)(?:@IMG@)?.*",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&tools.detectImage([`${RegExp.$1}original${RegExp.$2}${"g"===RegExp.$2[22]?".gif":".jpg"}`,`${RegExp.$1}large${RegExp.$2}${"g"===RegExp.$2[22]?".gif":".jpg"}`],e=>75===e.width&&75===e.height)}]}}; }
  });

  // weibo.com.js
  matchRules.push({
    domain: "weibo.com",
    apply: function() { window.SITE_SETTINGS={"weibo.com":{referrerAddedHostnames:["sinaimg.cn"],srcMatching:[{thumbType:"posters",processor:({trigger:e})=>e.querySelector('.wbpv-poster[style*="background-image"],.wbpv-podcast img:not([src=""]),.wbpv-miniplayer-podcast img:not([src=""])'),selectors:".wbp-video"},{srcRegExp:".+/(weiyinyue\\.music\\.sina\\.com\\.cn/.+@IMG@).*",processor:"//$1"},{srcRegExp:"(//mu\\d+\\.sinaimg\\.cn/)(?:(?:square|crop|frame)\\.[^/]+|original)/(.+@IMG@).*",processor:"$1$2"},{srcRegExp:"((?:.+\\.sinaimg\\.cn|image\\.storage\\.weibo\\.com)(?:/.+)?/)(?:small|large|thumbnail|\\w?mw\\d+|small|sq\\d+|thumb\\d+|bmiddle|orj\\d+|crop\\.[^/]+|square|wap\\d+)(/\\w+)(?:@IMG@)?.*",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&tools.detectImage([`${RegExp.$1}original${RegExp.$2}${"g"===RegExp.$2[22]?".gif":".jpg"}`,`${RegExp.$1}large${RegExp.$2}${"g"===RegExp.$2[22]?".gif":".jpg"}`],e=>75===e.width&&75===e.height)}]}}; }
  });

  // whatsapp.com.js
  matchRules.push({
    domain: "whatsapp.com",
    apply: function() { window.SITE_SETTINGS={"whatsapp.com":{srcMatching:[{processor:({trigger:e})=>e.querySelector('button [style*="blob:"]'),selectors:'[role="listitem"][aria-label*="Image"]'}]}}; }
  });

  // wikibooks.org.js
  matchRules.push({
    domain: "wikibooks.org",
    apply: function() { window.SITE_SETTINGS={"wikibooks.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikidata.org.js
  matchRules.push({
    domain: "wikidata.org",
    apply: function() { window.SITE_SETTINGS={"wikidata.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikifunctions.org.js
  matchRules.push({
    domain: "wikifunctions.org",
    apply: function() { window.SITE_SETTINGS={"wikifunctions.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikimedia.org.js
  matchRules.push({
    domain: "wikimedia.org",
    apply: function() { window.SITE_SETTINGS={"wikimedia.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikinews.org.js
  matchRules.push({
    domain: "wikinews.org",
    apply: function() { window.SITE_SETTINGS={"wikinews.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikipedia.org.js
  matchRules.push({
    domain: "wikipedia.org",
    apply: function() { window.SITE_SETTINGS={"wikipedia.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikiquote.org.js
  matchRules.push({
    domain: "wikiquote.org",
    apply: function() { window.SITE_SETTINGS={"wikiquote.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikisource.org.js
  matchRules.push({
    domain: "wikisource.org",
    apply: function() { window.SITE_SETTINGS={"wikisource.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikiversity.org.js
  matchRules.push({
    domain: "wikiversity.org",
    apply: function() { window.SITE_SETTINGS={"wikiversity.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wikivoyage.org.js
  matchRules.push({
    domain: "wikivoyage.org",
    apply: function() { window.SITE_SETTINGS={"wikivoyage.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wiktionary.org.js
  matchRules.push({
    domain: "wiktionary.org",
    apply: function() { window.SITE_SETTINGS={"wiktionary.org":{srcMatching:[{srcRegExp:"(//upload\\.wikimedia\\.org/.+?/)([^/]+\\.tiff?).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:g})=>e.test(g)&&`${RegExp.$1}${RegExp.$2}/${r.dataset.fileWidth}px-${RegExp.$2}.jpg`,selectors:"img[data-file-width]"},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?webm/)(\\d+)(px.+@IMG@)",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${4*Number(RegExp.$2)}${RegExp.$3}`},{srcRegExp:"(//upload\\.wikimedia\\.org/.*?)\\bthumb/(.+?@IMG@).*",processor:"$1$2"}]}}; }
  });

  // wn01.js
  matchRules.push({
    domain: "wn01",
    apply: function() { window.SITE_SETTINGS={wn01:{ignore:".nav",srcMatching:[{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/(.+@IMG@)",processor:["//img5$1$2"],selectors:".uwthumb img"},{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/((\\d+/\\d+/)\\d+(@IMG@))",processor:({trigger:t})=>{const e=t.closest(".gallary_item")?.querySelector(".info .name")?.textContent;return[/[^x00-\x7F]/.test(e)?"//img5$1$2":`//img5$1$3${e||"1".padStart(/\d+(?=\s*\u{5F35})/u.exec(t.closest(".gallary_item")?.querySelector(".info .info_col")?.textContent)?.[0]?.length||0,"0")}$4`]},selectors:".gallary_item .pic_box img"}]}}; }
  });

  // wn02.js
  matchRules.push({
    domain: "wn02",
    apply: function() { window.SITE_SETTINGS={wn02:{ignore:".nav",srcMatching:[{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/(.+@IMG@)",processor:["//img5$1$2"],selectors:".uwthumb img"},{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/((\\d+/\\d+/)\\d+(@IMG@))",processor:({trigger:t})=>{const e=t.closest(".gallary_item")?.querySelector(".info .name")?.textContent;return[/[^x00-\x7F]/.test(e)?"//img5$1$2":`//img5$1$3${e||"1".padStart(/\d+(?=\s*\u{5F35})/u.exec(t.closest(".gallary_item")?.querySelector(".info .info_col")?.textContent)?.[0]?.length||0,"0")}$4`]},selectors:".gallary_item .pic_box img"}]}}; }
  });

  // wn03.js
  matchRules.push({
    domain: "wn03",
    apply: function() { window.SITE_SETTINGS={wn03:{ignore:".nav",srcMatching:[{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/(.+@IMG@)",processor:["//img5$1$2"],selectors:".uwthumb img"},{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/((\\d+/\\d+/)\\d+(@IMG@))",processor:({trigger:t})=>{const e=t.closest(".gallary_item")?.querySelector(".info .name")?.textContent;return[/[^x00-\x7F]/.test(e)?"//img5$1$2":`//img5$1$3${e||"1".padStart(/\d+(?=\s*\u{5F35})/u.exec(t.closest(".gallary_item")?.querySelector(".info .info_col")?.textContent)?.[0]?.length||0,"0")}$4`]},selectors:".gallary_item .pic_box img"}]}}; }
  });

  // wn04.js
  matchRules.push({
    domain: "wn04",
    apply: function() { window.SITE_SETTINGS={wn04:{ignore:".nav",srcMatching:[{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/(.+@IMG@)",processor:["//img5$1$2"],selectors:".uwthumb img"},{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/((\\d+/\\d+/)\\d+(@IMG@))",processor:({trigger:t})=>{const e=t.closest(".gallary_item")?.querySelector(".info .name")?.textContent;return[/[^x00-\x7F]/.test(e)?"//img5$1$2":`//img5$1$3${e||"1".padStart(/\d+(?=\s*\u{5F35})/u.exec(t.closest(".gallary_item")?.querySelector(".info .info_col")?.textContent)?.[0]?.length||0,"0")}$4`]},selectors:".gallary_item .pic_box img"}]}}; }
  });

  // wn05.js
  matchRules.push({
    domain: "wn05",
    apply: function() { window.SITE_SETTINGS={wn05:{ignore:".nav",srcMatching:[{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/(.+@IMG@)",processor:["//img5$1$2"],selectors:".uwthumb img"},{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/((\\d+/\\d+/)\\d+(@IMG@))",processor:({trigger:t})=>{const e=t.closest(".gallary_item")?.querySelector(".info .name")?.textContent;return[/[^x00-\x7F]/.test(e)?"//img5$1$2":`//img5$1$3${e||"1".padStart(/\d+(?=\s*\u{5F35})/u.exec(t.closest(".gallary_item")?.querySelector(".info .info_col")?.textContent)?.[0]?.length||0,"0")}$4`]},selectors:".gallary_item .pic_box img"}]}}; }
  });

  // wnacg.com.js
  matchRules.push({
    domain: "wnacg.com",
    apply: function() { window.SITE_SETTINGS={"wnacg.com":{ignore:".nav",srcMatching:[{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/(.+@IMG@)",processor:["//img5$1$2"],selectors:".uwthumb img"},{srcRegExp:"//t\\d+(\\.\\w+\\.ru/data/)t/((\\d+/\\d+/)\\d+(@IMG@))",processor:({trigger:t})=>{const e=t.closest(".gallary_item")?.querySelector(".info .name")?.textContent;return[/[^x00-\x7F]/.test(e)?"//img5$1$2":`//img5$1$3${e||"1".padStart(/\d+(?=\s*\u{5F35})/u.exec(t.closest(".gallary_item")?.querySelector(".info .info_col")?.textContent)?.[0]?.length||0,"0")}$4`]},selectors:".gallary_item .pic_box img"}]}}; }
  });

  // woolworths.js
  matchRules.push({
    domain: "woolworths",
    apply: function() { window.SITE_SETTINGS={woolworths:{srcMatching:[{srcRegExp:"(assets\\.woolworths\\.com\\.au/images/.+?@IMG@(?:\\?impolicy=[^&]+)?).*",processor:"$1"}]}}; }
  });

  // wsy.com.js
  matchRules.push({
    domain: "wsy.com",
    apply: function() { window.SITE_SETTINGS={"wsy.com":{ignore:'[class*="playerIcon"]',srcMatching:[{srcRegExp:"(//gqrcode\\.alicdn\\.com/img\\?.*?)&w=\\d+(.*?)&h=\\d+(.*)",processor:"$1&w=300$2&h=300$3"},{srcRegExp:"//.+?\\.com/avatar/sns/user/flag/sns_logo\\?.*",processor:({srcRegExpObj:r,triggerSrc:s})=>r.test(s)&&tools.getUrlWithParams(s,{width:1280,height:1280})},{srcRegExp:"(//.+?\\.com/avatar/get_?Avatar\\.do\\?user(?:Id(?:Str)?|Nick)=[^&]+).*",processor:"$1&width=1280&height=1280"},{srcRegExp:"(//.+?\\.com/.+?)\\.(?:\\d+x\\d+[a-z]*|search|summ)(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+?\\.alicdn\\.com/.+-fleamarket\\.heic).*",processor:"$1"},{srcRegExp:"(//.+?\\.ali(?:cdn|express-media)\\.com/.+?@IMG@)(?:_\\w*(@IMG@))?.*",processor:["$1","$1_1200x1200$2",r=>100===r.width&&100===r.height]}]}}; }
  });

  // www.data18.com.js
  matchRules.push({
    domain: "www.data18.com",
    apply: function() { window.SITE_SETTINGS={"www.data18.com":{ignore:'img[src*="play-box"]',referrerAddedHostnames:["dt18.com"],srcMatching:[{srcRegExp:"(//.+?\\.dt18\\.com/.+/)th.+?/(.+@IMG@)",processor:["$1t$2","$1$2"]},{srcRegExp:"(//cdn\\.dt18\\.com/images/names/)\\w+(/.+@IMG@)",processor:"$1big$2"},{srcRegExp:"//cdn\\.dt18\\.com/(?:covers|media/movies)/.+/(\\d+).*@IMG@",processor:({srcRegExpObj:e,triggerSrc:c})=>{const r=e.exec(c)?.[1],t=tools.buildSrcRegExp(`/full_covers/.+/${r}.*?-back-.*@IMG@`),o=[...document.querySelectorAll('a[href*="/full_covers/"]')].find(({href:e})=>t.test(e))?.href;return/\/back\//.test(c)?o:r&&(tools.cacheImage(r)||(()=>tools.fetch(`/movies/${r}`,{dataType:"html"}).then(({doc:e})=>e?.querySelector("#enlargecover")?.dataset.featherlight).then(e=>tools.cacheImage(r,e))))}},{srcRegExp:"//cdn\\.dt18\\.com/.+?/scenes/(\\d+)/\\d+/(\\d+).*?@IMG@",processor:({srcRegExpObj:e,triggerSrc:c})=>{const r=e.exec(c)?.slice(1).join("");return r&&(tools.cacheImage(r)||(()=>tools.fetch(`/scenes/${r}`,{dataType:"html"}).then(({doc:e})=>{const c=e?.querySelector("#playpriimage");return c&&{src:c.src,title:c.alt}}).then(e=>tools.cacheImage(r,e))))}}]}}; }
  });

  // x.com.js
  matchRules.push({
    domain: "x.com",
    apply: function() { window.SITE_SETTINGS={"x.com":{maxLookupDepth:5,srcMatching:[{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/(?:(?:[^/]+/)?default_)?profile_images/.+)_\\w+(?=@IMG@)(@IMG@)",processor:"$1$2"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/profile_banners/.+)/\\d+x\\d+",processor:"$1"},{thumbType:"posters",srcRegExp:"(//\\w+\\.twimg\\.com/amplify_video_thumb/.+\\?).*?\\b(format=[^&]+).*",processor:"$1$2&name=orig"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/media/.+?)(?:@IMG@:\\w+)?(.+[?&]name=)[^&]+(.*)",processor:"$1$2orig$3"},{thumbType:"pictures",srcRegExp:"(//\\w+\\.twimg\\.com/.+\\?).*?\\b(format=[^&]+).*",processor:"$1$2&name=orig"}]}}; }
  });

  // xdaforums.com.js
  matchRules.push({
    domain: "xdaforums.com",
    apply: function() { window.SITE_SETTINGS={"xdaforums.com":{srcMatching:[{srcRegExp:"(/files/.+)-\\d+x\\d+(?:_\\w+)?(@IMG@)",processor:"$1$2"},{srcRegExp:"(/data/avatars/)\\w(/.+)",processor:"$1o$2"},{processor:({trigger:r})=>r.parentElement.href,selectors:"a > img"}]}}; }
  });

  // xhamster.com.js
  matchRules.push({
    domain: "xhamster.com",
    apply: function() { window.SITE_SETTINGS={"xhamster.com":{ignore:"video",srcMatching:[{processor:({trigger:r})=>r.src}]}}; }
  });

  // xhamsterlive.com.js
  matchRules.push({
    domain: "xhamsterlive.com",
    apply: function() { window.SITE_SETTINGS={"xhamsterlive.com":{srcMatching:[{processor:({trigger:r})=>r.querySelector("image,img,picture"),selectors:".video-thumb"},{srcRegExp:"(//static-cdn\\.strpst\\.com/.+/\\w+)-.+",processor:"$1"},{srcRegExp:"(//video-thumbs\\.strpst\\.com/.+/)\\d+(p/.+@IMG@)",processor:"$1720$2"}]}}; }
  });

  // xiaohongshu.com.js
  matchRules.push({
    domain: "xiaohongshu.com",
    apply: function() { window.SITE_SETTINGS={"xiaohongshu.com":{srcMatching:[{processor:({trigger:c})=>tools.cacheImage(c.closest('[id^="comment-"]')?.id.split("-").at(-1)),selectors:".comment-picture img"},{srcRegExp:"(//.+?\\.xhscdn\\.com/avatar/[^?]+).*",processor:"$1"},{srcRegExp:"//.+?\\.xhscdn\\.com/.+?/(\\w+)!\\w+",processor:["//ci.xiaohongshu.com/$1"]}]}}; }
  });

  // xiaomi.com.js
  matchRules.push({
    domain: "xiaomi.com",
    apply: function() { window.SITE_SETTINGS={"xiaomi.com":{srcMatching:[{srcRegExp:"(//(?:.+\\.(?:app)?mifile\\.(?:com|cn)|static\\.home\\.mi\\.com)/.+?)(?:!\\d+x\\d+)?(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+\\.(?:(?:app)?mifile|mi-img)\\.(?:com|cn)/.+?@IMG@).*",processor:"$1"},{srcRegExp:"(//.+\\.market\\.xiaomi\\.com/thumbnail/\\w+/\\w)\\w*(?=/)",processor:"$1"}]}}; }
  });

  // xiaomiyoupin.com.js
  matchRules.push({
    domain: "xiaomiyoupin.com",
    apply: function() { window.SITE_SETTINGS={"xiaomiyoupin.com":{srcMatching:[{srcRegExp:"(//(?:.+\\.(?:app)?mifile\\.(?:com|cn)|static\\.home\\.mi\\.com)/.+?)(?:!\\d+x\\d+)?(@IMG@).*",processor:"$1$2"},{srcRegExp:"(//.+\\.(?:(?:app)?mifile|mi-img)\\.(?:com|cn)/.+?@IMG@).*",processor:"$1"},{srcRegExp:"(//.+\\.market\\.xiaomi\\.com/thumbnail/\\w+/\\w)\\w*(?=/)",processor:"$1"}]}}; }
  });

  // xnxx.com.js
  matchRules.push({
    domain: "xnxx.com",
    apply: function() { window.SITE_SETTINGS={"xnxx.com":{ignore:".videopv",srcMatching:[{srcRegExp:"(//.+?\\.com/videos/thumbs\\d+)\\w*(/.+@IMG@)",processor:["$1poster$2","$1lll$2"]},{srcRegExp:"(//.+?\\.com/galleries/)\\w+(/.+@IMG@)",processor:"$1full$2"}]}}; }
  });

  // xvideos.com.js
  matchRules.push({
    domain: "xvideos.com",
    apply: function() { window.SITE_SETTINGS={"xvideos.com":{ignore:".videopv",srcMatching:[{srcRegExp:"(//.+?\\.com/videos/thumbs\\d+)\\w*(/.+@IMG@)",processor:["$1poster$2","$1lll$2"]},{srcRegExp:"(//.+?\\.com/galleries/)\\w+(/.+@IMG@)",processor:"$1full$2"}]}}; }
  });

  // xvideos.red.js
  matchRules.push({
    domain: "xvideos.red",
    apply: function() { window.SITE_SETTINGS={"xvideos.red":{ignore:".videopv",srcMatching:[{srcRegExp:"(//.+?\\.com/videos/thumbs\\d+)\\w*(/.+@IMG@)",processor:["$1poster$2","$1lll$2"]},{srcRegExp:"(//.+?\\.com/galleries/)\\w+(/.+@IMG@)",processor:"$1full$2"}]}}; }
  });

  // y.qq.com.js
  matchRules.push({
    domain: "y.qq.com",
    apply: function() { window.SITE_SETTINGS={"y.qq.com":{ignore:".mod_cover__icon_play",srcMatching:[{srcRegExp:"(//pic\\d*\\.y\\.qq\\.com/qqmusic/avatar/.+)/\\d+",processor:"$1"},{srcRegExp:"(//qpic\\.y\\.qq\\.com/.+/)\\d+",processor:"$11000"},{srcRegExp:"(//y\\..+?/photo_new/\\w+?)(?:160x90|640x360)(.+?@IMG@)",processor:"$1640x360$2"},{srcRegExp:"(//y\\..+?/photo_new/\\w+?)\\d+x\\d+(.+?@IMG@)",processor:"$1800x800$2"},{srcRegExp:"(//.+\\.qlogo\\.cn/(?:.+/|[^?]+?.*&?s=))\\d+",processor:"$10"}]}}; }
  });

  // yahoo.com.js
  matchRules.push({
    domain: "yahoo.com",
    apply: function() { window.SITE_SETTINGS={"yahoo.com":{srcMatching:[{srcRegExp:"//s\\.yimg\\.com/.+/(https?:.+?)(?:\\.cf@IMG@)?$",processor:({srcRegExpObj:e,triggerSrc:r})=>e.test(r)&&decodeURIComponent(RegExp.$1)},{srcRegExp:"(//.+\\.bing\\.(?:com|net)/th\\?id=[^&]+).*",processor:({trigger:e})=>{const r=new URL(e.closest("a").href).searchParams;return[r.get("imgurl")||r.get("mediaurl"),"$1"]},selectors:'a[href*="imgurl"] img,a[href*="mediaurl"] img'}]}}; }
  });

  // yande.re.js
  matchRules.push({
    domain: "yande.re",
    apply: function() { window.SITE_SETTINGS={"yande.re":{srcMatching:[{exclusive:!1,srcRegExp:"//(?:.+\\.)?(konachan\\.\\w+|yande\\.re)/.+/(\\w+)(?:/.*)?(@IMG@)",processor:({srcRegExpObj:e,trigger:a,triggerSrc:$})=>a.matches(".avatar")?tools.cacheImage($)||(()=>tools.fetch(a.closest("a").href,{dataType:"html"}).then(({doc:a})=>e.test(a.querySelector("#image")?.src)?tools.detectImage([`//${RegExp.$1}/image/${RegExp.$2}/${RegExp.$1}${RegExp.$3}`,`//${RegExp.$1}/jpeg/${RegExp.$2}/${RegExp.$1}${RegExp.$3}`]):Promise.reject()).then(e=>tools.cacheImage($,e))):["//$1/image/$2/$1$3","//$1/jpeg/$2/$1$3"],selectors:"a > .avatar"}]}}; }
  });

  // yandex.com.js
  matchRules.push({
    domain: "yandex.com",
    apply: function() { window.SITE_SETTINGS={"yandex.com":{onPageLoad:()=>{var e;tools.cacheImage((e=JSON.parse(document.querySelector('[id^="ImagesApp-"]')?.dataset.state||"{}").initialState?.serpList?.items?.entities,e&&Object.values(e).flatMap(({id:e,image:t,origUrl:r})=>[[e,r],.../\?.*?id=([^&]+)/.test(t)?[[RegExp.$1,r]]:[]])))},srcMatching:[{processor:({trigger:e})=>tools.cacheImage(e.closest(".SerpItem").id),selectors:".SerpItem img"},{srcRegExp:"\\?.*?id=([^&]+)",processor:({srcRegExpObj:e,triggerSrc:t})=>e.test(t)&&tools.cacheImage(RegExp.$1)},{processor:({trigger:e})=>decodeURIComponent(/\bimg_url=([^&]+)/.exec(e.closest("a").href)?.[1]||""),selectors:'a[href*="img_url="] img'}]}}; }
  });

  // yelp.js
  matchRules.push({
    domain: "yelp",
    apply: function() { window.SITE_SETTINGS={yelp:{srcMatching:[{srcRegExp:"(//s\\d+-media\\d+\\.fl\\.yelpcdn\\.com/\\w*photo/.+/)\\d*[sml]{1,2}(@IMG@)",processor:"$1o$2"}]}}; }
  });

  // yiigle.com.js
  matchRules.push({
    domain: "yiigle.com",
    apply: function() { window.SITE_SETTINGS={"yiigle.com":{srcMatching:[{srcRegExp:"(/img(?:content|source).jspx\\?.+?)c?(@IMG@).*",processor:"$1$2"},{srcRegExp:"(/apiVue/search/imgcontent\\?.*?type=)\\d+",processor:"$11"},{processor:({trigger:e})=>e.hasAttribute("xlink:href")&&[`/api/xml/getXmlFileUrl?url=${e.getAttribute("xlink:href")}`]}]}}; }
  });

  // yinfans.me.js
  matchRules.push({
    domain: "yinfans.me",
    apply: function() { window.SITE_SETTINGS={"yinfans.me":{ignore:".glass"}}; }
  });

  // youtube.com.js
  matchRules.push({
    domain: "youtube.com",
    apply: function() { !function(){const e={srcRegExp:"(.+?\\.(?:googleusercontent|ggpht)\\.com/[^=]+=).*",processor:["$1w0","$1a",e=>2560===e.width&&2560===e.height]};const t={thumbType:"posters",srcRegExp:"//(?:i\\d*\\.ytimg|img\\.youtube)\\.com(/(?:s_p|vi.*?)/.+/).+(@IMG@).*",processor:["//i.ytimg.com$1maxresdefault$2","//i.ytimg.com$1hqdefault$2","$&",e=>120===e.width&&90===e.height]};window.SITE_SETTINGS={"youtube.com":{ignore:"#video-preview,animated-thumbnail-overlay-view-model,yt-image~*,.ytmusic-play-button-renderer",srcMatching:[{srcRegExp:"(.+?\\.(?:googleusercontent|ggpht)\\.com/[^=]+=).*",processor:({srcRegExpObj:t,trigger:r,triggerSrc:o})=>{if(t.test(o)){const t=/\@([^/?]+)/.exec(r.closest('a[href*="/@"]')?.href)?.[1],o=(document.querySelector(`a[href*="/@${t}"]:has([title])`)?.querySelector("[title]")?.textContent||document.querySelector(`[title] a[href*="/@${t}"]`)?.closest("[title]")?.title||r.closest('[aria-label^="@"]')?.getAttribute("aria-label")||r.closest(".yt-live-chat-item-list-renderer")?.querySelector("#author-name")?.textContent)?.trim();return o?e.processor.map(e=>"string"==typeof e?{src:e,title:o}:e):e.processor}}},{thumbType:"posters",srcRegExp:"//(?:i\\d*\\.ytimg|img\\.youtube)\\.com(/(?:s_p|vi.*?)/.+/).+(@IMG@).*",processor:({srcRegExpObj:e,trigger:r,triggerSrc:o})=>{if(e.test(o)){const e=/\b(?:v|list)=([^&]+)/.exec(r.closest('a[href*="v="],a[href*="list="]')?.href)?.[1]||/\/shorts\/([^/]+)/.exec(r.closest('a[href*="/shorts/"]')?.href)?.[1],o=(e?document.querySelector(`a[href*="${e}"][title]`)?.title||document.querySelector(`a[href*="${e}"]:has([title])`)?.querySelector("[title]")?.title||document.querySelector(`a[href*="${e}"][class*="title"]`)?.textContent:null)?.trim();return o?t.processor.map(e=>"string"==typeof e?{src:e,title:o}:e):t.processor}},getPlayer:()=>document.querySelector("#inline-player video")},{thumbType:"posters",srcRegExp:"//(?:i\\d*\\.ytimg|img\\.youtube)\\.com(/vi.*?/.+/)movieposter.*(@IMG@).*",processor:["//i.ytimg.com$1movieposter_maxres$2","//i.ytimg.com$1maxresdefault$2",e=>120===e.width&&90===e.height]},{srcRegExp:"//(?:i\\d*\\.ytimg|img\\.youtube)\\.com/vi.*?/.+/[^_\\W]+_\\d+@IMG@.*"}]}}}(); }
  });

  // yuewen.com.js
  matchRules.push({
    domain: "yuewen.com",
    apply: function() { window.SITE_SETTINGS={"yuewen.com":{srcMatching:[{srcRegExp:"(//.+?\\.(?:qidian|qpic|yuewen)\\.c(?:n|om)/.+)/\\d+(?:@IMG@)?",processor:"$1/0"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:({srcRegExpObj:e,trigger:c})=>e.test(tools.getBackgroundImageSrc(c))&&`${RegExp.$1}o${RegExp.$2}`,selectors:".cover"},{srcRegExp:"(//.+?\\.image\\.myqcloud\\.com/.+/)\\w(_\\d+@IMG@)",processor:"$1o$2"}]}}; }
  });

  // zcool.com.cn.js
  matchRules.push({
    domain: "zcool.com.cn",
    apply: function() { window.SITE_SETTINGS={"zcool.com.cn":{srcMatching:[{srcRegExp:"//resource\\.zcool\\.cn/.+"},{srcRegExp:"(//img\\.zcool\\.cn/.+?@IMG@)@(?!1280|3000|2o).*",processor:"$1"},{srcRegExp:"(//hellorfimg\\.zcool\\.cn/.*)preview\\d*/(.+@IMG@).*",processor:["$1large/$2","//image.shutterstock.com/z/stock-photo-$2"]}]}}; }
  });

  // zhihu.com.js
  matchRules.push({
    domain: "zhihu.com",
    apply: function() { window.SITE_SETTINGS={"zhihu.com":{ignore:".GifPlayer-icon",srcMatching:[{srcRegExp:"(//pic\\w+\\.zhimg\\.com/)(?:\\d+/)?(.+?)_.+?(@IMG@).*",processor:({srcRegExpObj:e,trigger:g,triggerSrc:r})=>e.test(r)&&`${RegExp.$1}${RegExp.$2}${g.matches(".GifPlayer > *")?".gif":RegExp.$3}`}]}}; }
  });

  // zhipin.com.js
  matchRules.push({
    domain: "zhipin.com",
    apply: function() { window.SITE_SETTINGS={"zhipin.com":{srcMatching:[{srcRegExp:"(//img\\.bosszhipin\\.com/.+?)(?:_s)?(@IMG@).*",processor:"$1$2"}]}}; }
  });

  // zhisheji.com.js
  matchRules.push({
    domain: "zhisheji.com",
    apply: function() { window.SITE_SETTINGS={"zhisheji.com":{srcMatching:[{srcRegExp:"(//.+?\\.zhisheji\\.com/uc_server/data/avatar/.+_avatar_)(?:big|middle|small)(@IMG@).*",processor:"$1big$2"}]}}; }
  });

  // zillow.com.js
  matchRules.push({
    domain: "zillow.com",
    apply: function() { window.SITE_SETTINGS={"zillow.com":{srcMatching:[{srcRegExp:"(//.+?\\.zillowstatic\\.com/.+/\\w{32}-).+(@IMG@)",processor:"$1full$2"}]}}; }
  });

  // znzmo.com.js
  matchRules.push({
    domain: "znzmo.com",
    apply: function() { window.SITE_SETTINGS={"znzmo.com":{srcMatching:[{srcRegExp:"(//.+?\\.znzmo(?:img)?\\.com/)cover/\\w+/(\\w+@IMG@).*",processor:["$1case/img/$2","$1pin_user_board_pic/picture/$2"]},{srcRegExp:"(//.+?\\.znzmo(?:img)?\\.com/pin_user_board_pic/picture/)(?:hd_)?(\\w+@IMG@).*",processor:["$1hd_$2","$1$2"]},{srcRegExp:"//image\\d*\\.znzmo(?:img)?\\.com/(\\w+?)(?:_\\d)?(@IMG@).*",processor:"//image2.znzmo.com/$1$2"}]}}; }
  });

  // znztv.com.js
  matchRules.push({
    domain: "znztv.com",
    apply: function() { window.SITE_SETTINGS={"znztv.com":{srcMatching:[{srcRegExp:"(//.+?\\.znzmo(?:img)?\\.com/)cover/\\w+/(\\w+@IMG@).*",processor:["$1case/img/$2","$1pin_user_board_pic/picture/$2"]},{srcRegExp:"(//.+?\\.znzmo(?:img)?\\.com/pin_user_board_pic/picture/)(?:hd_)?(\\w+@IMG@).*",processor:["$1hd_$2","$1$2"]},{srcRegExp:"//image\\d*\\.znzmo(?:img)?\\.com/(\\w+?)(?:_\\d)?(@IMG@).*",processor:"//image2.znzmo.com/$1$2"}]}}; }
  });

  // Match current hostname against domains
  for (const rule of matchRules) {
    const domain = rule.domain;
    // Match if hostname ends with the domain, or contains it
    if (hostname === domain || 
        hostname.endsWith('.' + domain) || 
        hostname.includes(domain) ||
        // Handle tlds like "pinterest" matching "pinterest.com", "pinterest.co.uk" etc
        (domain.indexOf('.') === -1 && hostname.split('.').some(part => part === domain))) {
      try {
        rule.apply();
        console.log('[PhotoShow SitesLoader] Applied site settings for:', domain, 'on', hostname);
        break;
      } catch(e) {
        console.error('[PhotoShow SitesLoader] Error applying settings for:', domain, e);
      }
    }
  }
})();
