const DEFAULT_DASHBOARD_URL = 'https://ibyron17.github.io/market-dashboard/';

function resolveDashboardUrl(env = process.env) {
  const repoSlug = env.GITHUB_REPOSITORY;
  if (!repoSlug) {
    return DEFAULT_DASHBOARD_URL;
  }

  const [owner, repo] = repoSlug.split('/');
  return `https://${owner}.github.io/${repo}/`;
}

module.exports = { resolveDashboardUrl, DEFAULT_DASHBOARD_URL };
