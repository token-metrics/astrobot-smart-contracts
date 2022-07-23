const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { time } = require("./utilities");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
let nfToken,
  sale,
  owner,
  bob,
  jane,
  sara,
  addresses,
  leaf,
  tree,
  root,
  leafnodes,
  proof;
const DEFAULT_MIN_MINT = 1;
const DEFAULT_MAX_MINT = 5;
const DEFAULT_PRICE_ETHER = 1;

function whitelistMint(quantity, user, price, phase) {
  if (phase === 1) {
    return sale.connect(user).mintWhitelisted(quantity, proof, {
      value: ethers.utils
        .parseUnits((quantity * price).toString(), "ether")
        .toHexString(),
    });
  } else if (phase === 2) {
    return sale.connect(user).mintWaitlist(quantity, proof, {
      value: ethers.utils
        .parseUnits((quantity * price).toString(), "ether")
        .toHexString(),
    });
  } else {
    return sale.connect(user).mintPublicSale(quantity, {
      value: ethers.utils
        .parseUnits((quantity * price).toString(), "ether")
        .toHexString(),
    });
  }
}

async function whitelistMintValidations(quantity, user, price, phase) {
  let quantityPhaseOne = 0;
  let quantityPhaseTwo = 0;
  let quantityPhaseThree = 0;
  if (phase === 1) {
    quantityPhaseOne = quantity;
  } else if (phase === 2) {
    quantityPhaseTwo = quantity;
  } else {
    quantityPhaseThree = quantity;
  }
  expect(await sale.userMinted(user.address)).to.equal(quantity);
  expect(await sale.totalMinted()).to.equal(quantity);
  expect(await sale.phaseOneMinted()).to.equal(quantityPhaseOne);
  expect(await sale.phaseTwoMinted()).to.equal(quantityPhaseTwo);
  expect(await sale.phaseThreeMinted()).to.equal(quantityPhaseThree);
  expect(await nfToken.balanceOf(user.address)).to.equal(quantity);
  expect((await ethers.provider.getBalance(sale.address)).toString()).to.equal(
    ethers.utils.parseUnits((quantity * price).toString(), "ether").toString()
  );
}

function mintConditions(phase) {
  it("Buy single NFT", async function () {
    await whitelistMint(DEFAULT_MIN_MINT, bob, DEFAULT_PRICE_ETHER, phase);
    await whitelistMintValidations(
      DEFAULT_MIN_MINT,
      bob,
      DEFAULT_PRICE_ETHER,
      phase
    );
  });

  it("Buy Multiple NFTs", async function () {
    await whitelistMint(DEFAULT_MAX_MINT, bob, DEFAULT_PRICE_ETHER, phase);
    await whitelistMintValidations(
      DEFAULT_MAX_MINT,
      bob,
      DEFAULT_PRICE_ETHER,
      phase
    );
  });

  if (phase === 1) {
    it("Should revert if user tries to mint more than alloted", async function () {
      await whitelistMint(DEFAULT_MAX_MINT, bob, DEFAULT_PRICE_ETHER, phase);
      await whitelistMintValidations(
        DEFAULT_MAX_MINT,
        bob,
        DEFAULT_PRICE_ETHER,
        phase
      );
      await expect(
        whitelistMint(DEFAULT_MIN_MINT, bob, DEFAULT_PRICE_ETHER, phase)
      ).to.be.revertedWith("Minting limit");
    });
  }

  if (phase === 1 || phase === 2) {
    it("Should revert if non whitelisted user tries to buy", async function () {
      await expect(
        whitelistMint(DEFAULT_MAX_MINT, owner, DEFAULT_PRICE_ETHER, phase)
      ).to.be.revertedWith("Not whitelisted");
    });
  } else {
    it("Non whitelisted users can mint", async function () {
      await whitelistMint(DEFAULT_MAX_MINT, owner, DEFAULT_PRICE_ETHER, phase);
      await whitelistMintValidations(
        DEFAULT_MAX_MINT,
        owner,
        DEFAULT_PRICE_ETHER,
        phase
      );
    });
  }

  it("Should revert if user tries to buy after sale time", async function () {
    await time.advanceBlocks(98);
    await whitelistMint(DEFAULT_MAX_MINT, bob, DEFAULT_PRICE_ETHER, phase);
    await whitelistMintValidations(
      DEFAULT_MAX_MINT,
      bob,
      DEFAULT_PRICE_ETHER,
      phase
    );
    await expect(
      whitelistMint(DEFAULT_MIN_MINT, bob, DEFAULT_PRICE_ETHER, phase)
    ).to.be.revertedWith("Sale not open");
  });

  it("Should revert if user tries to buy before sale time", async function () {
    const startBlock = parseInt(await time.latestBlock()) + 500;
    await sale
      .connect(owner)
      .updateSaleTime(startBlock, startBlock, startBlock, 100, 100, 100);
    await expect(
      whitelistMint(DEFAULT_MIN_MINT, bob, DEFAULT_PRICE_ETHER, phase)
    ).to.be.revertedWith("Sale not open");
  });

  it("Should revert if user tries to buy after Phase max supply reached", async function () {
    await sale.updateSaleSupply(100, 100, 100, 500, 300);
    await whitelistMint(100, bob, DEFAULT_PRICE_ETHER, phase);
    await whitelistMintValidations(100, bob, DEFAULT_PRICE_ETHER, phase);
    await expect(
      whitelistMint(DEFAULT_MIN_MINT, bob, DEFAULT_PRICE_ETHER, phase)
    ).to.be.revertedWith("All tokens minted");
  });

  it("Should revert if user tries to mint more than max supply", async function () {
    await sale.updateSaleSupply(200, 100, 100, 500, 100);
    await whitelistMint(100, bob, DEFAULT_PRICE_ETHER, phase);
    await whitelistMintValidations(100, bob, DEFAULT_PRICE_ETHER, phase);
    await expect(
      whitelistMint(DEFAULT_MIN_MINT, bob, DEFAULT_PRICE_ETHER, phase)
    ).to.be.revertedWith("Sale completed");
  });

  it("Should revert if user tries to buy with less amount", async function () {
    await expect(
      whitelistMint(DEFAULT_MIN_MINT, bob, 0.99, phase)
    ).to.be.revertedWith("Invalid ether amount");
  });

  it("Should revert if user tries to buy multiple tokens with less amount", async function () {
    await expect(
      whitelistMint(DEFAULT_MAX_MINT, bob, 0.99, phase)
    ).to.be.revertedWith("Invalid ether amount");
  });
}

describe("Sale", function () {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const MAX_PRICE = "2500000000000000000";
  const MIN_PRICE = "250000000000000000";

  beforeEach(async () => {
    // Load contract
    const nftContract = await ethers.getContractFactory("Astrobot");
    const saleContract = await ethers.getContractFactory("Sale");

    // Deploy nft contract
    nfToken = await upgrades.deployProxy(nftContract, [
      10000,
      500,
      "Test",
      "TEST",
    ]);
    [owner, bob, jane, sara] = await ethers.getSigners();
    await nfToken.deployed();

    // Deploy sale contract
    sale = await upgrades.deployProxy(saleContract, [nfToken.address]);
    await sale.deployed();

    // Initial configuration of contract
    await nfToken.connect(owner).updateSaleContract(sale.address);

    addresses = [bob.address];
    leafnodes = addresses.map((addr) => keccak256(addr));
    tree = new MerkleTree(leafnodes, keccak256);
    leaf = keccak256(bob.address);
    root = tree.getHexRoot();
    proof = tree.getProof(leaf);
    await sale.updateMerkleProofRoot(root, root);

    await sale.updateSalePrice(
      ethers.utils.parseUnits("1", "ether").toHexString(),
      ethers.utils.parseUnits("1", "ether").toHexString(),
      ethers.utils.parseUnits("1", "ether").toHexString()
    );
    await sale.updateSaleSupply(100, 100, 100, 5, 300);

    const phaseOneStartBlock = parseInt(await time.latestBlock()) + 1;
    const phaseTwoStartBlock = phaseOneStartBlock + 100;
    const phaseThreeStartBlock = phaseTwoStartBlock + 100;
    await sale
      .connect(owner)
      .updateSaleTime(
        phaseOneStartBlock,
        phaseTwoStartBlock,
        phaseThreeStartBlock,
        100,
        100,
        100
      );
  });

  describe("Sale conditions", function () {
    it("Only owner can pause mint", async function () {
      await expect(sale.connect(bob).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Only owner can unpause", async function () {
      await expect(sale.connect(bob).unpause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Only owner can update time", async function () {
      await expect(
        sale.connect(bob).updateSaleTime(1000, 1500, 2000, 500, 500, 500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only owner can update price", async function () {
      await expect(
        sale.connect(bob).updateSalePrice(1, 1, 1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only owner can update root keys", async function () {
      await expect(sale.connect(bob).unpause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Only owner can update supply", async function () {
      await expect(
        sale.connect(bob).updateSaleSupply(100, 100, 100, 5, 300)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Whitelisted minting", function () {
    mintConditions(1);
  });

  describe("Wait List minting", function () {
    beforeEach(async () => {
      await time.advanceBlocks(100);
    });
    mintConditions(2);
  });

  describe("Public minting", function () {
    beforeEach(async () => {
      await time.advanceBlocks(200);
    });
    mintConditions(3);
  });

  describe("Withdraw Ether", function () {
    beforeEach(async () => {
      await await whitelistMint(DEFAULT_MAX_MINT, bob, DEFAULT_PRICE_ETHER, 1);
    });
    it("Only owner can withdraw", async function () {
      await expect(sale.connect(bob).withdraw()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Owner withdraw funds", async () => {
      expect(
        (await ethers.provider.getBalance(sale.address)).toString()
      ).to.equal(
        ethers.utils
          .parseUnits(
            (DEFAULT_MAX_MINT * DEFAULT_PRICE_ETHER).toString(),
            "ether"
          )
          .toString()
      );
      await sale.connect(owner).withdraw();
      expect(
        (await ethers.provider.getBalance(sale.address)).toString()
      ).to.equal("0");
    });
  });
});
