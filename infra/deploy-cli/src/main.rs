use std::process::Command;
use std::fs;
use std::path::Path;

fn main() -> anyhow::Result<()> {
    println!("=======================================================");
    println!("   Soroban Contract Build & Deploy Orchestrator CLI   ");
    println!("=======================================================");

    // 1. Compile the contracts to wasm32 target
    println!("\n[1/3] Compiling contracts to WebAssembly...");
    let build_status = Command::new("cargo")
        .args(["build", "--target", "wasm32v1-none", "--release", "-p", "batch-registry", "-p", "custody-chain"])
        .status()?;

    if !build_status.success() {
        anyhow::bail!("Cargo build failed. Resolve compilation errors first.");
    }
    println!("Contracts compiled successfully to Wasm!");

    // Verify WASM files exist
    let registry_path = "target/wasm32v1-none/release/batch_registry.wasm";
    let custody_path = "target/wasm32v1-none/release/custody_chain.wasm";
    if !Path::new(registry_path).exists() || !Path::new(custody_path).exists() {
        anyhow::bail!("WASM files not found. Check build target directory.");
    }

    // 2. Install Node dependencies for the deployer script
    println!("\n[2/3] Preparing JS deployer dependencies (npm)...");
    
    // Note: On Windows, we invoke npm using cmd/npm.cmd to bypass script block policies
    let npm_cmd = if cfg!(target_os = "windows") { "npm.cmd" } else { "npm" };
    let install_status = Command::new(npm_cmd)
        .args(["install"])
        .current_dir("infra/deploy-cli")
        .status()?;

    if !install_status.success() {
        anyhow::bail!("Failed to run 'npm install' inside infra/deploy-cli.");
    }
    println!("Node dependencies ready.");

    // 3. Execute JS Deployer Script to upload, instantiate and initialize contracts
    // NOTE: This off-chain deployment script is written in Node.js because the official
    // precompiled Windows Stellar CLI (stellar.exe) crashes with STATUS_ACCESS_VIOLATION (0xC0000005)
    // on this environment, representing a hard platform constraint.
    println!("\n[3/3] Deploying smart contracts to Stellar Testnet...");
    
    let deploy_status = Command::new("node")
        .arg("infra/deploy-cli/deploy.js")
        .status()?;

    if !deploy_status.success() {
        anyhow::bail!("Contract deployment script failed.");
    }

    println!("\n=======================================================");
    println!("   Deployment complete! Contracts initialized.         ");
    println!("=======================================================");
    Ok(())
}
