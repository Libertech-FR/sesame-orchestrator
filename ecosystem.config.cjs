// const isClusterMode = process.env.CLUSTER_MODE === 'true'
const isClusterMode = false

console.log('isClusterMode', isClusterMode)

module.exports = {
  apps: [
    {
      name: 'NestAppName',
      port: '4000',
      instances : isClusterMode ? '0' : '1',
      exec_mode: isClusterMode ? 'cluster' : 'fork',
      cwd: './apps/api',
      script: './dist/main.js',
      env: { ...process.env },
    },
    {
      name: 'NuxtAppName',
      port: '3000',
      instances : isClusterMode ? '0' : '1',
      exec_mode : isClusterMode ? 'cluster' : 'fork',
      cwd: './apps/web',
      script: './start.mjs',
      env: { ...process.env },
    },
  ],
}
