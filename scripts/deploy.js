require("dotenv").config();
const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {
  // Get deployer details and print deployer address
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer ", deployer.address);

  // Load NFT contract and deploy the contract
  const nftContract = await hre.ethers.getContractFactory("Astrobot");
  const NFT = await upgrades.deployProxy(nftContract, [
    process.env.TOTAL_SUPPLY,
    process.env.AIRDROP_SUPPLY,
    "Test",
    "TEST",
  ]);
  await NFT.deployed();
  console.log("NFT deployed to:", NFT.address);

  // Load Sale contract and deploy the contract
  const saleContract = await hre.ethers.getContractFactory("Sale");
  const sale = await upgrades.deployProxy(saleContract, [NFT.address]);
  await sale.deployed();
  console.log("Sale deployed to:", sale.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
