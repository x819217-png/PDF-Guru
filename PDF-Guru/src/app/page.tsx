'use client';

import { useState, useCallback, useRef } from 'react';

type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [question, setQuestion] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setSummary('');
      setError('');
    } else {
      setError('请上传 PDF 文件');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setSummary('');
      setError('');
    } else if (selectedFile) {
      setError('请上传 PDF 文件');
    }
  }, []);

  const handleSubmit = async () => {
    if (!file) return;

    setStatus('uploading');
    setError('');

    try {
      // 读取 PDF 文件为 base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      setStatus('processing');

      // 调用 API
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf: base64,
          filename: file.name,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '处理失败');
      }

      const data = await response.json();
      setSummary(data.summary);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败，请重试');
      setStatus('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    alert('已复制到剪贴板');
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !summary) return;

    setStatus('processing');
    setError('');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          summary,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '提问失败');
      }

      const data = await response.json();
      setSummary(prev => prev + '\n\n---\n\n问: ' + question.trim() + '\n答: ' + data.answer);
      setQuestion('');
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提问失败，请重试');
      setStatus('error');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">PDF Guru</h1>
          <p className="text-sm text-gray-500">AI PDF 摘要工具</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 上传区域 */}
        <div
          className={`drop-zone rounded-lg p-12 text-center cursor-pointer ${
            isDragOver ? 'drag-over' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {file ? (
            <div>
              <div className="text-4xl mb-2">📄</div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📎</div>
              <p className="font-medium text-gray-900">拖拽 PDF 到这里，或点击上传</p>
              <p className="text-sm text-gray-500 mt-1">最大 10MB</p>
            </div>
          )}
        </div>

        {/* 上传按钮 */}
        {file && status === 'idle' && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              生成摘要
            </button>
          </div>
        )}

        {/* 状态显示 */}
        {status === 'uploading' && (
          <div className="mt-8 text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-600">上传中...</p>
          </div>
        )}

        {status === 'processing' && (
          <div className="mt-8 text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-600">AI 正在分析并生成摘要...</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
            {error}
          </div>
        )}

        {/* 摘要结果 */}
        {summary && status === 'success' && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">摘要结果</h2>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                {summary}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                📋 复制
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ⬇️ 下载
              </button>
            </div>

            {/* 追问区域 */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">追问</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="基于摘要内容提问..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || status === 'processing'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-gray-400">
          <p>不存储用户文件 • 保护隐私</p>
        </footer>
      </div>
    </main>
  );
}
