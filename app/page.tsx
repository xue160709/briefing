'use client';

import { useState, useEffect } from 'react';
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

interface Table {
  name: string;
}

interface Column {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export default function Home() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(50);

  // 加载数据库列表
  useEffect(() => {
    loadDatabases();
  }, []);

  // 当选择数据库时，加载表列表
  useEffect(() => {
    if (selectedDb) {
      loadTables();
    }
  }, [selectedDb]);

  // 当选择表时，加载表结构和数据
  useEffect(() => {
    if (selectedDb && selectedTable) {
      setCurrentPage(0); // 重置到第一页
      loadTableSchema();
      loadTableData();
    }
  }, [selectedDb, selectedTable]);

  // 当页码改变时，重新加载数据
  useEffect(() => {
    if (selectedDb && selectedTable && currentPage > 0) {
      loadTableData();
    }
  }, [currentPage]);

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

  const loadTables = async () => {
    try {
      setLoading(true);
      const encodedDbPath = encodeURIComponent(selectedDb);
      const response = await fetch(`/api/database/${encodedDbPath}?action=tables`);
      const result = await response.json();
      if (response.ok) {
        setTables(result.tables);
        setSelectedTable('');
        setColumns([]);
        setData([]);
      } else {
        setError(result.error || '加载表列表失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const loadTableSchema = async () => {
    try {
      const encodedDbPath = encodeURIComponent(selectedDb);
      const encodedTableName = encodeURIComponent(selectedTable);
      const response = await fetch(`/api/database/${encodedDbPath}?action=schema&table=${encodedTableName}`);
      const result = await response.json();
      if (response.ok) {
        setColumns(result.schema);
      } else {
        setError(result.error || '加载表结构失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  const loadTableData = async () => {
    try {
      setLoading(true);
      const offset = currentPage * limit;
      const encodedDbPath = encodeURIComponent(selectedDb);
      const encodedTableName = encodeURIComponent(selectedTable);
      const response = await fetch(`/api/database/${encodedDbPath}?action=data&table=${encodedTableName}&limit=${limit}&offset=${offset}`);
      const result = await response.json();
      if (response.ok) {
        setData(result.data);
        setTotalRecords(result.total);
      } else {
        setError(result.error || '加载数据失败');
      }
    } catch (err) {
      setError('网络错误');
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

  const totalPages = Math.ceil(totalRecords / limit);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>SQLite 数据库浏览器</h1>
        
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
            {loading && !selectedDb && <p>加载中...</p>}
            <div className={styles.dbList}>
              {databases.map((db) => (
                <div key={db.category} className={styles.category}>
                  <h3>{db.category}</h3>
                  {db.files.map((file) => (
                    <div
                      key={file.path}
                      className={`${styles.dbItem} ${selectedDb === file.path ? styles.selected : ''}`}
                      onClick={() => setSelectedDb(file.path)}
                    >
                      <div className={styles.dbName}>{file.name}</div>
                      <div className={styles.dbInfo}>
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.modified)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 表选择 */}
          {selectedDb && (
            <div className={styles.section}>
              <h2>选择表</h2>
              {loading && !selectedTable && <p>加载中...</p>}
              <div className={styles.tableList}>
                {tables.map((table) => (
                  <div
                    key={table.name}
                    className={`${styles.tableItem} ${selectedTable === table.name ? styles.selected : ''}`}
                    onClick={() => setSelectedTable(table.name)}
                  >
                    {table.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 表结构和数据 */}
          {selectedDb && selectedTable && (
            <div className={styles.section}>
              <h2>表结构: {selectedTable}</h2>
              <div className={styles.schema}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>列名</th>
                      <th>类型</th>
                      <th>非空</th>
                      <th>默认值</th>
                      <th>主键</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col) => (
                      <tr key={col.cid}>
                        <td>{col.name}</td>
                        <td>{col.type}</td>
                        <td>{col.notnull ? '是' : '否'}</td>
                        <td>{col.dflt_value || '-'}</td>
                        <td>{col.pk ? '是' : '否'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h2>数据 ({totalRecords} 条记录)</h2>
              {loading && <p>加载中...</p>}
              
              {/* 分页控制 */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button 
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                  >
                    首页
                  </button>
                  <button 
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                  >
                    上一页
                  </button>
                  <span>
                    第 {currentPage + 1} 页，共 {totalPages} 页
                  </span>
                  <button 
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    下一页
                  </button>
                  <button 
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    末页
                  </button>
                </div>
              )}

              <div className={styles.data}>
                {data.length > 0 ? (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th key={col.name}>{col.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, index) => (
                        <tr key={index}>
                          {columns.map((col) => (
                            <td key={col.name}>
                              {row[col.name] !== null ? String(row[col.name]) : 'NULL'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>没有数据</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
