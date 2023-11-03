// node imports
import ChildProcess from 'child_process';
import Path from 'path'
import Fs from 'fs'

// npm imports
import CliColor from 'cli-color'
import * as HfHub from "@huggingface/hub";

export default class Utils {

        static checkApiKey() {
                // sanity check - make sure the HUGGINGFACEHUB_API_KEY environment variable is set
                if (process.env.HUGGINGFACEHUB_API_KEY) return
                throw new Error('Please set the HUGGINGFACEHUB_API_KEY environment variable')
        }

        static getCredentials() {
                Utils.checkApiKey()
                const HUGGINGFACEHUB_API_KEY = /** @type {string} */(process.env.HUGGINGFACEHUB_API_KEY)
                const credentials = { accessToken: HUGGINGFACEHUB_API_KEY }
                return credentials
        }
        
        static async modelList() {
                // get all models
                const modelList = /** @type {HfHub.ModelEntry[]} */([])
                for await (const model of HfHub.listModels({ search: { owner: 'TheBloke' } })) {
                        modelList.push(model)
                }
                return modelList
        }
        /**
         * 
         * @param {string} modelName 
         * @returns 
         */
        static async fileList(modelName) {
                const repoDesignation = /** @type {HfHub.RepoDesignation} */({
                        type: "model",
                        name: modelName
                })
                const fileEntries = /** @type {HfHub.ListFileEntry[]} */([])
                for await (const fileEntry of HfHub.listFiles({ repo: repoDesignation })) {
                        fileEntries.push(fileEntry)
                }

                return fileEntries
        }
        /**
         * 
         * @param {string} srcUrl 
         * @param {string} dstPath 
         * @param {number} finalFileSize
         * @returns {Promise<void>}
         */
        static async downloadFile(srcUrl, dstPath, finalFileSize) {
                let updateCounter = 0
                let updateLastSize = 0
                let updateLastTimeSeconds = null
                let estimatedSpeed = 0
                return new Promise((resolve, reject) => {
                        // run 'wget -c' command for srcUrl and run it with node.js spawn function        
                        const wget = ChildProcess.spawn('wget', ['-c', srcUrl, '-O', dstPath]);
                        // wget.stdout.on('data', (data) => {
                        //         console.log(`stdout: ${data}`);
                        // });

                        wget.stderr.on('data', async (data) => {
                                const deltaSeconds = Date.now()/1000 - updateLastTimeSeconds
                                if (updateLastTimeSeconds !== null && deltaSeconds < 0.5) return
                                await dumpUpdate()
                        });
                        wget.on('close', async (code) => {
                                // console.log(`child process exited with code ${code}`);

                                await dumpUpdate()
                                resolve()
                        });
                })

                return
                async function dumpUpdate() {

                        // get file size of dstPath
                        const stats = await Fs.promises.stat(dstPath)
                        const downloadedSize = stats.size

                        // handle updateLastTime
                        if (updateLastTimeSeconds !== null) {
                                const timeDiffSeconds = Date.now()/1000 - updateLastTimeSeconds
                                if (timeDiffSeconds > 0) {
                                        const lastSpeed = (downloadedSize - updateLastSize) / timeDiffSeconds
                                        const tweenFactor = 0.1
                                        estimatedSpeed = (lastSpeed - estimatedSpeed) * tweenFactor + estimatedSpeed * (1 - tweenFactor)
                                }
                        }
                        updateLastTimeSeconds = Date.now()/1000
                        updateLastSize = downloadedSize

                        process.stdout.write(`\r`)
                        process.stdout.write(`${CliColor.cyan(Path.basename(dstPath))} \
${(downloadedSize / 1024 / 1024).toFixed(2)}-MByte \
${(downloadedSize / finalFileSize * 100).toFixed(2)}% \
${(estimatedSpeed / 1024 / 1024).toFixed(2)}-MByte/s`)
                }
        }
}