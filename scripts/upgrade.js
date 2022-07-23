const { ethers, upgrades } = require("hardhat");

async function main() {
  const contract = await ethers.getContractFactory("Contract_name");
  const upgrade = await upgrades.upgradeProxy("Contract_address", contract);
  console.log("Contract upgraded", upgrade);
}

main();
