/**
 * 📦 共享资产数据类型定义 (Shared Asset Types)
 */

export interface Asset {
  id: string
  title: string
  file_name: string
  file_path: string
  thumbnail_path: string
  source_site_id: string
  source_site_name: string
  source_page_url?: string | null
  original_url?: string | null
  width?: number | null
  height?: number | null
  file_size?: number | null
  file_type?: string | null
  dominant_color?: string | null
  browser_page_title?: string | null
  capture_method?: string | null
  created_at: string
  updated_at: string

  // AI 语义增强扩充字段 (部分字段属于 assets 表扩展或按需填充)
  ai_caption?: string | null            // Florence-2 细节大字幕描述
  ai_caption_source?: string | null     // 字幕生成源 (如 ai_florence)
  ai_caption_updated_at?: string | null // 字幕最新生成时间
  ai_caption_is_user_edited?: number    // 用户是否手动修改锁 (1代表锁)
  ai_ocr_text?: string | null           // OCR 文本识别全句
  ai_ocr_source?: string | null         // OCR 数据源 (如 ai_florence_ocr)
  ai_ocr_updated_at?: string | null    // OCR 数据最新更新时间
  custom_category?: string | null       // 用户覆盖的自定义大类 (如 ui, poster)
}

export interface AssetFilters {
  keyword?: string                      // 模糊查询关键字
  siteId?: string                       // 来源站点过滤
  tagIds?: string[]                     // 标签ID过滤
  category?: string                     // 路由器判定的大类或用户自定义大类
  color?: string                        //  dominant_color 主色近色过滤
  captureMethod?: string                // 抓取类型过滤
  limit?: number                        // 分页条数
  offset?: number                       // 分页偏移量
  sortBy?: 'created_at' | 'file_size' | 'title' // 排序依据
  sortOrder?: 'asc' | 'desc'            // 排序顺序
}
