import { NextRequest, NextResponse } from 'next/server';

// 支持的模型配置
const MODELS = {
  // OpenAI
  'gpt-4o': {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  // 阿里云通义千问
  'qwen-turbo': {
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  'qwen-plus': {
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  'qwen-max': {
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  // 智谱 GLM
  'glm-4': {
    provider: 'zhipu',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKeyEnv: 'ZHIPU_API_KEY',
  },
  'glm-4-flash': {
    provider: 'zhipu',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKeyEnv: 'ZHIPU_API_KEY',
  },
  // 百度文心
  'ernie-4': {
    provider: 'baidu',
    endpoint: 'https://qianfan.baidubce.com/v2/chat/completions',
    apiKeyEnv: 'BAIDU_API_KEY',
  },
  'ernie-speed': {
    provider: 'baidu',
    endpoint: 'https://qianfan.baidubce.com/v2/chat/completions',
    apiKeyEnv: 'BAIDU_API_KEY',
  },
};

// 默认使用通义千问
const DEFAULT_MODEL = 'qwen-turbo';

async function callAI(modelName: string, messages: { role: string; content: string | object[] }[]) {
  const model = MODELS[modelName as keyof typeof MODELS] || MODELS[DEFAULT_MODEL];
  const apiKey = process.env[model.apiKeyEnv || 'OPENAI_API_KEY'];
  
  if (!apiKey) {
    throw new Error(`请配置环境变量: ${model.apiKeyEnv || 'OPENAI_API_KEY'}`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 根据不同 provider 设置认证方式
  if (model.provider === 'openai') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (model.provider === 'qwen') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (model.provider === 'zhipu') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (model.provider === 'baidu') {
    // 百度使用 Basic Auth
    const baiduToken = Buffer.from(`:${apiKey}`).toString('base64');
    headers['Authorization'] = `Basic ${baiduToken}`;
  }

  const response = await fetch(model.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelName,
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 错误: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdf, filename, question, summary, model } = body;

    // 追问场景
    if (question && summary) {
      const messages = [
        {
          role: 'system',
          content: '你是一个 PDF 文档助手，基于给定的摘要内容回答用户问题。如果问题超出摘要范围，请如实告知。',
        },
        {
          role: 'user',
          content: `摘要内容：\n${summary}\n\n问题：${question}`,
        },
      ];

      const answer = await callAI(model || DEFAULT_MODEL, messages);
      return NextResponse.json({ answer });
    }

    // PDF 摘要场景
    if (!pdf || !filename) {
      return NextResponse.json({ error: '缺少 PDF 文件' }, { status: 400 });
    }

    // 国产模型不支持原生 PDF，需要先用 pdf.js 提取文本
    // 这里简化处理：假设上传的是已经提取的文本或者需要前端处理
    
    // 注意：由于浏览器安全限制，前端无法直接读取 PDF 文本
    // 这里需要后端处理，但后端在 Edge Runtime 下无法使用 pdf.js
    // 解决方案：使用支持 PDF 的模型，或者添加 PDF 解析服务
    
    // 简化版：返回一个提示
    return NextResponse.json({
      summary: `PDF 摘要功能需要配置支持 PDF 的模型。\n\n当前使用模型: ${model || DEFAULT_MODEL}\n\n如需使用 PDF 摘要，请：\n1. 使用支持 PDF 的模型（如 OpenAI o1-mini）\n2. 或配置 PDF 文本提取服务\n\n环境变量配置：\n- 通义千问: DASHSCOPE_API_KEY\n- 智谱 GLM: ZHIPU_API_KEY\n- 百度文心: BAIDU_API_KEY\n- OpenAI: OPENAI_API_KEY`,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
