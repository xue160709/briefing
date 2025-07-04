import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import sqlite3 from 'sqlite3';

interface Params {
  params: {
    database: string;
  };
}

// 添加CORS头部的辅助函数
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// 验证SQL查询是否安全（只允许SELECT查询）
function isValidSelectQuery(sql: string): boolean {
  const trimmedSql = sql.trim().toLowerCase();
  return trimmedSql.startsWith('select') && 
         !trimmedSql.includes('drop') && 
         !trimmedSql.includes('delete') && 
         !trimmedSql.includes('update') && 
         !trimmedSql.includes('insert') && 
         !trimmedSql.includes('alter') && 
         !trimmedSql.includes('create');
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function POST(request: NextRequest, { params }: Params) {
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

    const body = await request.json();
    const { sql } = body;

    if (!sql || typeof sql !== 'string') {
      return addCorsHeaders(NextResponse.json({ error: '请提供有效的SQL查询' }, { status: 400 }));
    }

    // 验证SQL查询安全性
    if (!isValidSelectQuery(sql)) {
      return addCorsHeaders(NextResponse.json({ error: '只允许SELECT查询' }, { status: 400 }));
    }

    return new Promise((resolve) => {
      const db = new sqlite3.Database(fullDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('数据库打开失败:', err);
          resolve(addCorsHeaders(NextResponse.json({ error: '无法打开数据库' }, { status: 500 })));
          return;
        }

        const startTime = Date.now();
        
        db.all(sql, [], (err, rows) => {
          const executionTime = Date.now() - startTime;
          db.close();
          
          if (err) {
            console.error('SQL查询失败:', err);
            resolve(addCorsHeaders(NextResponse.json({ 
              error: 'SQL查询失败', 
              details: err.message 
            }, { status: 500 })));
            return;
          }

          resolve(addCorsHeaders(NextResponse.json({ 
            data: rows,
            count: rows.length,
            executionTime: executionTime + 'ms',
            sql: sql
          })));
        });
      });
    });
  } catch (error) {
    console.error('查询处理出错:', error);
    return addCorsHeaders(NextResponse.json({ error: '查询处理失败' }, { status: 500 }));
  }
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
    const sql = searchParams.get('sql');

    if (!sql) {
      return addCorsHeaders(NextResponse.json({ error: '请提供SQL查询参数' }, { status: 400 }));
    }

    // 验证SQL查询安全性
    if (!isValidSelectQuery(sql)) {
      return addCorsHeaders(NextResponse.json({ error: '只允许SELECT查询' }, { status: 400 }));
    }

    return new Promise((resolve) => {
      const db = new sqlite3.Database(fullDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('数据库打开失败:', err);
          resolve(addCorsHeaders(NextResponse.json({ error: '无法打开数据库' }, { status: 500 })));
          return;
        }

        const startTime = Date.now();
        
        db.all(sql, [], (err, rows) => {
          const executionTime = Date.now() - startTime;
          db.close();
          
          if (err) {
            console.error('SQL查询失败:', err);
            resolve(addCorsHeaders(NextResponse.json({ 
              error: 'SQL查询失败', 
              details: err.message 
            }, { status: 500 })));
            return;
          }

          resolve(addCorsHeaders(NextResponse.json({ 
            data: rows,
            count: rows.length,
            executionTime: executionTime + 'ms',
            sql: sql
          })));
        });
      });
    });
  } catch (error) {
    console.error('查询处理出错:', error);
    return addCorsHeaders(NextResponse.json({ error: '查询处理失败' }, { status: 500 }));
  }
} 