// 定义提取函数
function extractTweetsAndComments() {
    const tweets = [];

    // 查找推文元素（基于 X 2025 年的 DOM 结构，可能需调整）
    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');

    tweetElements.forEach(tweet => {
        try {
            // 提取推文内容
            const content = tweet.querySelector('div[data-testid="tweetText"]')?.innerText || '';

            // 提取用户名
            const username = tweet.querySelector('a[role="link"] div[dir="ltr"] span')?.innerText || '';

            // 提取时间
            const timestamp = tweet.querySelector('time')?.getAttribute('datetime') || '';

            // 提取推文 ID
            const tweetLink = tweet.querySelector('a[href*="/status/"]')?.href || '';
            const tweetId = tweetLink.match(/\/status\/(\d+)/)?.[1] || '';

            // 提取评论（可能需要点击“查看更多评论”触发动态加载）
            const comments = [];
            const commentElements = tweet.querySelectorAll('div[data-testid="reply"]');
            commentElements.forEach(comment => {
                const commentText = comment.querySelector('div[data-testid="tweetText"]')?.innerText || '';
                const commentUser = comment.querySelector('a[role="link"] div[dir="ltr"] span')?.innerText || '';
                if (commentText && commentUser) {
                    comments.push({ user: commentUser, text: commentText }); // 修复：分开存储用户名和评论内容
                }
            });

                // 提取资源（文章、YouTube 链接等）
                const resources = [];
            
                // 1. 提取卡片链接（文章、YouTube 等）
                const cardElements = tweet.querySelectorAll('a[role="link"][href*="http"]');
                cardElements.forEach(card => {
                    const url = card.href || '';
                    const title = card.querySelector('span')?.innerText || '';
                    let type = 'unknown';
                    
                    // 判断资源类型
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        type = 'youtube';
                    } else if (url.match(/^https?:\/\/(?!x\.com).*/)) {
                        type = 'article'; // 非 X 的外部链接视为文章
                    }
                    
                    if (url && type !== 'unknown') {
                        resources.push({ type, url, title });
                    }
                });
                
                // 2. 提取纯文本中的链接（正则匹配）
                const textLinks = content.match(/(https?:\/\/[^\s]+)/g) || [];
                textLinks.forEach(url => {
                    let type = 'unknown';
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        type = 'youtube';
                    } else if (url.match(/^https?:\/\/(?!x\.com).*/)) {
                        type = 'article';
                    }
                    
                    if (type !== 'unknown' && !resources.some(r => r.url === url)) {
                        resources.push({ type, url, title: url }); // 纯文本链接无标题
                    }
                });
                
                // 3. 提取其他图片（非文章封面）
                const imageElements = tweet.querySelectorAll('img[src*="media"][src*="pbs.twimg.com"]:not([src*="profile_images"])');
                imageElements.forEach(img => {
                    const imageUrl = img.src;
                    if (!resources.some(r => r.coverImage === imageUrl || r.url === imageUrl)) {
                        resources.push({ type: 'image', url: imageUrl, title: img.alt || '' });
                    }
                });

            // 构造推文对象
            tweets.push({
                url: tweetLink,
                tweetId,
                authors:username.trim()?[username.trim()]:[],
                postDate:(new Date(timestamp)).getTime(),
                content,
                comments,
                resources
            });
        } catch (e) {
            console.error('Error extracting tweet:', e);
        }
    });

    // 输出到控制台或保存
    console.log('Extracted Tweets:', tweets);
    return tweets;
}

// 自动滚动函数
function autoScroll(durationMs) {
    return new Promise(resolve => {
        const startTime = Date.now();
        const scrollInterval = setInterval(() => {
            // 每次滚动到底部
            window.scrollTo(0, document.body.scrollHeight);

            // 检查是否超过指定时间（10秒）
            if (Date.now() - startTime >= durationMs) {
                clearInterval(scrollInterval);
                resolve();
            }
        }, 1000); // 每 1000ms 滚动一次，留时间加载内容
    });
}

// 主函数：滚动 10 秒后提取推文
async function main() {
    console.log('Starting scroll for 10 seconds...');
    await autoScroll(10000); // 滚动 10 秒
    console.log('Scroll finished, extracting tweets...');
    return extractTweetsAndComments();
}

module.exports = {
    getContents: async() => {
        return await main();
    }
};