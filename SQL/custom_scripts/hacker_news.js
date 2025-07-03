class HackerNewsAPI {
    constructor() {
        this.baseURL = 'https://hacker-news.firebaseio.com/v0';
    }

    async fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(response.status);
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getItem(id) {
        const url = this.baseURL + '/item/' + id + '.json';
        const item = await this.fetchData(url);
        return {
            ...item,
            postDate: item.time * 1000,
            type: "hacker_news"
        };
    }

    async getNewStories(limit = 50) {
        try {
            const storyIds = await this.fetchData(this.baseURL + '/newstories.json');
            const limitedIds = storyIds.slice(0, limit);
            const stories = await Promise.all(limitedIds.map(id => this.getItem(id)));
            return stories.filter(story => story !== null);
        } catch (error) {
            console.error('Failed to get new stories:', error);
            return [];
        }
    }
};

module.exports = {
    getContents: async() => {
        const hn = new HackerNewsAPI();
        return await hn.getNewStories(15);
    }
};