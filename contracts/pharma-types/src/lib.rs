#![no_std]
use soroban_sdk::{contracttype, Address, String, Symbol};

/// Represents the supply chain roles for a drug batch custodian.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Role {
    /// The original creator who registers the batch.
    Manufacturer = 1,
    /// An intermediary distributor who moves the batch.
    Distributor = 2,
    /// The pharmacy dispensing units to patients.
    Pharmacy = 3,
}

/// Metadata stored on-chain for a registered pharmaceutical batch.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Batch {
    /// Unique symbol representing the batch ID (e.g., BATCH123).
    pub batch_id: Symbol,
    /// Name of the drug.
    pub drug_name: String,
    /// Address of the manufacturer who registered the batch.
    pub manufacturer: Address,
    /// Initial quantity registered.
    pub quantity: u32,
    /// Unix timestamp of manufacture date.
    pub manufacture_date: u64,
    /// Unix timestamp of expiry date.
    pub expiry_date: u64,
    /// If true, the batch can skip distributor and go directly to a pharmacy.
    pub direct_ship: bool,
    /// Indicates if the batch has been recalled.
    pub is_recalled: bool,
    /// The address of the entity that flagged the recall.
    pub recalled_by: Option<Address>,
}

/// The custody balance and role of a specific supply chain participant.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CustodianState {
    /// The quantity of the batch currently held by this custodian.
    pub quantity: u32,
    /// The role of this custodian for this batch.
    pub role: Role,
}
