import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdf, filename, question, summary } = body;

    // 场景1: 追问
    if (question && summary) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一个 PDF 文档助手，基于给定的摘要内容回答用户问题。如果问题超出摘要范围，请如实告知。',
          },
          {
            role: 'user',
            content: `摘要内容：\n${summary}\n\n问题：${question}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const answer = completion.choices[0]?.message?.content || '无法生成回答';

      return NextResponse.json({ answer });
    }

    // 场景2: PDF 摘要
    if (!pdf || !filename) {
      return NextResponse.json(
        { error: '缺少 PDF 文件' },
        { status: 400 }
      );
    }

    // 将 base64 转换为 Buffer
    const pdfBuffer = Buffer.from(pdf, 'base64');

    // 使用 OpenAI Vision API 直接处理 PDF
    // 注意：这里需要将 PDF 转为图片或使用支持 PDF 的模型
    // 简化版本：假设 PDF 是文本型，直接让 AI 处理
    
    // 这里是一个简化的实现
    // 生产环境需要：
    // 1. 使用 pdf.js 解析 PDF 文本
    // 2. 分块处理大文件
    // 3. 使用更强的模型

    // 由于浏览器端 pdf.js 可能更方便，这里做一个简化
    // 实际上我们需要先用 pdf.js 提取文本

    // 这里使用 o1 模型来处理，因为 o1 支持原生 PDF 输入
    // 如果没有 o1，可以用 vision 模型
    
    // 尝试使用 o1-preview 或 o1-mini（支持 PDF）
    try {
      const completion = await openai.chat.completions.create({
        model: 'o1-mini-2024-09-17',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'input_file',
                file: {
                  filename: filename,
                  format: 'pdf',
                },
              },
              {
                type: 'input_text',
                text: '请仔细阅读这个 PDF 文档，然后生成一个简洁的摘要，包括：1）文档的主要主题和目的；2）关键内容要点（3-5个）；3）文档类型（报告、论文、合同等）。请用中文回复。',
              },
            ],
          },
        ],
        max_completion_tokens: 2000,
      });

      const aiSummary = completion.choices[0]?.message?.content || '无法生成摘要';

      return NextResponse.json({ summary: aiSummary });
    } catch (aiError) {
      console.error('OpenAI API Error:', aiError);
      
      // 如果 o1 模型不可用，尝试用 GPT-4o + vision
      // 注意：GPT-4o 当前不支持直接 PDF 输入，需要先转图片
      // 这里返回一个提示
      return NextResponse.json({
        summary: 'PDF 解析功能正在配置中。请提供 OpenAI API Key 并确保支持 o1 模型。\n\n当前环境变量：OPENAI_API_KEY',
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
