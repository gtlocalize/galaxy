module.exports = {
  apps: [
    {
      name: 'galaxy-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: '/opt/galaxy-codex/galaxy-codex',
    },
    {
      name: 'galaxy-backend',
      script: 'server.js',
      cwd: '/opt/galaxy-codex/galaxy-codex',
      env: {
        NODE_ENV: 'production',
        PORT: '3005',
      },
    },
  ],
};
