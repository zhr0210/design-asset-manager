export const DEFAULT_PROMPT_TEMPLATE_ID = 'qwen3vl.design_prompt.v1'
export const DEFAULT_PROMPT_REVERSE_MAX_TOKENS = 1536
export const RETRY_PROMPT_REVERSE_MAX_TOKENS = 3072

export const DEFAULT_QWEN3VL_DESIGN_PROMPT = `你是一位专业的 AI 图像提示词专家和高级视觉设计师。

请仔细分析这张设计参考图，并生成一段可复用的图像生成提示词（Prompt）。

请严格以合规的 JSON 格式返回结果，仅包含以下字段，不要输出任何额外的 Markdown 标记（如 \`\`\`json）或解释性文本：
englishPrompt, chineseDescription, shortCaption, styleTags, subjectTags, compositionTags, colorTags, usageTags, negativePromptSuggestion。

分析时请专注于：
- 视觉风格（如扁平插画、写实摄影、奢华黑金、3D渲染等）
- 画面主体与细节特征
- 版式布局与构图方式（如对称、三分法、对角线、居中等）
- 色彩搭配（主色调、辅助色、渐变与对比度）
- 光影调性与照明效果
- 文字区域分布与排版感受
- 图形元素、背景装饰与画面意境
- 商业设计用途建议

要求：
1. 不要简单地罗列物体，请详细描述如何重建这种设计风格。
2. englishPrompt 字段必须为英文（适合 Midjourney/Stable Diffusion 绘图输入），描述画面并包含核心风格词。
3. chineseDescription 字段必须为中文，详尽剖析画面的设计美学与视觉呈现。
4. styleTags、subjectTags、compositionTags、colorTags、usageTags 字段必须全部使用中文标签，不要输出英文标签。
5. 请勿幻想出无法阅读的乱码文字。`

export const OPENAI_COMPATIBLE_REVERSE_PROMPT = DEFAULT_QWEN3VL_DESIGN_PROMPT
