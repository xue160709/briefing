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

export async function GET(request: NextRequest) {
  try {
    const appsoDir = path.join(process.cwd(), 'appso');
    
    if (!fs.existsSync(appsoDir)) {
      return addCorsHeaders(NextResponse.json({ error: 'appso目录不存在' }, { status: 404 }));
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    if (action === 'list') {
      // 获取appso目录下的所有sqlite文件
      const files = fs.readdirSync(appsoDir)
        .filter(file => file.endsWith('.sqlite'))
        .map(file => {
          const filePath = path.join(appsoDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            path: file
          };
        });

      return addCorsHeaders(NextResponse.json({ 
        databases: files,
        total: files.length 
      }));
    }

    return addCorsHeaders(NextResponse.json({ error: '无效的操作参数' }, { status: 400 }));
  } catch (error) {
    console.error('获取appso数据库列表时出错:', error);
    return addCorsHeaders(NextResponse.json({ error: '获取数据库列表失败' }, { status: 500 }));
  }
} 