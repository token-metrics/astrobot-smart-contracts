# Overview

Astrobot NFT and sale contract.

# Commands

Please configure env file first before running commands. Try running some of the following tasks:

Compile contracts

```shell
npx hardhat compile
```

Run test cases

```shell
npx hardhat test
```

Deploy contracts

```shell
npx hardhat run scripts/deploy.js --network kovan
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
npx hardhat run --network kovan scripts/deploy.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
