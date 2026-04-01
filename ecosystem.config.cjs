module.exports = {
  apps: [
    {
      name: 'lab-booking',
      script: 'node_modules/.bin/tsx',
      args: 'packages/server/src/index.ts',
      cwd: '/root/lab-booking',
      node_args: '--max-old-space-size=384',
      watch: false,
      env: {
        NODE_ENV: 'production',
        TSX_TSCONFIG_PATH: 'packages/server/tsconfig.json',
      },
      max_memory_restart: '400M',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
