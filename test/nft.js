const { expect } = require("chai");
const { upgrades } = require("hardhat");

describe("NFT token", function () {
  let nfToken, owner, bob, jane, sara;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const RECEIVER_MAGIC_VALUE = "0x150b7a02";
  const Error = [
    "None",
    "RevertWithMessage",
    "RevertWithoutMessage",
    "Panic",
  ].reduce((acc, entry, idx) => Object.assign({ [entry]: idx }, acc), {});

  beforeEach(async () => {
    const nftContract = await ethers.getContractFactory("Astrobot");
    nfToken = await await upgrades.deployProxy(nftContract, [
      10000,
      250,
      "Test",
      "TEST",
    ]);
    [owner, bob, jane, sara] = await ethers.getSigners();
    await nfToken.deployed();
    await nfToken.connect(owner).updateSaleContract(owner.address);
  });

  it("correctly mints a NFT", async function () {
    expect(await nfToken.connect(owner).mint(bob.address, 1)).to.emit(
      nfToken,
      "Transfer"
    );
    expect(await nfToken.balanceOf(bob.address)).to.equal(1);
  });

  it("returns correct balanceOf", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    expect(await nfToken.balanceOf(bob.address)).to.equal(1);
    await nfToken.connect(owner).mint(bob.address, 1);
    expect(await nfToken.balanceOf(bob.address)).to.equal(2);
  });

  it("throws when trying to get count of NFTs owned by 0x0 address", async function () {
    await expect(nfToken.balanceOf(zeroAddress)).to.be.revertedWith(
      "BalanceQueryForZeroAddress()"
    );
  });

  it("throws when trying to mint NFT to 0x0 address", async function () {
    await expect(
      nfToken.connect(owner).mint(zeroAddress, 1)
    ).to.be.revertedWith("MintToZeroAddress()");
  });

  it("finds the correct owner of NFToken id", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    expect(await nfToken.ownerOf(0)).to.equal(bob.address);
  });

  it("throws when trying to find owner od non-existing NFT id", async function () {
    await expect(nfToken.ownerOf(0)).to.be.revertedWith(
      "OwnerQueryForNonexistentToken()"
    );
  });

  it("correctly approves account", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    expect(await nfToken.connect(bob).approve(sara.address, 0)).to.emit(
      nfToken,
      "Approval"
    );
    expect(await nfToken.getApproved(0)).to.equal(sara.address);
  });

  it("correctly cancels approval", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    await nfToken.connect(bob).approve(sara.address, 0);
    await nfToken.connect(bob).approve(zeroAddress, 0);
    expect(await nfToken.getApproved(0)).to.equal(zeroAddress);
  });

  it("throws when trying to get approval of non-existing NFT id", async function () {
    await expect(nfToken.getApproved(0)).to.be.revertedWith(
      "ApprovalQueryForNonexistentToken()"
    );
  });

  it("throws when trying to approve NFT ID from a third party", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    await expect(
      nfToken.connect(sara).approve(sara.address, 0)
    ).to.be.revertedWith("ApprovalCallerNotOwnerNorApproved()");
  });

  it("correctly sets an operator", async function () {
    await nfToken.connect(owner).mint(bob.address, 2);
    expect(
      await nfToken.connect(bob).setApprovalForAll(sara.address, true)
    ).to.emit(nfToken, "ApprovalForAll");
    expect(await nfToken.isApprovedForAll(bob.address, sara.address)).to.equal(
      true
    );
  });

  it("correctly sets then cancels an operator", async function () {
    await nfToken.connect(owner).mint(bob.address, 2);
    await nfToken.connect(bob).setApprovalForAll(sara.address, true);
    await nfToken.connect(bob).setApprovalForAll(sara.address, false);
    expect(await nfToken.isApprovedForAll(bob.address, sara.address)).to.equal(
      false
    );
  });

  it("correctly transfers NFT from owner", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    expect(
      await nfToken.connect(bob).transferFrom(bob.address, sara.address, 0)
    ).to.emit(nfToken, "Transfer");
    expect(await nfToken.balanceOf(bob.address)).to.equal(0);
    expect(await nfToken.balanceOf(sara.address)).to.equal(1);
    expect(await nfToken.ownerOf(0)).to.equal(sara.address);
  });

  it("correctly transfers NFT from approved address", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    await nfToken.connect(bob).approve(sara.address, 0);
    await nfToken.connect(sara).transferFrom(bob.address, jane.address, 0);
    expect(await nfToken.balanceOf(bob.address)).to.equal(0);
    expect(await nfToken.balanceOf(jane.address)).to.equal(1);
    expect(await nfToken.ownerOf(0)).to.equal(jane.address);
  });

  it("correctly transfers NFT as operator", async function () {
    await nfToken.connect(owner).mint(bob.address, 5);
    await nfToken.connect(bob).setApprovalForAll(sara.address, true);
    await nfToken.connect(sara).transferFrom(bob.address, jane.address, 1);
    expect(await nfToken.balanceOf(bob.address)).to.equal(4);
    expect(await nfToken.balanceOf(jane.address)).to.equal(1);
    expect(await nfToken.ownerOf(1)).to.equal(jane.address);
  });

  it("throws when trying to transfer NFT as an address that is not owner, approved or operator", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    await expect(
      nfToken.connect(sara).transferFrom(bob.address, jane.address, 0)
    ).to.be.revertedWith("TransferCallerNotOwnerNorApproved()");
  });

  it("throws when trying to transfer NFT to a zero address", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    await expect(
      nfToken.connect(bob).transferFrom(bob.address, zeroAddress, 0)
    ).to.be.revertedWith("TransferToZeroAddress()");
  });

  it("throws when trying to transfer an invalid NFT", async function () {
    await expect(
      nfToken.connect(bob).transferFrom(bob.address, sara.address, 0)
    ).to.be.revertedWith("OwnerQueryForNonexistentToken()");
  });

  it("correctly safe transfers NFT from owner", async function () {
    await nfToken.connect(owner).mint(bob.address, 5);
    expect(
      await nfToken
        .connect(bob)
        ["safeTransferFrom(address,address,uint256)"](
          bob.address,
          sara.address,
          1
        )
    ).to.emit(nfToken, "Transfer");
    expect(await nfToken.balanceOf(bob.address)).to.equal(4);
    expect(await nfToken.balanceOf(sara.address)).to.equal(1);
    expect(await nfToken.ownerOf(1)).to.equal(sara.address);
  });

  it("throws when trying to safe transfers NFT from owner to a smart contract", async function () {
    await nfToken.connect(owner).mint(bob.address, 1);
    await expect(
      nfToken
        .connect(bob)
        ["safeTransferFrom(address,address,uint256)"](
          bob.address,
          nfToken.address,
          0
        )
    ).to.be.revertedWith("TransferToNonERC721ReceiverImplementer()");
  });

  it("correctly safe transfers NFT from owner to smart contract that can receive NFTs", async function () {
    const tokenReceiverContract = await ethers.getContractFactory(
      "ERC721ReceiverMock"
    );
    const tokenReceiver = await tokenReceiverContract.deploy(
      RECEIVER_MAGIC_VALUE,
      Error.None
    );
    await tokenReceiver.deployed();

    await nfToken.connect(owner).mint(bob.address, 1);
    await nfToken
      .connect(bob)
      ["safeTransferFrom(address,address,uint256)"](
        bob.address,
        tokenReceiver.address,
        0
      );
    expect(await nfToken.balanceOf(bob.address)).to.equal(0);
    expect(await nfToken.balanceOf(tokenReceiver.address)).to.equal(1);
    expect(await nfToken.ownerOf(0)).to.equal(tokenReceiver.address);
  });

  it("correctly safe transfers NFT from owner to smart contract that can receive NFTs with data", async function () {
    const tokenReceiverContract = await ethers.getContractFactory(
      "ERC721ReceiverMock"
    );
    const tokenReceiver = await tokenReceiverContract.deploy(
      RECEIVER_MAGIC_VALUE,
      Error.None
    );
    await tokenReceiver.deployed();

    await nfToken.connect(owner).mint(bob.address, 1);
    expect(
      await nfToken
        .connect(bob)
        ["safeTransferFrom(address,address,uint256,bytes)"](
          bob.address,
          tokenReceiver.address,
          0,
          "0x01"
        )
    ).to.emit(nfToken, "Transfer");
    expect(await nfToken.balanceOf(bob.address)).to.equal(0);
    expect(await nfToken.balanceOf(tokenReceiver.address)).to.equal(1);
    expect(await nfToken.ownerOf(0)).to.equal(tokenReceiver.address);
  });

  it("throws when trying to get mint more than supply", async function () {
    await nfToken.connect(owner).mint(bob.address, 9750);
    expect(await nfToken.balanceOf(bob.address)).to.equal(9750);
    expect(await nfToken.totalSupply()).to.equal(9750);
    await expect(
      nfToken.connect(owner).mint(bob.address, 1)
    ).to.be.revertedWith("mint: Sale completed");
  });

  it("throws error when trying to get mint if token is paused", async function () {
    await nfToken.connect(owner).pause();
    await expect(
      nfToken.connect(owner).mint(bob.address, 1)
    ).to.be.revertedWith("Pausable: paused");
    await expect(nfToken.connect(owner).airdropClaim()).to.be.revertedWith(
      "Pausable: paused"
    );
  });

  it("throws error when non owner tries to call admin functions", async function () {
    await expect(nfToken.connect(bob).pause()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(nfToken.connect(bob).unpause()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(
      nfToken.connect(bob).setBaseURI("TestString")
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(
      nfToken.connect(bob).updateSaleContract(bob.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("base uri should be implemented correctly", async function () {
    await nfToken.connect(owner).setBaseURI("TestString");
    await nfToken.connect(owner).mint(jane.address, 250);
    expect(await nfToken.baseURI()).to.equal("TestString");
    expect(await nfToken.tokenURI(1)).to.equal("TestString1");
  });

  it("base uri should be implemented correctly", async function () {
    await nfToken.connect(owner).mint(bob.address, 2);
    await nfToken.connect(owner).mint(jane.address, 3);
    const bobNFTs = await nfToken.tokensOfOwner(bob.address);
    const janeNFTs = await nfToken.tokensOfOwner(jane.address);
    expect(await bobNFTs[0]).to.equal(0);
    expect(await bobNFTs[1]).to.equal(1);
    expect(await janeNFTs[0]).to.equal(2);
    expect(await janeNFTs[1]).to.equal(3);
    expect(await janeNFTs[2]).to.equal(4);
  });

  describe("Airdrop", function () {
    beforeEach(async () => {
      await nfToken
        .connect(owner)
        .updateAirdropAddresses([bob.address, jane.address], [5, 5]);
      await nfToken.connect(owner).updateAirdropState(true);
    });
    it("Whitelisting details should be correct", async function () {
      await expect(
        nfToken.connect(owner).updateAirdropAddresses([bob.address], [1, 2])
      ).to.be.revertedWith("update: Incorrect configuration");
    });
    it("Only owner can update airdrop whitelist details", async function () {
      await expect(
        nfToken.connect(bob).updateAirdropAddresses([bob.address], [1])
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("User claim airdrop tokens", async function () {
      await nfToken.connect(bob).airdropClaim();
      await nfToken.connect(jane).airdropClaim();

      expect(await nfToken.balanceOf(bob.address)).to.equal(5);
      expect(await nfToken.balanceOf(jane.address)).to.equal(5);
    });
    it("Not whitelisted user cannot claim", async function () {
      await expect(nfToken.connect(sara).airdropClaim()).to.be.revertedWith(
        "claim: User cannot claim"
      );
    });
    it("Airdrop mint cannot be more than the fixed supply", async function () {
      await nfToken
        .connect(owner)
        .updateAirdropAddresses([owner.address, sara.address], [240, 1]);
      await nfToken.connect(bob).airdropClaim();
      await nfToken.connect(jane).airdropClaim();
      await nfToken.connect(owner).airdropClaim();
      expect(await nfToken.balanceOf(bob.address)).to.equal(5);
      expect(await nfToken.balanceOf(jane.address)).to.equal(5);
      expect(await nfToken.balanceOf(owner.address)).to.equal(240);
      expect(await nfToken.totalSupply()).to.equal(250);
      await expect(nfToken.connect(sara).airdropClaim()).to.be.revertedWith(
        "claim: All minted"
      );
    });
    it("User should not be able to mint if claim is disabled", async function () {
      await nfToken.connect(owner).updateAirdropState(false);
      await expect(nfToken.connect(jane).airdropClaim()).to.be.revertedWith(
        "claim: Disabled"
      );
    });
  });
});
