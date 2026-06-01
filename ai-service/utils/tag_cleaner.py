from typing import List, Dict, Any

# English to Chinese translation vocabulary maps specifically tailored for designer materials
TRANSLATION_MAP = {
    # Styles & Aesthetics
    "minimalist": "极简",
    "minimalism": "极简主义",
    "minimalist design": "极简设计",
    "gradient background": "渐变背景",
    "background": "背景",
    "lighting": "光影",
    "shadow": "阴影",
    "blur": "模糊",
    "retro": "复古",
    "vintage": "复古风",
    "futuristic": "科技感",
    "tech concept": "科技概念",
    "line art": "线稿",
    "sketch": "手稿",
    "watercolor": "水彩/水墨",
    "oil painting": "油画",
    "flat": "扁平插画",
    "3d": "3D立体",
    "vector": "矢量图",
    "illustration": "插画",
    "cyberpunk": "赛博朋克",
    "vaporwave": "蒸汽波",
    "pixel": "像素风",
    "abstract": "抽象",
    "pattern": "图案/纹理",
    "texture": "质感/肌理",
    "aesthetic": "唯美",
    "clean": "干净",
    "flat design": "扁平设计",
    "glassmorphism": "玻璃拟态",
    "skeuomorphism": "拟物风",
    "isometric": "等距视角",
    
    # Colors
    "blue": "蓝色",
    "red": "红色",
    "green": "绿色",
    "yellow": "黄色",
    "black": "黑色",
    "white": "白色",
    "purple": "紫色",
    "pink": "粉色",
    "orange": "橙色",
    "brown": "棕色",
    "grey": "灰色",
    "gray": "灰色",
    "monochrome": "单色",
    "colorful": "彩色",
    "grayscale": "灰度",
    "multicolored": "彩色",
    "neon": "霓虹",
    "solid background": "纯色背景",
    "gradient": "渐变色",
    "warm colors": "暖色调",
    "cool colors": "冷色调",
    
    # Scenes
    "indoor": "室内",
    "outdoor": "户外",
    "city": "城市",
    "nature": "自然",
    "forest": "森林",
    "mountain": "山峰",
    "beach": "沙滩",
    "street": "街道",
    "sky": "天空",
    "cloud": "云朵",
    "room": "房间",
    "office": "办公室",
    "classroom": "教室",
    "night": "夜晚",
    "day": "白天",
    "scenery": "风景",
    "landscape": "自然风光",
    "cityscape": "城市风光",
    "seascape": "海景",
    
    # Usage / Layout
    "poster": "海报",
    "design": "设计",
    "logo": "标志/Logo",
    "ui": "界面设计/UI",
    "ux": "用户体验/UX",
    "layout": "构图布局",
    "grid": "网格系统",
    "typography": "排版排字",
    "text": "文本",
    "border": "边框",
    "frame": "外框",
    "infographic": "信息图表",
    "mockup": "样机/Mockup",
    "flyer": "传单",
    "brochure": "宣传册",
    "banner": "横幅/Banner",
    "card": "卡片",
    "cover": "封面",
    "advertising": "广告宣传",
    "branding": "品牌VI",
    
    # Subjects
    "girl": "女孩",
    "boy": "男孩",
    "man": "男人",
    "woman": "女人",
    "person": "人物",
    "people": "人们",
    "cat": "猫咪",
    "dog": "狗狗",
    "animal": "动物",
    "bird": "鸟类",
    "tree": "树木",
    "flower": "花卉",
    "car": "汽车",
    "vehicle": "载具",
    "chair": "椅子",
    "table": "桌子",
    "computer": "电脑",
    "phone": "手机",
    "food": "食物",
    "drink": "饮料",
    "building": "建筑",
    "house": "房屋",
    "window": "窗户",
    "door": "门",
    "wings": "翅膀",
    "sword": "剑",
    "guitar": "吉他",
    "instrument": "乐器",
    "character": "角色/卡通",
    "mascot": "吉祥物",
    "object": "物体",
    "device": "设备",
    "plant": "植物",
    
    # Expanded RAM++ / Photography / Scene / Product / Texture translations
    "scenic": "风景",
    "outdoors": "户外",
    "photo": "摄影",
    "sunset": "日落",
    "sunrise": "日出",
    "sunlight": "阳光",
    "skyline": "天际线",
    "view": "景色",
    "shadows": "阴影",
    "highlights": "高光",
    "color": "色彩",
    "product": "单品/产品",
    "commercial": "商业广告",
    "items": "物件",
    "item": "物件",
    "light": "光影",
    "furniture": "家具",
    "portrait": "人像",
    "ocean": "海洋",
    "sea": "大海",
    "water": "水面",
    "lake": "湖泊",
    "river": "河流",
    "wood": "木质",
    "green": "绿色",
    "leaves": "叶子",
    "beverage": "饮品",
    "cup": "杯子",
    "bottle": "瓶子",
    "glass": "玻璃",
    "metal": "金属",
    "textile": "纺织品",
    "fabric": "面料",
    "clothing": "服装",
    "apparel": "服装",
    "electronics": "电子产品",
    "packaging": "包装",
    "box": "盒子",
    "bag": "袋子",
    "cosmetics": "化妆品",
    "makeup": "彩妆",
    "skin care": "护肤品",
    "perfume": "香水"
}

class CleanedTag:
    """
    Structured representation of a cleaned tag prediction from WD Tagger.
    """
    def __init__(
        self,
        raw_name: str,
        display_name: str,
        normalized_name: str,
        tag_type: str,
        source: str,
        confidence: float
    ):
        self.raw_name = raw_name
        self.display_name = display_name
        self.normalized_name = normalized_name
        self.tag_type = tag_type
        self.source = source
        self.confidence = confidence

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the CleanedTag object to a dictionary.
        Includes compatibility keys 'name' and 'type' for existing React/Electron layers.
        """
        return {
            "raw_name": self.raw_name,
            "display_name": self.display_name,
            "normalized_name": self.normalized_name,
            "tag_type": self.tag_type,
            "source": self.source,
            "confidence": self.confidence,
            # Backwards compatibility fields
            "name": self.display_name,
            "type": self.tag_type
        }

def clean_wd_tag(raw_tag: str, category: int, score: float, source: str = "ai_wd_tagger") -> CleanedTag:
    """
    Cleans a raw WD Tagger tag:
    - Removes underscores, converting to spaces.
    - Generates display_name and normalized_name.
    - Dynamically maps general/character category tags to design taxonomy tags.
    - Resolves localized Chinese display names if matched in TRANSLATION_MAP.
    """
    # 1. Clean characters and formatting
    cleaned_name = raw_tag.replace('_', ' ').strip()
    normalized_name = cleaned_name.lower()
    
    # 2. Localize to Chinese if matched, otherwise fallback to title-cased English
    if normalized_name in TRANSLATION_MAP:
        display_name = TRANSLATION_MAP[normalized_name]
    else:
        display_name = cleaned_name.title()
    
    # 3. Determine tag taxonomy type mapping based on category and keyword heuristics
    tag_type = "custom"
    
    if category == 1:
        # Character tags -> subject
        tag_type = "subject"
    elif category == 2:
        # Rating tags -> rating
        tag_type = "rating"
    else:
        # Category is 0 (General) or 9 (Meta). We perform rule-based keyword mapping:
        tag_lower = cleaned_name.lower()
        
        # Priority 1: Style keywords
        style_keywords = [
            "background", "gradient", "lighting", "shadow", "blur", "retro", "vintage", 
            "futuristic", "minimalist", "line art", "sketch", "watercolor", "oil painting", 
            "flat", "3d", "vector", "illustration", "cyberpunk", "vaporwave", "pixel", 
            "abstract", "pattern", "halftone", "texture", "watercolor", "drawing", 
            "painting", "aesthetic", "sketchbook", "digital media", "sketching", "design"
        ]
        
        # Priority 2: Colors
        color_keywords = [
            "blue", "red", "green", "yellow", "black", "white", "purple", "pink", "orange", 
            "brown", "grey", "gray", "monochrome", "colorful", "grayscale", "multicolored", 
            "neon", "gradient background", "solid background"
        ]
        
        # Priority 3: Scene / Environment / Atmosphere
        scene_keywords = [
            "indoor", "outdoor", "city", "nature", "forest", "mountain", "beach", "street", 
            "sky", "cloud", "room", "office", "classroom", "night", "day", "scenery", 
            "landscape", "underwater", "space", "cityscape", "seascape", "scenic"
        ]
        
        # Priority 4: Usage / Layout
        usage_keywords = [
            "poster", "design", "logo", "ui", "ux", "layout", "grid", "typography", 
            "text", "border", "frame", "infographic", "mockup", "flyer", "brochure", 
            "banner", "card", "magazine", "cover", "webpage", "ad", "branding"
        ]
        
        # Priority 5: Subjects
        subject_keywords = [
            "girl", "boy", "man", "woman", "person", "people", "cat", "dog", "animal", 
            "bird", "tree", "flower", "car", "vehicle", "chair", "table", "computer", 
            "phone", "food", "drink", "building", "house", "window", "door", "hat", 
            "shirt", "pants", "dress", "shoes", "glasses", "hair", "eyes", "face", 
            "body", "wings", "sword", "weapon", "guitar", "instrument", "object", "item"
        ]

        if any(kw in tag_lower for kw in style_keywords):
            tag_type = "style"
        elif any(kw in tag_lower for kw in color_keywords):
            tag_type = "color"
        elif any(kw in tag_lower for kw in scene_keywords):
            tag_type = "scene"
        elif any(kw in tag_lower for kw in usage_keywords):
            tag_type = "usage"
        elif any(kw in tag_lower for kw in subject_keywords):
            tag_type = "subject"
        else:
            tag_type = "custom"
            
    return CleanedTag(
        raw_name=raw_tag,
        display_name=display_name,
        normalized_name=normalized_name,
        tag_type=tag_type,
        source=source,
        confidence=float(score)
    )

def clean_tags(tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Fallback deduplicator function for legacy compatibility.
    Strips whitespace and ensures unique tags by name.
    """
    seen = set()
    cleaned = []
    
    for t in tags:
        name = t.get("name", "").strip()
        if not name:
            continue
            
        normalized = name.lower()
        if normalized in seen:
            continue
            
        seen.add(normalized)
        t["name"] = name
        cleaned.append(t)
        
    return cleaned
