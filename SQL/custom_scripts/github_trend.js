function extractGitHubProjectInfo() {
    let docs = document.querySelectorAll('article');
    let projectInfos = [];
    for (let doc of docs) {
        // Find the repository title element
        const titleElement = doc.querySelector('h2.h3 a.Link');

        let stars = doc.querySelector('a[href*="stargazers"]') ? doc.querySelector('a[href*="stargazers"]').textContent.trim() : null,
            forks = doc.querySelector('a[href*="forks"]') ? doc.querySelector('a[href*="forks"]').textContent.trim() : null,
            language = doc.querySelector('span[itemprop="programmingLanguage"]') ? doc.querySelector('span[itemprop="programmingLanguage"]').textContent.trim() : null;

        let description = Array.from(doc.querySelectorAll('p'), p => {
            if (p.parentElement.tagName === 'ARTICLE') return p.textContent
        }).filter(Boolean).join(',').trim() + "\n" + "stars: " + stars + " forks: " + forks + " language: " + language;


        let authors = Array.from(doc.querySelectorAll('img.avatar.avatar-user'), a => {
            return a.alt.trim()
        }).filter(Boolean)

        // Extract the information
        const projectInfo = {
            title: titleElement ? titleElement.textContent.trim().replace(/[\s\n]{3,}/g, ' ') : null,
            description,
            url: titleElement ? titleElement.href : null,
            stars,
            forks,
            authors,
            language
        };

        projectInfos.push(projectInfo);

    }

    return projectInfos;
}


module.exports = {
    getContents: async() => {
        return await extractGitHubProjectInfo();
    }
};