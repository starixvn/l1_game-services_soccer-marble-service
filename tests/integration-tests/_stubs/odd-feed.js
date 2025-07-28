import { spawn } from 'child_process';

export class OddFeedApiService {
    process = null;
    baseUrl = "http://localhost:5999";

    async start() {
        this.process = spawn("node", ["tests/integration-tests/game-service-setup/odd-feed-api.js"]);
        this.process.stdout?.on('data', (data) => {
            const output = data.toString().trim();
            console.log(`API stdout: ${output}`);
          });
      
          this.process.stderr?.on('data', (data) => {
            console.error(`API stderr: ${data.toString().trim()}`);
          });
      
          this.process.on('exit', (code) => {
            console.log(`API service exited with code ${code}`);
            this.process = null;
          });

        return this.waitForReady();
    }

    async stop() {
        if (!this.process) {
            console.log('API service is not running');
            return;
          }
      
          console.log('Stopping API service...');
          
          try {
            
            if (this.process.stdout) {
              this.process.stdout.removeAllListeners();
            }
            if (this.process.stderr) {
              this.process.stderr.removeAllListeners();
            }
            this.process.removeAllListeners();
            
            this.process.kill('SIGTERM');
            
            await new Promise((resolve) => {
              if (!this.process) {
                resolve();
                return;
              }
              
              const forceKillTimeout = setTimeout(() => {
                if (this.process) {
                  console.log('Process did not exit gracefully, force killing');
                  this.process.kill('SIGKILL');
                  this.process = null;
                }
                resolve();
              }, 5000);
              
              this.process.once('exit', () => {
                clearTimeout(forceKillTimeout);
                this.process = null;
                resolve();
              });
            });
            
            console.log('API service stopped');
          } catch (error) {
            console.error('Error stopping API service:', error);
            if (this.process) {
                this.process.kill('SIGKILL');
                this.process = null;
            }
          }
    }

    async waitForReady(maxRetries = 5, retryInterval = 500) {
        const totalWaitTime = maxRetries * retryInterval / 1000;
        console.log(`Waiting for API to be ready (max ${totalWaitTime}s)...`);

        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const checkServer = async () => {
              if (!this.process || this.process.killed) {
                return reject(new Error('API service process is not running'));
              }
              
              attempts++;
              
              const rootResponse = await fetch(this.baseUrl).catch(() => null);
              
              if (rootResponse?.ok) {
                return resolve();
              }
              
              console.log(`Trying to healthcheck to ${this.baseUrl}/api/healthcheck...`);
              const healthResponse = await fetch(`${this.baseUrl}/api/healthcheck`).catch(() => null);
              
              if (healthResponse?.ok) {
                console.log('API service is ready at health endpoint!');
                return resolve();
              }
              
              if (attempts % 5 === 0) {
                console.log(`Still waiting for API to be ready... (${attempts}/${maxRetries})`);
              }
              
              if (attempts >= maxRetries) {
                return reject(new Error(`API service did not start within ${totalWaitTime} seconds`));
              }
              
              setTimeout(checkServer, retryInterval);
            };
            
            checkServer();
          });
        }
    }
