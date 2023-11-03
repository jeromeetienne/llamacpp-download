#!/usr/bin/env node

/**
 * from https://huggingface.co/docs/huggingface.js/hub/README
 */

// node imports
import Fs from 'fs';
import Path from 'path'

// npm imports
import * as HfHub from "@huggingface/hub";
import CliColor from 'cli-color'
import * as Commander from "commander"


// local imports 
import Utils from '../src/utils.js'

// get __dirname and __filename in esm module
import Url from "url";
const __filename = Url.fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


async function mainAsync() {

	/**
	 * All quantization methods supported by LlamaCpp
	 */
	const quantizationMethods = [
		'Q2_K',
		'Q3_K_S',
		'Q3_K_M',
		'Q3_K_L',
		'Q4_0',
		'Q4_K_S',
		'Q4_K_M',
		'Q5_0',
		'Q5_K_S',
		'Q5_K_M',
		'Q6_K',
		'Q8_0',
	]

	/////////////////////////////////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////
	//	Parse command line
	/////////////////////////////////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	// parse command line
	const cmdline = new Commander.Command()
	cmdline.name(`${Path.basename(__filename)}`)
	const MyPackageJson = JSON.parse(await Fs.promises.readFile(Path.join(__dirname, '../package.json'), 'utf8'))
	cmdline.version(MyPackageJson.version)
	cmdline.description(MyPackageJson.description)

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	command: search
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	cmdline.command('search <queryTerms...>')
		.description('Search the models availables')
		.action(async (queryTerms) => {
			let modelList = await Utils.modelList()
			// filter modelList to keep only llama-cpp models
			modelList = modelList.filter(modelEntry => modelEntry.name.endsWith('-GGUF'))
			// // sort modelList by name
			// modelList.sort((a, b) => a.name.localeCompare(b.name))
			// sort the model list by downloads
			modelList.sort((a, b) => b.downloads - a.downloads)

			// filter modelList to keep only the ones that match the query
			modelList = modelList.filter(modelEntry => {
				let modelSuffix = modelEntry.name.split('/', 2)[1]
				// check all query terms
				for (const queryTerm of queryTerms) {
					if (modelSuffix.toLowerCase().includes(queryTerm.toLowerCase()) === false) {
						return false
					}
				}
				return true
			})

			// display model list
			displayModelList(modelList)
		});

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	command: list
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	
	cmdline.command('list')
		.description('List the models availables')
		.action(async (query) => {
			let modelList = await Utils.modelList()
			// filter modelList to keep only llama-cpp models
			modelList = modelList.filter(modelEntry => modelEntry.name.endsWith('-GGUF'))
			// sort modelList by name
			modelList.sort((a, b) => a.name.localeCompare(b.name))
			// // sort the model list by likes
			// modelList.sort((a, b) => b.likes - a.likes)
			// sort the model list by downloads
			modelList.sort((a, b) => b.downloads - a.downloads)

			// display model list
			displayModelList(modelList)
		});

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	command: download
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	cmdline.command('download <modelName>')
		.description('Download a model for llama-cpp from huggingface.co')
		.option('-s, --maxFileSizeGbyte <number>', 'the maximum size of the file in Gbyte. Used to pick the higuest level of quantization supported.', parseFloat)
		.addOption(new Commander.Option('-q, --quantizationMethod <string>', 'the level of quantization e.g. "Q6_K"').choices(quantizationMethods))
		.action(async (modelName, options) => {
			const realModelName =`TheBloke/${modelName}`
			await doCommandDownload(modelName, {
				maxFileSizeGbyte: options.maxFileSizeGbyte,
				quantizationMethod: options.quantizationMethod
			})
		});

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	parse command line
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// parse command line
	cmdline.parse(process.argv)
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	call main async function (without async prefix because of top level await)
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void mainAsync()


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * @param {string} modelName
 * @param {object} options
 * @param {number=} options.maxFileSizeGbyte
 * @param {string=} options.quantizationMethod
 */
async function doCommandDownload(modelName, options = {}) {

	// get all models
	const modelList = await Utils.modelList()

	// sanity check
	const modelEntry = modelList.find(model => model.name === modelName)
	if (modelEntry === undefined) {
		throw new Error(`Model ${modelName} not found`)
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	pick the file entry to download
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// @ts-ignore
	let fileEntryToDownload =/** @type {HfHub.ListFileEntry}*/(null)
	let fileEntries = await Utils.fileList(modelEntry.name)

	// filter file entries to keep only the ones that are smaller or equal than the maxFileSizeGbyte
	if (options.maxFileSizeGbyte !== undefined) {
		const maxFileSizeByte = options.maxFileSizeGbyte * 1024 * 1024 * 1024
		fileEntries = fileEntries.filter(fileEntry => {
			if (fileEntry.path.endsWith('.gguf') === false) return false
			if (fileEntry.size > maxFileSizeByte) return false
			return true
		})

		if (fileEntries.length === 0) {
			throw new Error(`No file found for model ${modelName} with a size smaller or equal than ${options.maxFileSizeGbyte} Gbyte`)
		} else {
			const lastFileEntry = fileEntries[fileEntries.length - 1]
			const quantizationMethod = lastFileEntry.path.split('.')[1]

			console.log(`Found ${fileEntries.length} quantization level for model ${modelName} with a size smaller or equal than ${options.maxFileSizeGbyte} Gbyte`)
			console.log(`Highest quantization level: ${CliColor.blue(quantizationMethod)}`)
		}

		// sort file entries by size in ascending order
		fileEntries.sort((a, b) => a.size - b.size)
		// pick the last file entry - aka the largest we can handle
		fileEntryToDownload = fileEntries[fileEntries.length - 1]
	} else if (options.quantizationMethod !== undefined) {
		fileEntries = fileEntries.filter(fileEntry => {
			const quantizationMethod = fileEntry.path.split('.')[1]
			if (quantizationMethod !== options.quantizationMethod) return false
			return true
		})

		if (fileEntries.length === 0) {
			throw new Error(`No file found for model ${modelName} with a quantization method ${options.quantizationMethod}`)
		}

		fileEntryToDownload = fileEntries[0]
	} else {
		throw new Error(`Either --maxFileSizeGbyte or --quantizationMethod must be specified`)
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	display info
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// display info
	const modelPageUrl = `https://huggingface.co/${modelName}`
	const quantizationMethod = fileEntryToDownload.path.split('.')[1]
	console.log('Model Name:', CliColor.blue(modelName))
	console.log('- webpage:', CliColor.blue(modelPageUrl))
	console.log(`- quantization method: ${CliColor.blue(quantizationMethod)}`)

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	download the file entry
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// download file entry
	const downloadUrl = `https://huggingface.co/${modelName}/resolve/main/${fileEntryToDownload.path}`
	const dstPath = Path.join(__dirname, `../data/models/${fileEntryToDownload.path}`)
	await Utils.downloadFile(downloadUrl, dstPath, fileEntryToDownload.size)
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * 
 * @param {HfHub.ModelEntry[]} modelList 
 */
async function displayModelList(modelList){
	for (const modelEntry of modelList) {
		const modelSuffix = modelEntry.name.split('/', 2)[1]
		console.log(`- ${CliColor.blue(modelSuffix)}`)
		console.log(`  - likes: ${CliColor.blue(modelEntry.likes)}`)
		console.log(`  - downloads: ${CliColor.blue(modelEntry.downloads)}`)
	}
}