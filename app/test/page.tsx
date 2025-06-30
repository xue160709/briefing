'use client';

import { useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testDatabasesAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/databases');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('错误: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseAPI = async () => {
    setLoading(true);
    try {
      // 测试一个示例数据库路径
      const response = await fetch('/api/database/ai.googlere-search/20a2d812-5dc6-42c8-ad1a-6de576713d78-webpage.sqlite?action=tables');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('错误: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API 测试页面</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testDatabasesAPI} disabled={loading}>
          测试数据库列表 API
        </button>
        <button onClick={testDatabaseAPI} disabled={loading} style={{ marginLeft: '10px' }}>
          测试数据库内容 API
        </button>
      </div>

      {loading && <p>加载中...</p>}
      
      <pre style={{ 
        background: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '4px',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word'
      }}>
        {result}
      </pre>
    </div>
  );
} 