# English to Chinese design translation dictionary for localizing design tags and terms.

DESIGN_TRANSLATION_DICTIONARY = {
    "subject": {
        "food": "食品",
        "drink": "饮品",
        "beverage": "饮品",
        "milk tea": "奶茶",
        "coffee": "咖啡",
        "bread": "面包",
        "chocolate": "巧克力",
        "nuts": "坚果",
        "cup": "杯子",
        "bottle": "瓶子",
        "table": "桌子",
        "wooden tray": "木质托盘",
        "person": "人物",
        "building": "建筑",
        "city skyline": "城市天际线",
        "mountain": "山峰",
        "flower": "花"
    },
    "usage": {
        "poster": "海报",
        "banner": "Banner",
        "flyer": "宣传单",
        "presentation cover": "PPT封面",
        "slide cover": "PPT封面",
        "menu": "菜单",
        "restaurant sign": "餐厅指示牌",
        "notice sign": "温馨提示牌",
        "commercial poster": "商业海报",
        "financial poster": "金融海报",
        "product advertisement": "产品广告"
    },
    "style": {
        "minimalist": "极简",
        "luxury": "轻奢",
        "business style": "商务风",
        "financial business": "金融商务",
        "technology style": "科技感",
        "glassmorphism": "玻璃拟态",
        "watercolor": "水彩风",
        "ink painting": "水墨风",
        "3d render": "3D立体",
        "cinematic": "电影感"
    },
    "layout": {
        "large whitespace": "大面积留白",
        "centered title": "标题居中",
        "left text right image": "左文右图",
        "collage layout": "拼贴排版",
        "grid layout": "网格布局",
        "card layout": "卡片布局",
        "horizontal banner": "横版构图",
        "vertical poster": "竖版构图"
    },
    "color": {
        "blue background": "蓝色背景",
        "purple background": "紫色背景",
        "blue purple gradient": "蓝紫渐变",
        "dark background": "深色背景",
        "light background": "浅色背景",
        "black and gold": "黑金",
        "warm tone": "暖色调",
        "cool tone": "冷色调",
        "green tone": "绿色调",
        "red orange": "红橙色"
    }
}

# Create a flattened and normalized lookup dictionary for high-performance retrieval.
# All keys are lowercase and stripped.
DESIGN_TRANSLATION_MAP = {}
for category, group in DESIGN_TRANSLATION_DICTIONARY.items():
    for en_key, zh_val in group.items():
        DESIGN_TRANSLATION_MAP[en_key.lower().strip()] = zh_val
