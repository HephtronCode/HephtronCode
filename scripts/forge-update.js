const fs = require('fs');
const path = require('path');

async function updateForge() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const USERNAME = 'HephtronCode';
  const README_PATH = path.join(__dirname, '..', 'README.md');

  console.log('--- The Astral Forge: Initiating Transmutation ---');

  try {
    // 1. Fetch recent public events
    const response = await fetch(`https://api.github.com/users/${USERNAME}/events/public`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'HephtronCode-Forge-Updater'
      }
    });

    if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);

    const events = await response.json();

    // 2. Filter and format events (Top 5 unique PushEvents or CreateEvents)
    const forgeLogs = [];
    const seenRepos = new Set();

    for (const event of events) {
      if (forgeLogs.length >= 5) break;

      const repoName = event.repo.name.replace(`${USERNAME}/`, '');
      
      // Basic event descriptions
      let description = '';
      if (event.type === 'PushEvent') {
        const commitMsg = event.payload.commits[0]?.message || 'Forging new logic';
        // Security: Sanitize and truncate
        const sanitizedMsg = commitMsg.replace(/[<>]/g, '').split('\n')[0].substring(0, 80);
        description = `Committing: *"${sanitizedMsg}"* to **${repoName}**`;
      } else if (event.type === 'CreateEvent') {
        description = `Manifesting new repository: **${repoName}**`;
      } else if (event.type === 'WatchEvent') {
        description = `Gaining inspiration from **${repoName}** (Starred)`;
      }

      if (description && !seenRepos.has(description)) {
        forgeLogs.push(`- ${description}`);
        seenRepos.add(description);
      }
    }

    if (forgeLogs.length === 0) {
      forgeLogs.push('- Currently contemplating the next great transmutation...');
    }

    // 3. Update README
    const readmeContent = fs.readFileSync(README_PATH, 'utf8');
    const forgeRegex = /<!-- FORGE_START -->[\s\S]*<!-- FORGE_END -->/;
    const newForgeSection = `<!-- FORGE_START -->\n${forgeLogs.join('\n')}\n<!-- FORGE_END -->`;

    const updatedReadme = readmeContent.replace(forgeRegex, newForgeSection);
    fs.writeFileSync(README_PATH, updatedReadme);

    console.log('--- Transmutation Complete: The Forge is Cooling ---');
  } catch (error) {
    console.error('!!! Forge Failure:', error.message);
    process.exit(1);
  }
}

updateForge();
