'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface DatabaseFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface Database {
  category: string;
  files: DatabaseFile[];
}

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

export default function SqlEditor() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM sqlite_master WHERE type="table";');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 加载数据库列表
  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/databases');
      const result = await response.json();
      if (response.ok) {
        setDatabases(result.databases);
      } else {
        setError(result.error || '加载数据库列表失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!selectedDb) {
      setError('请先选择数据库');
      return;
    }

    if (!sqlQuery.trim()) {
      setError('请输入SQL查询语句');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/sql-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database: selectedDb,
          query: sqlQuery,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setResult(result);
      } else {
        setError(result.error || '查询执行失败');
        setResult(null);
      }
    } catch (err) {
      setError('网络错误');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      executeQuery();
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>SQL 查询编辑器</h1>
          <div className={styles.nav}>
            <Link href="/" className={styles.navLink}>返回数据库浏览器</Link>
          </div>
        </div>
        
        {error && (
          <div className={styles.error}>
            错误: {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className={styles.container}>
          {/* 数据库选择 */}
          <div className={styles.section}>
            <h2>选择数据库</h2>
            <select 
              className={styles.dbSelect}
              value={selectedDb}
              onChange={(e) => setSelectedDb(e.target.value)}
            >
              <option value="">请选择数据库...</option>
              {databases.map((db) => (
                <optgroup key={db.category} label={db.category}>
                  {db.files.map((file) => (
                    <option key={file.path} value={file.path}>
                      {file.name} ({formatFileSize(file.size)})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* SQL 编辑器 */}
          <div className={styles.section}>
            <div className={styles.editorHeader}>
              <h2>SQL 查询</h2>
              <button 
                className={styles.executeBtn}
                onClick={executeQuery}
                disabled={loading || !selectedDb}
              >
                {loading ? '执行中...' : '执行查询 (Ctrl+Enter)'}
              </button>
            </div>
            <textarea
              className={styles.sqlEditor}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="在此输入SQL查询语句..."
              rows={10}
            />
          </div>

          {/* 查询结果 */}
          {result && (
            <div className={styles.section}>
              <div className={styles.resultHeader}>
                <h2>查询结果</h2>
                <div className={styles.resultInfo}>
                  <span>返回 {result.rowCount} 行</span>
                  <span>执行时间: {result.executionTime}ms</span>
                </div>
              </div>
              
              {result.rows.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.resultTable}>
                    <thead>
                      <tr>
                        {result.columns.map((column, index) => (
                          <th key={index}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>
                              {cell === null ? (
                                <span className={styles.nullValue}>NULL</span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.noResults}>
                  查询成功，但没有返回数据
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 