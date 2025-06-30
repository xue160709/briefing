import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

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

export async function GET() {
  try {
    const sqlDir = path.join(process.cwd(), 'SQL');
    
    if (!fs.existsSync(sqlDir)) {
      return NextResponse.json({ error: 'SQL目录不存在' }, { status: 404 });
    }

    const databases: Array<{
      category: string;
      files: Array<{
        name: string;
        path: string;
        size: number;
        modified: string;
      }>;
    }> = [];

    const categories = fs.readdirSync(sqlDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const category of categories) {
      const categoryPath = path.join(sqlDir, category);
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.sqlite'))
        .map(file => {
          const filePath = path.join(categoryPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: path.join(category, file),
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        });

      if (files.length > 0) {
        databases.push({
          category,
          files
        });
      }
    }

    return addCorsHeaders(NextResponse.json({ databases }));
  } catch (error) {
    console.error('获取数据库列表时出错:', error);
    return addCorsHeaders(NextResponse.json({ error: '获取数据库列表失败' }, { status: 500 }));
  }
} 