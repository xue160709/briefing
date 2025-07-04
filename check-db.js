const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'appso', 'appso.sqlite');
console.log('检查数据库:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('数据库连接成功');
});

// 获取所有表名
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('获取表列表失败:', err);
    return;
  }
  
  console.log('数据库中的表:');
  tables.forEach(table => {
    console.log('- ' + table.name);
  });
  
  if (tables.length === 0) {
    console.log('数据库中没有表');
    db.close();
    return;
  }
  
  // 对每个表获取结构信息
  let completed = 0;
  tables.forEach(table => {
    console.log(`\n表 "${table.name}" 的结构:`);
    db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
      if (err) {
        console.error(`获取表 ${table.name} 结构失败:`, err);
      } else {
        columns.forEach(col => {
          console.log(`  ${col.name} (${col.type}) ${col.pk ? '[主键]' : ''}`);
        });
        
        // 获取表中的数据条数
        db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
          if (err) {
            console.error(`获取表 ${table.name} 数据条数失败:`, err);
          } else {
            console.log(`  数据条数: ${row.count}`);
          }
          
          completed++;
          if (completed === tables.length) {
            db.close();
          }
        });
      }
    });
  });
}); 