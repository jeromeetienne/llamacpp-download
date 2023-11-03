# llama-cpp Download
[llama-cpp](https://github.com/ggerganov/llama.cpp) is a project to run models locally on your computer.
But downloading models is a bit of a pain. This package is here to help you with that.

It finds the largest model you can run on your computer, and download it for you.
It leverage the excelent [TheBloke's HuggingFace models](https://huggingface.co/TheBloke) to do so.

## Features to implement
- find the largest model i can run
  - dychotomy + download + validate ?
- download the largest model i can run for a specific computer
  - 
- improve the search capability
- validate a downloaded model can run
  - download the model
  - use node-llama-cpp chat on it

## Usage

Download "zephyr-7B-alpha-GGUF" model with quantisation "Q6_K"

```
npx llamacpp-download -m TheBloke/zephyr-7B-alpha-GGUF -q Q6_K
```

## How to Install
This package is published on npmjs.com [here](https://www.npmjs.com/package/llamacpp-download), nevertheless most people don't need to install it. because it is meant to be used with npx.

```
npm install llamacpp-download
```

You need to have [wget](https://www.gnu.org/software/wget/) installed on your system.

## How to Publish

Here this is a reminder for [myself](https://github.com/jeromeetienne) on how to publish this package.

```
npm login
npm run release
```

Internally it use [np](https://www.npmjs.com/package/np) to publish the package. It will ask you some questions (e.g. version number), 
will do a bunch of checks and then it will publish it. See this [article](https://zellwk.com/blog/publish-to-npm/) for more details.