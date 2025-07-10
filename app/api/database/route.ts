import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import sqlite3 from 'sqlite3';

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

// 验证表名是否安全（防止SQL注入）
function isValidTableName(tableName: string): boolean {
  // 只允许字母、数字、下划线
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
}

export async function GET(request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'database', 'database.sqlite');
    
    if (!fs.existsSync(dbPath)) {
      return addCorsHeaders(NextResponse.json({ error: '数据库文件不存在' }, { status: 404 }));
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'tables';
    const tableName = searchParams.get('table');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // 验证表名
    if (tableName && !isValidTableName(tableName)) {
      return addCorsHeaders(NextResponse.json({ error: '无效的表名' }, { status: 400 }));
    }

    return new Promise((resolve) => {
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
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

export async function POST(request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'database', 'database.sqlite');
    
    if (!fs.existsSync(dbPath)) {
      return addCorsHeaders(NextResponse.json({ error: '数据库文件不存在' }, { status: 404 }));
    }

    const { sql } = await request.json();
    
    if (!sql || typeof sql !== 'string') {
      return addCorsHeaders(NextResponse.json({ error: '无效的SQL查询' }, { status: 400 }));
    }

    // 只允许SELECT查询
    if (!sql.trim().toLowerCase().startsWith('select')) {
      return addCorsHeaders(NextResponse.json({ error: '只允许SELECT查询' }, { status: 400 }));
    }

    return new Promise((resolve) => {
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('数据库打开失败:', err);
          resolve(addCorsHeaders(NextResponse.json({ error: '无法打开数据库' }, { status: 500 })));
          return;
        }

        const startTime = Date.now();
        db.all(sql, [], (err, rows) => {
          db.close();
          if (err) {
            console.error('SQL查询失败:', err);
            resolve(addCorsHeaders(NextResponse.json({ error: 'SQL查询失败: ' + err.message }, { status: 500 })));
            return;
          }

          const executionTime = Date.now() - startTime;
          resolve(addCorsHeaders(NextResponse.json({
            data: rows,
            count: rows.length,
            executionTime: `${executionTime}ms`,
            sql: sql
          })));
        });
      });
    });
  } catch (error) {
    console.error('SQL查询出错:', error);
    return addCorsHeaders(NextResponse.json({ error: 'SQL查询失败' }, { status: 500 }));
  }
} 