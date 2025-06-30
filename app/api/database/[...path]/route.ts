import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import sqlite3 from 'sqlite3';

interface Params {
  params: {
    path: string[];
  };
}

// 验证表名是否安全（防止SQL注入）
function isValidTableName(tableName: string): boolean {
  // 只允许字母、数字、下划线
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const dbPath = resolvedParams.path.join('/');
    const fullDbPath = path.join(process.cwd(), 'SQL', dbPath);

    // 安全检查：确保路径在SQL目录内
    const sqlDir = path.join(process.cwd(), 'SQL');
    const resolvedPath = path.resolve(fullDbPath);
    if (!resolvedPath.startsWith(path.resolve(sqlDir))) {
      return NextResponse.json({ error: '无效的文件路径' }, { status: 400 });
    }

    if (!fs.existsSync(fullDbPath)) {
      return NextResponse.json({ error: '数据库文件不存在' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'tables';
    const tableName = searchParams.get('table');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // 限制最大1000条
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // 验证表名
    if (tableName && !isValidTableName(tableName)) {
      return NextResponse.json({ error: '无效的表名' }, { status: 400 });
    }

    return new Promise((resolve) => {
      const db = new sqlite3.Database(fullDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('数据库打开失败:', err);
          resolve(NextResponse.json({ error: '无法打开数据库' }, { status: 500 }));
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
                resolve(NextResponse.json({ error: '查询表名失败' }, { status: 500 }));
                return;
              }
              resolve(NextResponse.json({ tables: rows }));
            }
          );
        } else if (action === 'schema' && tableName) {
          // 使用参数化查询获取表结构
          db.all(
            "PRAGMA table_info(" + tableName + ")",
            [],
            (err, rows) => {
              db.close();
              if (err) {
                console.error('查询表结构失败:', err);
                resolve(NextResponse.json({ error: '查询表结构失败' }, { status: 500 }));
                return;
              }
              resolve(NextResponse.json({ schema: rows }));
            }
          );
        } else if (action === 'data' && tableName) {
          // 使用参数化查询获取表数据
          const sql = `SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`;
          db.all(
            sql,
            [limit, offset],
            (err, rows) => {
              if (err) {
                db.close();
                console.error('查询数据失败:', err);
                resolve(NextResponse.json({ error: '查询数据失败' }, { status: 500 }));
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
                    resolve(NextResponse.json({ error: '查询总数失败' }, { status: 500 }));
                    return;
                  }
                  resolve(NextResponse.json({ 
                    data: rows, 
                    total: countRow.count,
                    limit,
                    offset
                  }));
                }
              );
            }
          );
        } else {
          db.close();
          resolve(NextResponse.json({ error: '无效的操作参数' }, { status: 400 }));
        }
      });
    });
  } catch (error) {
    console.error('数据库操作出错:', error);
    return NextResponse.json({ error: '数据库操作失败' }, { status: 500 });
  }
} 