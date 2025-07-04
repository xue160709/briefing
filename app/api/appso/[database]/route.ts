import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import sqlite3 from 'sqlite3';

interface Params {
  params: {
    database: string;
  };
}

// 验证表名是否安全（防止SQL注入）
function isValidTableName(tableName: string): boolean {
  // 只允许字母、数字、下划线
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
}

// 添加CORS头部的辅助函数
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const databaseName = resolvedParams.database;
    
    // 安全检查：确保数据库名称只包含安全字符
    if (!databaseName || !/^[a-zA-Z0-9._-]+\.sqlite$/.test(databaseName)) {
      return addCorsHeaders(NextResponse.json({ error: '无效的数据库名称' }, { status: 400 }));
    }

    const fullDbPath = path.join(process.cwd(), 'appso', databaseName);

    // 安全检查：确保路径在appso目录内
    const appsoDir = path.join(process.cwd(), 'appso');
    const resolvedPath = path.resolve(fullDbPath);
    if (!resolvedPath.startsWith(path.resolve(appsoDir))) {
      return addCorsHeaders(NextResponse.json({ error: '无效的文件路径' }, { status: 400 }));
    }

    if (!fs.existsSync(fullDbPath)) {
      return addCorsHeaders(NextResponse.json({ error: '数据库文件不存在' }, { status: 404 }));
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'tables';
    const tableName = searchParams.get('table');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // 限制最大1000条
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // 验证表名
    if (tableName && !isValidTableName(tableName)) {
      return addCorsHeaders(NextResponse.json({ error: '无效的表名' }, { status: 400 }));
    }

    return new Promise((resolve) => {
      const db = new sqlite3.Database(fullDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('数据库打开失败:', err);
          resolve(addCorsHeaders(NextResponse.json({ error: '无法打开数据库' }, { status: 500 })));
          return;
        }

        if (action === 'tables') {
          // 获取所有表名
          db.all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
            [],
            (err, rows) => {
              db.close();
              if (err) {
                console.error('查询表名失败:', err);
                resolve(addCorsHeaders(NextResponse.json({ error: '查询表名失败' }, { status: 500 })));
                return;
              }
              resolve(addCorsHeaders(NextResponse.json({ tables: rows })));
            }
          );
        } else if (action === 'schema' && tableName) {
          // 获取表结构
          db.all(
            "PRAGMA table_info(" + tableName + ")",
            [],
            (err, rows) => {
              db.close();
              if (err) {
                console.error('查询表结构失败:', err);
                resolve(addCorsHeaders(NextResponse.json({ error: '查询表结构失败' }, { status: 500 })));
                return;
              }
              resolve(addCorsHeaders(NextResponse.json({ schema: rows })));
            }
          );
        } else if (action === 'data' && tableName) {
          // 获取表数据
          const sql = `SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`;
          db.all(
            sql,
            [limit, offset],
            (err, rows) => {
              if (err) {
                db.close();
                console.error('查询数据失败:', err);
                resolve(addCorsHeaders(NextResponse.json({ error: '查询数据失败' }, { status: 500 })));
                return;
              }

              // 获取总数
              const countSql = `SELECT COUNT(*) as count FROM "${tableName}"`;
              db.get(
                countSql,
                [],
                (err, countRow: any) => {
                  db.close();
                  if (err) {
                    console.error('查询总数失败:', err);
                    resolve(addCorsHeaders(NextResponse.json({ error: '查询总数失败' }, { status: 500 })));
                    return;
                  }
                  resolve(addCorsHeaders(NextResponse.json({ 
                    data: rows, 
                    total: countRow.count,
                    limit,
                    offset
                  })));
                }
              );
            }
          );
        } else if (action === 'info') {
          // 获取数据库基本信息
          db.all(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            [],
            (err, tables) => {
              if (err) {
                db.close();
                console.error('查询数据库信息失败:', err);
                resolve(addCorsHeaders(NextResponse.json({ error: '查询数据库信息失败' }, { status: 500 })));
                return;
              }

              // 获取每个表的记录数
              const tablePromises = tables.map((table: any) => {
                return new Promise((tableResolve) => {
                  db.get(
                    `SELECT COUNT(*) as count FROM "${table.name}"`,
                    [],
                    (err, countRow: any) => {
                      if (err) {
                        tableResolve({ name: table.name, count: 0, sql: table.sql });
                      } else {
                        tableResolve({ name: table.name, count: countRow.count, sql: table.sql });
                      }
                    }
                  );
                });
              });

              Promise.all(tablePromises).then((tableInfo) => {
                db.close();
                resolve(addCorsHeaders(NextResponse.json({ 
                  database: databaseName,
                  tables: tableInfo,
                  totalTables: tables.length
                })));
              });
            }
          );
        } else {
          db.close();
          resolve(addCorsHeaders(NextResponse.json({ error: '无效的操作参数' }, { status: 400 })));
        }
      });
    });
  } catch (error) {
    console.error('数据库操作出错:', error);
    return addCorsHeaders(NextResponse.json({ error: '数据库操作失败' }, { status: 500 }));
  }
} 