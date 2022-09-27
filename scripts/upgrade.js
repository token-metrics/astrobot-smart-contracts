const { ethers, upgrades } = require("hardhat");

async function main() {
  const contract = await ethers.getContractFactory("Astrobot");
  const upgrade = await upgrades.upgradeProxy("0xF845e3d7AE916CA50C7Db40808E9Cc579B5f6705", contract);
  console.log("Contract upgraded", upgrade);
}

main();
