import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

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

interface QueryRequest {
  database: string;
  query: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();
    const { database, query } = body;

    if (!database || !query) {
      return addCorsHeaders(NextResponse.json(
        { error: '数据库路径和查询语句都是必需的' },
        { status: 400 }
      ));
    }

    // 构建数据库文件的完整路径
    const dbPath = path.join(process.cwd(), 'SQL', database);
    
    // 检查数据库文件是否存在
    if (!fs.existsSync(dbPath)) {
      return addCorsHeaders(NextResponse.json(
        { error: '数据库文件不存在' },
        { status: 404 }
      ));
    }

    // 验证SQL查询（基本的安全检查）
    const trimmedQuery = query.trim().toLowerCase();
    
    // 只允许SELECT查询，防止修改数据
    if (!trimmedQuery.startsWith('select') && 
        !trimmedQuery.startsWith('pragma') && 
        !trimmedQuery.startsWith('explain')) {
      return addCorsHeaders(NextResponse.json(
        { error: '出于安全考虑，只允许执行 SELECT、PRAGMA 和 EXPLAIN 查询' },
        { status: 400 }
      ));
    }

    // 记录查询开始时间
    const startTime = Date.now();

    // 执行查询
    const result = await executeQuery(dbPath, query);
    
    // 计算执行时间
    const executionTime = Date.now() - startTime;

    return addCorsHeaders(NextResponse.json({
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rows.length,
      executionTime
    }));

  } catch (error) {
    console.error('SQL查询错误:', error);
    
    // 根据错误类型返回不同的错误信息
    if (error instanceof Error) {
      if (error.message.includes('SQLITE_ERROR')) {
        return addCorsHeaders(NextResponse.json(
          { error: `SQL语法错误: ${error.message}` },
          { status: 400 }
        ));
      } else if (error.message.includes('no such table')) {
        return addCorsHeaders(NextResponse.json(
          { error: `表不存在: ${error.message}` },
          { status: 400 }
        ));
      } else if (error.message.includes('no such column')) {
        return addCorsHeaders(NextResponse.json(
          { error: `列不存在: ${error.message}` },
          { status: 400 }
        ));
      }
    }
    
    return addCorsHeaders(NextResponse.json(
      { error: '查询执行失败，请检查SQL语句' },
      { status: 500 }
    ));
  }
}

function executeQuery(dbPath: string, query: string): Promise<{ columns: string[], rows: any[][] }> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(new Error(`无法打开数据库: ${err.message}`));
        return;
      }
    });

    db.all(query, [], (err, rows) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }

      // 获取列名
      let columns: string[] = [];
      if (rows && rows.length > 0) {
        const firstRow = rows[0] as Record<string, any>;
        columns = Object.keys(firstRow);
      }

      // 转换数据为二维数组格式
      const dataRows = rows.map(row => {
        const rowObj = row as Record<string, any>;
        return columns.map(col => rowObj[col]);
      });

      db.close((closeErr) => {
        if (closeErr) {
          console.error('关闭数据库时出错:', closeErr);
        }
      });

      resolve({
        columns,
        rows: dataRows
      });
    });
  });
} 