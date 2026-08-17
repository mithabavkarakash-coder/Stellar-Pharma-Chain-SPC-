#![no_std]
#![allow(deprecated)]
#![allow(clippy::too_many_arguments)]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, Symbol, String};
use pharma_types::Batch;

#[contracttype]
pub enum DataKey {
    /// The admin/regulator address authorized to flag recalls and pause contract.
    Admin,
    /// Pending admin address for two-step transfer.
    PendingAdmin,
    /// Circuit breaker pause state.
    Paused,
    /// Batch metadata indexed by its Batch ID (Symbol).
    Batch(Symbol),
}

const PERSISTENT_BUMP_THRESHOLD: u32 = 100_000;
const PERSISTENT_BUMP_LEDGERS: u32 = 500_000;

fn extend_ttl_if_exists(env: &Env, key: &DataKey) {
    if env.storage().persistent().has(key) {
        env.storage().persistent().extend_ttl(key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_LEDGERS);
    }
}

#[contract]
pub struct BatchRegistry;

#[contractimpl]
#[allow(clippy::too_many_arguments)]
impl BatchRegistry {
    /// Initializes the contract by setting the admin/regulator address.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Paused, &false);
        extend_ttl_if_exists(&env, &DataKey::Admin);
    }

    /// Toggles the emergency circuit breaker pause state.
    pub fn set_paused(env: Env, caller: Address, paused: bool) {
        caller.require_auth();

        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");

        if caller != admin {
            panic!("Not authorized to pause contract");
        }

        env.storage().persistent().set(&DataKey::Paused, &paused);
        env.events().publish(
            (Symbol::new(&env, "contract_paused_status"), caller),
            (paused,),
        );
    }

    /// Returns current emergency pause state.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    /// Registers a new pharmaceutical batch. Requires manufacturer authorization.
    pub fn register_batch(
        env: Env,
        batch_id: Symbol,
        drug_name: String,
        manufacturer: Address,
        quantity: u32,
        manufacture_date: u64,
        expiry_date: u64,
        direct_ship: bool,
        custody_chain: Address,
    ) {
        if Self::is_paused(env.clone()) {
            panic!("Contract is currently paused");
        }

        manufacturer.require_auth();

        let key = DataKey::Batch(batch_id.clone());
        if env.storage().persistent().has(&key) {
            panic!("Batch already registered");
        }

        if quantity == 0 {
            panic!("Quantity must be greater than zero");
        }
        if expiry_date <= manufacture_date {
            panic!("Expiry date must be after manufacture date");
        }

        let batch = Batch {
            batch_id: batch_id.clone(),
            drug_name: drug_name.clone(),
            manufacturer: manufacturer.clone(),
            quantity,
            manufacture_date,
            expiry_date,
            direct_ship,
            is_recalled: false,
            recalled_by: None,
            is_quarantined: false,
            quarantine_reason: None,
        };

        env.storage().persistent().set(&key, &batch);
        extend_ttl_if_exists(&env, &key);

        let init_func = Symbol::new(&env, "initialize_custody");
        let init_args = (env.current_contract_address(), batch_id.clone(), manufacturer.clone(), quantity).into_val(&env);
        env.invoke_contract::<()>(&custody_chain, &init_func, init_args);

        env.events().publish(
            (Symbol::new(&env, "batch_registered"), batch_id),
            (drug_name, manufacturer, quantity, manufacture_date, expiry_date, direct_ship),
        );
    }

    /// Places a batch under quarantine/isolation.
    pub fn flag_quarantine(env: Env, batch_id: Symbol, caller: Address, reason: String) {
        if Self::is_paused(env.clone()) {
            panic!("Contract is currently paused");
        }
        caller.require_auth();

        let key = DataKey::Batch(batch_id.clone());
        extend_ttl_if_exists(&env, &key);

        let mut batch: Batch = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Batch not found");

        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");

        if caller != batch.manufacturer && caller != admin {
            panic!("Not authorized to quarantine this batch");
        }

        batch.is_quarantined = true;
        batch.quarantine_reason = Some(reason.clone());

        env.storage().persistent().set(&key, &batch);

        env.events().publish(
            (Symbol::new(&env, "batch_quarantined"), batch_id),
            (caller, reason),
        );
    }

    /// Releases a batch from quarantine.
    pub fn release_quarantine(env: Env, batch_id: Symbol, caller: Address) {
        if Self::is_paused(env.clone()) {
            panic!("Contract is currently paused");
        }
        caller.require_auth();

        let key = DataKey::Batch(batch_id.clone());
        extend_ttl_if_exists(&env, &key);

        let mut batch: Batch = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Batch not found");

        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");

        if caller != batch.manufacturer && caller != admin {
            panic!("Not authorized to release quarantine for this batch");
        }

        batch.is_quarantined = false;
        batch.quarantine_reason = None;

        env.storage().persistent().set(&key, &batch);

        env.events().publish(
            (Symbol::new(&env, "batch_unquarantined"), batch_id),
            (caller,),
        );
    }

    /// Recalls a batch permanently.
    pub fn flag_recalled(env: Env, batch_id: Symbol, caller: Address) {
        if Self::is_paused(env.clone()) {
            panic!("Contract is currently paused");
        }
        caller.require_auth();

        let key = DataKey::Batch(batch_id.clone());
        extend_ttl_if_exists(&env, &key);

        let mut batch: Batch = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Batch not found");

        if batch.is_recalled {
            panic!("Batch is already recalled");
        }

        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");

        if caller != batch.manufacturer && caller != admin {
            panic!("Not authorized to recall this batch");
        }

        batch.is_recalled = true;
        batch.recalled_by = Some(caller.clone());

        env.storage().persistent().set(&key, &batch);

        env.events().publish(
            (Symbol::new(&env, "batch_recalled"), batch_id),
            (caller,),
        );
    }

    /// Proposes a new admin for 2-step ownership transfer.
    pub fn propose_admin(env: Env, caller: Address, new_admin: Address) {
        caller.require_auth();
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");

        if caller != admin {
            panic!("Only admin can propose new admin");
        }

        env.storage().persistent().set(&DataKey::PendingAdmin, &new_admin);
    }

    /// Claims admin rights by the proposed pending admin.
    pub fn claim_admin(env: Env, caller: Address) {
        caller.require_auth();
        let pending: Address = env
            .storage()
            .persistent()
            .get(&DataKey::PendingAdmin)
            .expect("No pending admin proposal");

        if caller != pending {
            panic!("Not authorized to claim admin role");
        }

        env.storage().persistent().set(&DataKey::Admin, &caller);
        env.storage().persistent().remove(&DataKey::PendingAdmin);

        env.events().publish(
            (Symbol::new(&env, "admin_transferred"), caller),
            (),
        );
    }

    /// Read-only method to fetch batch metadata.
    pub fn get_batch(env: Env, batch_id: Symbol) -> Option<Batch> {
        let key = DataKey::Batch(batch_id);
        extend_ttl_if_exists(&env, &key);
        env.storage().persistent().get(&key)
    }

    /// Read-only method to check admin address.
    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Admin)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use pharma_types::Role;
    use soroban_sdk::{Env, Address, String, Symbol, testutils::Address as _};
    use custody_chain::{CustodyChain, CustodyChainClient};

    #[test]
    fn test_batch_registration_and_recall() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let manufacturer = Address::generate(&env);

        let registry_id = env.register(BatchRegistry, ());
        let registry_client = BatchRegistryClient::new(&env, &registry_id);
        registry_client.initialize(&admin);

        let custody_id = env.register(CustodyChain, ());
        let custody_client = CustodyChainClient::new(&env, &custody_id);
        custody_client.initialize(&registry_id);

        let batch_id = Symbol::new(&env, "BATCH123");
        let drug_name = String::from_str(&env, "Aspirin");
        let quantity = 1000;
        let manufacture_date = 1000;
        let expiry_date = 2000;
        let direct_ship = false;

        registry_client.register_batch(
            &batch_id,
            &drug_name,
            &manufacturer,
            &quantity,
            &manufacture_date,
            &expiry_date,
            &direct_ship,
            &custody_id,
        );

        let batch = registry_client.get_batch(&batch_id).unwrap();
        assert_eq!(batch.batch_id, batch_id);
        assert_eq!(batch.drug_name, drug_name);
        assert_eq!(batch.manufacturer, manufacturer);
        assert_eq!(batch.quantity, quantity);
        assert_eq!(batch.is_recalled, false);
        assert_eq!(batch.is_quarantined, false);

        let custody_state = custody_client.get_custodian_state(&batch_id, &manufacturer).unwrap();
        assert_eq!(custody_state.quantity, 1000);
        assert_eq!(custody_state.role as u32, Role::Manufacturer as u32);

        registry_client.flag_recalled(&batch_id, &manufacturer);
        let batch_recalled = registry_client.get_batch(&batch_id).unwrap();
        assert_eq!(batch_recalled.is_recalled, true);
        assert_eq!(batch_recalled.recalled_by.unwrap(), manufacturer);
    }

    #[test]
    fn test_quarantine_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let manufacturer = Address::generate(&env);

        let registry_id = env.register(BatchRegistry, ());
        let registry_client = BatchRegistryClient::new(&env, &registry_id);
        registry_client.initialize(&admin);

        let custody_id = env.register(CustodyChain, ());
        let custody_client = CustodyChainClient::new(&env, &custody_id);
        custody_client.initialize(&registry_id);

        let batch_id = Symbol::new(&env, "BATCH_Q");
        let drug_name = String::from_str(&env, "Vaccine");

        registry_client.register_batch(
            &batch_id,
            &drug_name,
            &manufacturer,
            &500,
            &1000,
            &2000,
            &false,
            &custody_id,
        );

        let reason = String::from_str(&env, "Temperature Excursion Warning");
        registry_client.flag_quarantine(&batch_id, &manufacturer, &reason);

        let q_batch = registry_client.get_batch(&batch_id).unwrap();
        assert_eq!(q_batch.is_quarantined, true);
        assert_eq!(q_batch.quarantine_reason.unwrap(), reason);

        registry_client.release_quarantine(&batch_id, &manufacturer);
        let rel_batch = registry_client.get_batch(&batch_id).unwrap();
        assert_eq!(rel_batch.is_quarantined, false);
    }

    #[test]
    fn test_pause_unpause() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let registry_id = env.register(BatchRegistry, ());
        let registry_client = BatchRegistryClient::new(&env, &registry_id);
        registry_client.initialize(&admin);

        assert_eq!(registry_client.is_paused(), false);

        registry_client.set_paused(&admin, &true);
        assert_eq!(registry_client.is_paused(), true);

        registry_client.set_paused(&admin, &false);
        assert_eq!(registry_client.is_paused(), false);
    }

    #[test]
    fn test_admin_transfer_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let new_admin = Address::generate(&env);

        let registry_id = env.register(BatchRegistry, ());
        let registry_client = BatchRegistryClient::new(&env, &registry_id);
        registry_client.initialize(&admin);

        registry_client.propose_admin(&admin, &new_admin);
        registry_client.claim_admin(&new_admin);

        assert_eq!(registry_client.get_admin().unwrap(), new_admin);
    }
}


