import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

interface EarliestDateResult {
  earliestDate: string | null;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { database, databases } = await request.json();
    
    if (database && database !== 'all') {
      // 查询单个数据库
      const result = await getEarliestDateFromDatabase(database);
      return NextResponse.json(result);
    } else if (databases && Array.isArray(databases)) {
      // 查询多个数据库
      const results = await Promise.all(
        databases.map(async (dbPath: string) => {
          try {
            const result = await getEarliestDateFromDatabase(dbPath);
            return result.earliestDate;
          } catch (error) {
            console.warn(`获取数据库 ${dbPath} 最早日期失败:`, error);
            return null;
          }
        })
      );
      
      // 找到所有数据库中最早的日期
      const validDates = results.filter(date => date !== null);
      const earliestDate = validDates.length > 0 
        ? validDates.reduce((earliest, current) => 
            new Date(current!) < new Date(earliest!) ? current : earliest
          )
        : null;
      
      return NextResponse.json({ earliestDate });
    } else {
      return NextResponse.json({ 
        error: '请提供 database 或 databases 参数' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('获取最早日期时出错:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '获取最早日期失败' 
    }, { status: 500 });
  }
}

async function getEarliestDateFromDatabase(databasePath: string): Promise<EarliestDateResult> {
  return new Promise((resolve, reject) => {
    // 检查文件是否存在
    if (!fs.existsSync(databasePath)) {
      resolve({ earliestDate: null, error: `数据库文件不存在: ${databasePath}` });
      return;
    }

    const db = new Database(databasePath, (err) => {
      if (err) {
        resolve({ earliestDate: null, error: `无法打开数据库: ${err.message}` });
        return;
      }

      // 查询最早的时间戳，优先使用 postDate，如果为空则使用 createTime
      const query = `
        SELECT 
          MIN(
            CASE 
              WHEN postDate IS NOT NULL AND postDate != '' AND postDate != 'NULL' THEN 
                CASE 
                  WHEN CAST(postDate AS INTEGER) > 9999999999 THEN CAST(postDate AS INTEGER)
                  ELSE CAST(postDate AS INTEGER) * 1000
                END
              WHEN createTime IS NOT NULL AND createTime != '' AND createTime != 'NULL' THEN 
                CASE 
                  WHEN CAST(createTime AS INTEGER) > 9999999999 THEN CAST(createTime AS INTEGER)
                  ELSE CAST(createTime AS INTEGER) * 1000
                END
              ELSE NULL
            END
          ) as earliest_timestamp
        FROM contents
        WHERE (postDate IS NOT NULL AND postDate != '' AND postDate != 'NULL')
           OR (createTime IS NOT NULL AND createTime != '' AND createTime != 'NULL')
      `;

      db.get(query, (err, row: any) => {
        db.close();
        
        if (err) {
          resolve({ earliestDate: null, error: `查询失败: ${err.message}` });
          return;
        }

        const earliestTimestamp = row?.earliest_timestamp;
        if (earliestTimestamp) {
          // 将时间戳转换为日期字符串（已经是毫秒时间戳）
          const date = new Date(earliestTimestamp);
          const earliestDate = date.toISOString().split('T')[0];
          resolve({ earliestDate });
        } else {
          resolve({ earliestDate: null });
        }
      });
    });
  });
} 