# Appso 数据库 API 文档

这些API接口用于访问和查询appso目录下的SQLite数据库。

## 基础路径
所有API的基础路径为：`/api/appso`

## 1. 获取数据库列表

### 端点
```
GET /api/appso
```

### 参数
- `action` (可选): 操作类型，默认为 "list"

### 响应示例
```json
{
  "databases": [
    {
      "name": "appso.sqlite",
      "size": 57344,
      "modified": "2024-01-20T10:30:00.000Z",
      "path": "appso.sqlite"
    }
  ],
  "total": 1
}
```

## 2. 操作特定数据库

### 端点
```
GET /api/appso/{database}
```

### 参数
- `database`: 数据库文件名（必须以.sqlite结尾）
- `action`: 操作类型
  - `tables`: 获取所有表名（默认）
  - `schema`: 获取表结构（需要table参数）
  - `data`: 获取表数据（需要table参数）
  - `info`: 获取数据库基本信息
- `table`: 表名（当action为schema或data时必需）
- `limit`: 数据条数限制（默认100，最大1000）
- `offset`: 数据偏移量（默认0）

### 响应示例

#### 获取表列表
```
GET /api/appso/appso.sqlite?action=tables
```
```json
{
  "tables": [
    {"name": "users"},
    {"name": "posts"},
    {"name": "comments"}
  ]
}
```

#### 获取表结构
```
GET /api/appso/appso.sqlite?action=schema&table=users
```
```json
{
  "schema": [
    {
      "cid": 0,
      "name": "id",
      "type": "INTEGER",
      "notnull": 1,
      "dflt_value": null,
      "pk": 1
    },
    {
      "cid": 1,
      "name": "username",
      "type": "TEXT",
      "notnull": 1,
      "dflt_value": null,
      "pk": 0
    }
  ]
}
```

#### 获取表数据
```
GET /api/appso/appso.sqlite?action=data&table=users&limit=10&offset=0
```
```json
{
  "data": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com"
    }
  ],
  "total": 100,
  "limit": 10,
  "offset": 0
}
```

#### 获取数据库信息
```
GET /api/appso/appso.sqlite?action=info
```
```json
{
  "database": "appso.sqlite",
  "tables": [
    {
      "name": "users",
      "count": 100,
      "sql": "CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL)"
    }
  ],
  "totalTables": 1
}
```

## 3. 自定义SQL查询

### 端点
```
POST /api/appso/{database}/query
GET /api/appso/{database}/query
```

### POST 请求
#### 请求体
```json
{
  "sql": "SELECT * FROM users WHERE id > 10 LIMIT 5"
}
```

#### 响应示例
```json
{
  "data": [
    {
      "id": 11,
      "username": "user11",
      "email": "user11@example.com"
    }
  ],
  "count": 1,
  "executionTime": "15ms",
  "sql": "SELECT * FROM users WHERE id > 10 LIMIT 5"
}
```

### GET 请求
```
GET /api/appso/appso.sqlite/query?sql=SELECT COUNT(*) as total FROM users
```

## 安全限制

1. **只读访问**: 所有API都以只读模式打开数据库
2. **SQL限制**: 自定义查询只允许SELECT语句，禁止：
   - DROP
   - DELETE
   - UPDATE
   - INSERT
   - ALTER
   - CREATE
3. **路径验证**: 严格验证数据库文件路径，防止目录遍历攻击
4. **表名验证**: 表名只允许字母、数字和下划线
5. **数据限制**: 单次查询最多返回1000条记录

## 错误处理

所有API都会返回标准的错误响应：

```json
{
  "error": "错误描述",
  "details": "详细错误信息（可选）"
}
```

常见错误码：
- 400: 请求参数错误
- 404: 数据库文件不存在
- 500: 服务器内部错误

## 使用示例

### JavaScript/TypeScript
```javascript
// 获取数据库列表
const databases = await fetch('/api/appso').then(res => res.json());

// 获取表列表
const tables = await fetch('/api/appso/appso.sqlite?action=tables').then(res => res.json());

// 执行自定义查询
const result = await fetch('/api/appso/appso.sqlite/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sql: 'SELECT * FROM users LIMIT 10'
  })
}).then(res => res.json());
```

### cURL
```bash
# 获取数据库列表
curl http://localhost:3000/api/appso

# 获取表数据
curl "http://localhost:3000/api/appso/appso.sqlite?action=data&table=users&limit=5"

# 执行自定义查询
curl -X POST http://localhost:3000/api/appso/appso.sqlite/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT COUNT(*) as total FROM users"}'
``` 