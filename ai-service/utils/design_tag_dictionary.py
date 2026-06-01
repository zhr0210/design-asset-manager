# English prompt mapping specifically designed to enhance CLIP zero-shot classification performance
# for professional designer assets, maintaining group structure and localized Chinese translation maps.

DESIGN_TAG_DICTIONARY = {
    "style": {
        "minimalist design": ["minimalist design", "clean simple minimal style", "sleek minimalism aesthetics"],
        "luxury business style": ["luxury business style", "premium corporate dark gold", "expensive luxury branding"],
        "Chinese ink painting style": ["Chinese ink painting style", "oriental traditional ink brush style", "guofeng aesthetic graphic"],
        "cyberpunk style": ["cyberpunk style", "neon glowing sci-fi dark synthwave", "high tech future city night"],
        "glassmorphism": ["glassmorphism design", "frosted translucent glass panel UI overlay", "glossy transparent glass aesthetic"],
        "watercolor illustration": ["watercolor illustration", "soft painting color pigments blend", "watercolor wash cartoon"],
        "technology style": ["technology style", "digital dynamic science high tech", "abstract coding network graphics"],
        "financial business style": ["financial business style", "professional economic statistics presentation layout"]
    },
    "usage": {
        "presentation cover": ["presentation cover", "powerpoint keynote corporate slide cover", "business index template"],
        "commercial poster": ["commercial poster", "advertising event graphic flyer print", "retail marketing sign poster"],
        "e-commerce banner": ["e-commerce banner", "shopping sale promotional horizontal grid", "web marketing discount banner"],
        "UI design": ["UI design", "user interface mobile screen dashboard mockup", "website layout wireframe system"],
        "restaurant sign": ["restaurant sign", "menu advertisement dining card flyer", "food eatery visual signage board"],
        "teaching report cover": ["teaching report cover", "school presentation title cover slide", "educational slides template"],
        "financial poster": ["financial poster", "bank wealth management stock investment flyer", "commercial finance marketing banner"],
        "long infographic": ["long infographic", "vertical corporate data report charts poster", "text dense process layout brochure"]
    },
    "layout": {
        "centered title layout": ["centered title layout", "symmetric title typographic composition", "centered typography layout"],
        "left text right image layout": ["left text right image layout", "asymmetric split screen composition text left", "horizontal splitscreen text image block"],
        "large whitespace layout": ["large whitespace layout", "minimalist layout wide empty spacing margins", "breathing room spacious negative space composition"],
        "dense information layout": ["dense information layout", "data grid charts heavy text content", "highly packed structure layout template"],
        "horizontal banner layout": ["horizontal banner layout", "wide horizontal ratio banner graphic header", "landscape banner layout"],
        "vertical poster layout": ["vertical poster layout", "portrait ratio flyer print layout", "tall vertical poster design"]
    },
    "color": {
        "blue purple gradient": ["blue purple gradient", "vibrant colorful mesh gradient fluid texture", "holographic neon gradient flow"],
        "black gold color scheme": ["black gold color scheme", "premium gold foil dark black background luxury", "metallic golden highlights black tone"],
        "red orange warm color palette": ["red orange warm color palette", "hot energetic red orange yellow background", "vibrant sunny warm tone design"],
        "dark background": ["dark background", "sleek dark mode design visual", "night black deep background contrast"],
        "light clean background": ["light clean background", "pristine white light gray breathing background", "soft bright workspace mockup background"],
        "low saturation green": ["low saturation green", "soft sage forest olive green nature hue", "earthy muted green tone"],
        "cool tone": ["cool tone", "chilly blue cyan cool lighting visual", "winter snow icy cold tone scheme"],
        "warm tone": ["warm tone", "cozy yellow orange candle warm lighting", "autumn golden warm tone palette"]
    },
    "scene": {
        "city skyline": ["city skyline", "metropolis cityscape urban skyscrapers building outdoor", "modern city line horizon"],
        "indoor room": ["indoor room", "interior furniture office home workspace room scenery", "indoor scene design"],
        "restaurant interior": ["restaurant interior", "eatery dining table cafe inside layout", "restaurant indoor space setup"],
        "mountain landscape": ["mountain landscape", "mountain nature scenery landscape outdoor sky cloud", "valley natural scenery photo"],
        "office scene": ["office scene", "corporate boardroom business desk meeting computer", "office indoor work life"],
        "product photography": ["product photography", "still life studio lighting product shot", "cosmetic retail clean product photo"],
        "abstract background": ["abstract background", "blurry shapes fluid mesh digital art background", "minimal pattern vector background"]
    }
}

ENGLISH_TO_CHINESE_MAP = {
    "minimalist design": "极简设计",
    "luxury business style": "商务奢华风",
    "Chinese ink painting style": "水墨国潮风",
    "cyberpunk style": "赛博朋克风",
    "glassmorphism": "玻璃拟态",
    "watercolor illustration": "水彩插画风",
    "technology style": "科技炫酷风",
    "financial business style": "金融商务风",
    
    "presentation cover": "PPT封面",
    "commercial poster": "商业海报",
    "e-commerce banner": "电商横幅",
    "UI design": "UI界面",
    "restaurant sign": "餐饮招牌",
    "teaching report cover": "教学汇报封面",
    "financial poster": "金融海报",
    "long infographic": "长图信息图",
    
    "centered title layout": "居中标题排版",
    "left text right image layout": "左文右图排版",
    "large whitespace layout": "大面积留白",
    "dense information layout": "信息密集型排版",
    "horizontal banner layout": "横版海报",
    "vertical poster layout": "竖版海报",
    
    "blue purple gradient": "蓝紫渐变",
    "black gold color scheme": "黑金配色",
    "red orange warm color palette": "红橙暖色调",
    "dark background": "深色背景",
    "light clean background": "浅色干净背景",
    "low saturation green": "低饱和度绿",
    "cool tone": "冷色调",
    "warm tone": "暖色调",
    
    "city skyline": "城市天际线",
    "indoor room": "室内场景",
    "restaurant interior": "餐厅内景",
    "mountain landscape": "山川风光",
    "office scene": "办公场景",
    "product photography": "产品摄影",
    "abstract background": "抽象背景"
}
