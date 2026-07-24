const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.USERNAME || 'HephtronCode';
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'HephtronCode-Stats-Generator'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`GraphQL error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }
  return data.data;
}

async function getUserStats() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        name
        login
        bio
        avatarUrl
        createdAt
        contributionsCollection {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalRepositoriesWithContributedCommits
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                color
              }
            }
          }
        }
        repositories(first: 100, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
          totalCount
          nodes {
            name
            description
            stargazerCount
            forkCount
            primaryLanguage { name color }
            url
            isFork
            updatedAt
          }
        }
        starredRepositories(first: 100) {
          totalCount
        }
        followers { totalCount }
        following { totalCount }
      }
    }
  `;

  return fetchGraphQL(query, { login: USERNAME });
}

async function getLanguageStats() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        repositories(first: 100, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
          nodes {
            name
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node { name color }
              }
            }
          }
        }
      }
    }
  `;

  return fetchGraphQL(query, { login: USERNAME });
}

function generateOverviewSVG(user) {
  const {
    name, login, bio, avatarUrl, createdAt,
    contributionsCollection,
    repositories, starredRepositories,
    followers, following
  } = user;

  const {
    totalCommitContributions,
    totalIssueContributions,
    totalPullRequestContributions,
    totalPullRequestReviewContributions,
    totalRepositoriesWithContributedCommits,
    contributionCalendar
  } = contributionsCollection;

  const totalContribs = contributionCalendar.totalContributions;
  const totalStars = repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);
  const totalForks = repositories.nodes.reduce((sum, r) => sum + r.forkCount, 0);
  const publicRepos = repositories.totalCount;
  const starredCount = starredRepositories.totalCount;
  const accountAge = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365));

  const width = 800;
  const height = 420;
  const cardWidth = 180;
  const cardHeight = 140;
  const startX = 40;
  const startY = 60;
  const gap = 20;

  const cards = [
    { label: 'Total Commits', value: totalCommitContributions.toLocaleString(), icon: '💾' },
    { label: 'Pull Requests', value: totalPullRequestContributions.toLocaleString(), icon: '🔀' },
    { label: 'Issues', value: totalIssueContributions.toLocaleString(), icon: '🐛' },
    { label: 'PR Reviews', value: totalPullRequestReviewContributions.toLocaleString(), icon: '👁️' },
    { label: 'Total Contributions', value: totalContribs.toLocaleString(), icon: '📊' },
    { label: 'Repos Contributed', value: totalRepositoriesWithContributedCommits.toLocaleString(), icon: '📦' },
    { label: 'Public Repos', value: publicRepos.toLocaleString(), icon: '🌍' },
    { label: 'Total Stars', value: totalStars.toLocaleString(), icon: '⭐' },
    { label: 'Total Forks', value: totalForks.toLocaleString(), icon: '🍴' },
    { label: 'Followers', value: followers.totalCount.toLocaleString(), icon: '👥' },
    { label: 'Following', value: following.totalCount.toLocaleString(), icon: '👤' },
    { label: 'Starred Repos', value: starredCount.toLocaleString(), icon: '❤️' },
    { label: 'Account Age', value: `${accountAge} years`, icon: '🎂' },
    { label: 'Active Days', value: `${contributionCalendar.weeks.length * 7}`, icon: '📅' },
  ];

  let cardHtml = '';
  cards.forEach((card, i) => {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = startX + col * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);

    cardHtml += `
      <g transform="translate(${x}, ${y})">
        <rect width="${cardWidth}" height="${cardHeight}" rx="12" ry="12" fill="#161b22" stroke="#30363d" stroke-width="1"/>
        <text x="${cardWidth / 2}" y="35" text-anchor="middle" font-size="28" font-family="system-ui, sans-serif" fill="#e6edf3">${card.icon}</text>
        <text x="${cardWidth / 2}" y="75" text-anchor="middle" font-size="24" font-weight="700" font-family="system-ui, sans-serif" fill="#00f2fe">${card.value}</text>
        <text x="${cardWidth / 2}" y="110" text-anchor="middle" font-size="11" font-family="system-ui, sans-serif" fill="#8b949e">${card.label}</text>
      </g>
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .bg { fill: #0d1117; }
    .border { fill: none; stroke: #30363d; stroke-width: 1; }
    .header-bg { fill: #161b22; }
    .title { fill: #00f2fe; font-family: system-ui, sans-serif; font-size: 18px; font-weight: 700; }
    .subtitle { fill: #8b949e; font-family: system-ui, sans-serif; font-size: 12px; }
    .bio { fill: #e6edf3; font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.5; }
  </style>
  <rect class="bg" x="0" y="0" width="${width}" height="${height}" rx="12" ry="12"/>
  <rect class="border" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" ry="11.5"/>
  
  <rect class="header-bg" x="0" y="0" width="${width}" height="50" rx="12" ry="12"/>
  <rect x="0" y="50" width="${width}" height="1" fill="#30363d"/>
  
  <text class="title" x="20" y="30">${name || login}</text>
  <text class="subtitle" x="20" y="45">@${login} • ${new Date(createdAt).getFullYear()}–${new Date().getFullYear()}</text>
  
  ${cardHtml}
</svg>`;
}

function generateLanguageSVG(langData) {
  const repos = langData.user.repositories.nodes;
  const langMap = new Map();

  repos.forEach(repo => {
    repo.languages.edges.forEach(({ size, node }) => {
      const existing = langMap.get(node.name) || 0;
      langMap.set(node.name, existing + size);
    });
  });

  const sortedLangs = Array.from(langMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const totalBytes = sortedLangs.reduce((sum, [, size]) => sum + size, 0);

  const width = 420;
  const barHeight = 16;
  const padding = 20;
  const labelWidth = 110;
  const barMaxWidth = width - labelWidth - padding * 2 - 50;
  const height = padding * 2 + 40 + sortedLangs.length * (barHeight + 6);

  let barsHtml = '';
  sortedLangs.forEach(([name, size], i) => {
    const percent = (size / totalBytes * 100).toFixed(1);
    const barWidth = (size / totalBytes) * barMaxWidth;
    const y = padding + 40 + i * (barHeight + 6);
    const color = getLanguageColor(name);

    barsHtml += `
      <text x="${padding + labelWidth - 10}" y="${y + 12}" class="lang-label" text-anchor="end">${name}</text>
      <rect x="${padding + labelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" fill="${color}"/>
      <text x="${padding + labelWidth + barWidth + 8}" y="${y + 12}" class="lang-pct">${percent}%</text>
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .bg { fill: #0d1117; }
    .border { fill: none; stroke: #30363d; stroke-width: 1; }
    .title { fill: #00f2fe; font-family: system-ui, sans-serif; font-size: 14px; font-weight: 700; }
    .lang-label { fill: #8b949e; font-family: system-ui, sans-serif; font-size: 11px; }
    .lang-pct { fill: #e6edf3; font-family: system-ui, sans-serif; font-size: 11px; font-weight: 600; }
  </style>
  <rect class="bg" x="0" y="0" width="${width}" height="${height}" rx="10" ry="10"/>
  <rect class="border" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="9.5" ry="9.5"/>
  <text class="title" x="20" y="28">Top Languages (All Time)</text>
  ${barsHtml}
</svg>`;
}

function getLanguageColor(name) {
  const colors = {
    'TypeScript': '#3178c6',
    'JavaScript': '#f1e05a',
    'Python': '#3572A5',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Java': '#b07219',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'PHP': '#4F5D95',
    'Ruby': '#701516',
    'Swift': '#ffac45',
    'Kotlin': '#F18E33',
    'Dart': '#00B4AB',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'SCSS': '#c6538c',
    'Vue': '#41b883',
    'React': '#61dafb',
    'Svelte': '#ff3e00',
    'SQL': '#e38c00',
    'Shell': '#89e051',
    'Dockerfile': '#384d54',
    'YAML': '#cb171e',
    'JSON': '#292929',
    'Markdown': '#083fa1',
    'Jupyter Notebook': '#DA5B0B'
  };
  return colors[name] || '#8b949e';
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN not set');
    process.exit(1);
  }

  try {
    console.log('Fetching user stats...');
    const userData = await getUserStats();
    
    console.log('Fetching language stats...');
    const langData = await getLanguageStats();

    console.log('Generating SVGs...');
    const overviewSvg = generateOverviewSVG(userData.user);
    const langSvg = generateLanguageSVG(langData);

    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    fs.writeFileSync(path.join(ASSETS_DIR, 'stats-overview.svg'), overviewSvg);
    fs.writeFileSync(path.join(ASSETS_DIR, 'lang-stats.svg'), langSvg);

    console.log('Stats SVGs generated successfully!');
  } catch (error) {
    console.error('Error generating stats:', error.message);
    process.exit(1);
  }
}

main();