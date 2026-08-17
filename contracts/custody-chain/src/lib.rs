#![no_std]
#![allow(deprecated)]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, Symbol};
use pharma_types::{Batch, CustodianState, Role};

#[contracttype]
pub enum DataKey {
    /// The associated Batch Registry contract address.
    Registry,
    /// Custodian balance, keyed by (Batch ID, Custodian Address).
    Custody(Symbol, Address),
}

const PERSISTENT_BUMP_THRESHOLD: u32 = 100_000;
const PERSISTENT_BUMP_LEDGERS: u32 = 500_000;

fn extend_ttl_if_exists(env: &Env, key: &DataKey) {
    if env.storage().persistent().has(key) {
        env.storage().persistent().extend_ttl(key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_LEDGERS);
    }
}

#[contract]
pub struct CustodyChain;

#[contractimpl]
impl CustodyChain {
    /// Initializes the contract with the Batch Registry contract address.
    pub fn initialize(env: Env, registry: Address) {
        if env.storage().persistent().has(&DataKey::Registry) {
            panic!("Already initialized");
        }
        env.storage().persistent().set(&DataKey::Registry, &registry);
        extend_ttl_if_exists(&env, &DataKey::Registry);
    }

    /// Initializes custody for a new batch. Called ONLY by the Batch Registry contract.
    pub fn initialize_custody(
        env: Env,
        registry: Address,
        batch_id: Symbol,
        manufacturer: Address,
        quantity: u32,
    ) {
        registry.require_auth();

        let stored_registry: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Registry)
            .expect("Contract not initialized");

        if registry != stored_registry {
            panic!("Access denied: only registry can initialize custody");
        }

        let key = DataKey::Custody(batch_id, manufacturer);
        let state = CustodianState {
            quantity,
            role: Role::Manufacturer,
        };

        env.storage().persistent().set(&key, &state);
        extend_ttl_if_exists(&env, &key);
    }

    /// Logs cold-chain sensor telemetry (temperature scaled x10, e.g. 55 = 5.5°C, and relative humidity percentage).
    pub fn log_telemetry(
        env: Env,
        batch_id: Symbol,
        reporter: Address,
        temp_scaled: i32,
        humidity_percent: u32,
    ) {
        reporter.require_auth();

        let key = DataKey::Custody(batch_id.clone(), reporter.clone());
        extend_ttl_if_exists(&env, &key);

        if !env.storage().persistent().has(&key) {
            panic!("Reporter does not hold active custody balance for this batch");
        }

        // Standard cold-chain range for pharmaceuticals: 2.0°C to 8.0°C (20 to 80 scaled)
        let is_excursion = temp_scaled < 20 || temp_scaled > 80;

        env.events().publish(
            (Symbol::new(&env, "telemetry_logged"), batch_id.clone()),
            (reporter.clone(), temp_scaled, humidity_percent, is_excursion),
        );

        if is_excursion {
            env.events().publish(
                (Symbol::new(&env, "excursion_alert"), batch_id),
                (reporter, temp_scaled, humidity_percent),
            );
        }
    }

    /// Transfers a portion or the entirety of a batch to another custodian.
    pub fn transfer_custody(
        env: Env,
        batch_id: Symbol,
        from: Address,
        to: Address,
        quantity: u32,
        to_role: Role,
    ) {
        from.require_auth();

        if from == to {
            panic!("Cannot transfer custody to yourself");
        }
        if quantity == 0 {
            panic!("Quantity must be greater than zero");
        }

        let registry: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Registry)
            .expect("Contract not initialized");

        let get_batch_func = Symbol::new(&env, "get_batch");
        let get_batch_args = (batch_id.clone(),).into_val(&env);
        let batch_opt: Option<Batch> = env.invoke_contract(&registry, &get_batch_func, get_batch_args);
        
        let batch = batch_opt.expect("Batch not found in registry");

        if batch.is_recalled {
            panic!("Cannot transfer: batch has been recalled");
        }
        if batch.is_quarantined {
            panic!("Cannot transfer: batch is in quarantine");
        }
        if env.ledger().timestamp() > batch.expiry_date {
            panic!("Cannot transfer: batch has expired");
        }

        let from_key = DataKey::Custody(batch_id.clone(), from.clone());
        extend_ttl_if_exists(&env, &from_key);

        let mut from_state: CustodianState = env
            .storage()
            .persistent()
            .get(&from_key)
            .expect("Sender has no custody balance for this batch");

        match from_state.role {
            Role::Manufacturer => {
                match to_role {
                    Role::Distributor => {}
                    Role::Pharmacy => {
                        if !batch.direct_ship {
                            panic!("Standard batch cannot skip distributor step");
                        }
                    }
                    _ => panic!("Invalid target role for manufacturer transfer"),
                }
            }
            Role::Distributor => {
                match to_role {
                    Role::Distributor | Role::Pharmacy => {}
                    _ => panic!("Invalid target role for distributor transfer"),
                }
            }
            Role::Pharmacy => {
                panic!("Pharmacies cannot transfer custody of batches");
            }
        }

        let new_from_qty = from_state
            .quantity
            .checked_sub(quantity)
            .expect("Insufficient custody balance");

        if new_from_qty == 0 {
            env.storage().persistent().remove(&from_key);
        } else {
            from_state.quantity = new_from_qty;
            env.storage().persistent().set(&from_key, &from_state);
        }

        let to_key = DataKey::Custody(batch_id.clone(), to.clone());
        extend_ttl_if_exists(&env, &to_key);

        let mut to_state = if env.storage().persistent().has(&to_key) {
            let state: CustodianState = env.storage().persistent().get(&to_key).unwrap();
            if state.role != to_role {
                panic!("Custodian already exists with a different role");
            }
            state
        } else {
            CustodianState {
                quantity: 0,
                role: to_role,
            }
        };

        to_state.quantity = to_state
            .quantity
            .checked_add(quantity)
            .expect("Quantity overflow");

        env.storage().persistent().set(&to_key, &to_state);

        env.events().publish(
            (Symbol::new(&env, "custody_handoff"), batch_id),
            (from, to, quantity, to_role as u32),
        );
    }

    /// Dispenses units of a batch to patients.
    pub fn dispense_units(env: Env, batch_id: Symbol, pharmacy: Address, quantity: u32) {
        pharmacy.require_auth();

        if quantity == 0 {
            panic!("Quantity must be greater than zero");
        }

        let registry: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Registry)
            .expect("Contract not initialized");

        let get_batch_func = Symbol::new(&env, "get_batch");
        let get_batch_args = (batch_id.clone(),).into_val(&env);
        let batch_opt: Option<Batch> = env.invoke_contract(&registry, &get_batch_func, get_batch_args);
        
        let batch = batch_opt.expect("Batch not found in registry");

        if batch.is_recalled {
            panic!("Cannot dispense: batch has been recalled");
        }
        if batch.is_quarantined {
            panic!("Cannot dispense: batch is in quarantine");
        }
        if env.ledger().timestamp() > batch.expiry_date {
            panic!("Cannot dispense: batch has expired");
        }

        let key = DataKey::Custody(batch_id.clone(), pharmacy.clone());
        extend_ttl_if_exists(&env, &key);

        let mut state: CustodianState = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Pharmacy holds no balance for this batch");

        if state.role != Role::Pharmacy {
            panic!("Only pharmacies can dispense units");
        }

        let new_qty = state
            .quantity
            .checked_sub(quantity)
            .expect("Dispense quantity exceeds remaining stock");

        if new_qty == 0 {
            env.storage().persistent().remove(&key);
        } else {
            state.quantity = new_qty;
            env.storage().persistent().set(&key, &state);
        }

        env.events().publish(
            (Symbol::new(&env, "units_dispensed"), batch_id),
            (pharmacy, quantity, new_qty),
        );
    }

    /// Read-only method to fetch the custody state of an address.
    pub fn get_custodian_state(env: Env, batch_id: Symbol, address: Address) -> Option<CustodianState> {
        let key = DataKey::Custody(batch_id, address);
        extend_ttl_if_exists(&env, &key);
        env.storage().persistent().get(&key)
    }

    /// Read-only method to get the registry address.
    pub fn get_registry(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Registry)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, Address, String, Symbol, testutils::Address as _};
    use batch_registry::{BatchRegistry, BatchRegistryClient};

    fn setup_test_env(env: &Env) -> (Address, Address, BatchRegistryClient<'static>, CustodyChainClient<'static>) {
        let admin = Address::generate(env);
        let registry_id = env.register(BatchRegistry, ());
        let registry_client = BatchRegistryClient::new(env, &registry_id);
        registry_client.initialize(&admin);

        let custody_id = env.register(CustodyChain, ());
        let custody_client = CustodyChainClient::new(env, &custody_id);
        custody_client.initialize(&registry_id);

        (registry_id, custody_id, registry_client, custody_client)
    }

    #[test]
    fn test_standard_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let (_registry_id, custody_id, registry_client, custody_client) = setup_test_env(&env);

        let manufacturer = Address::generate(&env);
        let distributor = Address::generate(&env);
        let pharmacy = Address::generate(&env);

        let batch_id = Symbol::new(&env, "BATCH123");
        let drug_name = String::from_str(&env, "Aspirin");
        let quantity = 1000;
        let manufacture_date = 1000;
        let expiry_date = 2000;
        let direct_ship = false;

        env.ledger().set_timestamp(1050);

        // Register batch
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

        // Verify manufacturer balance
        let m_state = custody_client.get_custodian_state(&batch_id, &manufacturer).unwrap();
        assert_eq!(m_state.quantity, 1000);
        assert_eq!(m_state.role as u32, Role::Manufacturer as u32);

        // Transfer 600 units from Manufacturer to Distributor (split batch)
        custody_client.transfer_custody(&batch_id, &manufacturer, &distributor, &600, &Role::Distributor);

        // Verify balances
        let m_state2 = custody_client.get_custodian_state(&batch_id, &manufacturer).unwrap();
        assert_eq!(m_state2.quantity, 400);

        let d_state = custody_client.get_custodian_state(&batch_id, &distributor).unwrap();
        assert_eq!(d_state.quantity, 600);
        assert_eq!(d_state.role as u32, Role::Distributor as u32);

        // Transfer 400 units from Distributor to Pharmacy
        custody_client.transfer_custody(&batch_id, &distributor, &pharmacy, &400, &Role::Pharmacy);

        let d_state2 = custody_client.get_custodian_state(&batch_id, &distributor).unwrap();
        assert_eq!(d_state2.quantity, 200);

        let p_state = custody_client.get_custodian_state(&batch_id, &pharmacy).unwrap();
        assert_eq!(p_state.quantity, 400);
        assert_eq!(p_state.role as u32, Role::Pharmacy as u32);

        // Dispense 150 units from Pharmacy to patients
        custody_client.dispense_units(&batch_id, &pharmacy, &150);

        let p_state2 = custody_client.get_custodian_state(&batch_id, &pharmacy).unwrap();
        assert_eq!(p_state2.quantity, 250);
    }

    #[test]
    #[should_panic(expected = "Standard batch cannot skip distributor step")]
    fn test_invalid_transition_skips_distributor() {
        let env = Env::default();
        env.mock_all_auths();
        let (_registry_id, custody_id, registry_client, custody_client) = setup_test_env(&env);

        let manufacturer = Address::generate(&env);
        let pharmacy = Address::generate(&env);

        let batch_id = Symbol::new(&env, "BATCH123");
        let drug_name = String::from_str(&env, "Aspirin");
        let quantity = 1000;
        let manufacture_date = 1000;
        let expiry_date = 2000;
        let direct_ship = false;

        env.ledger().set_timestamp(1050);

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

        // This should fail because direct_ship is false and transferring to Pharmacy directly
        custody_client.transfer_custody(&batch_id, &manufacturer, &pharmacy, &500, &Role::Pharmacy);
    }

    #[test]
    fn test_direct_ship_flow() {
        let env = Env::default();
        env.mock_all_auths();
        let (_registry_id, custody_id, registry_client, custody_client) = setup_test_env(&env);

        let manufacturer = Address::generate(&env);
        let pharmacy = Address::generate(&env);

        let batch_id = Symbol::new(&env, "BATCH_DIRECT");
        let drug_name = String::from_str(&env, "Aspirin");
        let quantity = 1000;
        let manufacture_date = 1000;
        let expiry_date = 2000;
        let direct_ship = true;

        env.ledger().set_timestamp(1050);

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

        // Valid direct transfer Manufacturer -> Pharmacy
        custody_client.transfer_custody(&batch_id, &manufacturer, &pharmacy, &500, &Role::Pharmacy);

        let p_state = custody_client.get_custodian_state(&batch_id, &pharmacy).unwrap();
        assert_eq!(p_state.quantity, 500);
        assert_eq!(p_state.role as u32, Role::Pharmacy as u32);
    }

    #[test]
    #[should_panic(expected = "Cannot transfer: batch has expired")]
    fn test_expiry_blocks_transfers() {
        let env = Env::default();
        env.mock_all_auths();
        let (_registry_id, custody_id, registry_client, custody_client) = setup_test_env(&env);

        let manufacturer = Address::generate(&env);
        let distributor = Address::generate(&env);

        let batch_id = Symbol::new(&env, "BATCH123");
        let drug_name = String::from_str(&env, "Aspirin");
        let quantity = 1000;
        let manufacture_date = 1000;
        let expiry_date = 2000;
        let direct_ship = false;

        env.ledger().set_timestamp(1050);

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

        // Move to post-expiry
        env.ledger().set_timestamp(2050);

        // Should panic
        custody_client.transfer_custody(&batch_id, &manufacturer, &distributor, &500, &Role::Distributor);
    }

    #[test]
    #[should_panic(expected = "Cannot transfer: batch has been recalled")]
    fn test_recall_blocks_transfers() {
        let env = Env::default();
        env.mock_all_auths();
        let (_registry_id, custody_id, registry_client, custody_client) = setup_test_env(&env);

        let manufacturer = Address::generate(&env);
        let distributor = Address::generate(&env);

        let batch_id = Symbol::new(&env, "BATCH123");
        let drug_name = String::from_str(&env, "Aspirin");
        let quantity = 1000;
        let manufacture_date = 1000;
        let expiry_date = 2000;
        let direct_ship = false;

        env.ledger().set_timestamp(1050);

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

        // Recall batch
        registry_client.flag_recalled(&batch_id, &manufacturer);

        // Should panic
        custody_client.transfer_custody(&batch_id, &manufacturer, &distributor, &500, &Role::Distributor);
    }

    #[test]
    fn test_telemetry_and_excursion_logging() {
        let env = Env::default();
        env.mock_all_auths();
        let (_registry_id, custody_id, registry_client, custody_client) = setup_test_env(&env);

        let manufacturer = Address::generate(&env);
        let batch_id = Symbol::new(&env, "BATCH_TEMP");
        let drug_name = String::from_str(&env, "Insulin");

        registry_client.register_batch(
            &batch_id,
            &drug_name,
            &manufacturer,
            &1000,
            &1000,
            &2000,
            &false,
            &custody_id,
        );

        // Normal temperature: 4.5°C (45 scaled)
        custody_client.log_telemetry(&batch_id, &manufacturer, &45, &50);

        // Cold excursion: -1.0°C (-10 scaled)
        custody_client.log_telemetry(&batch_id, &manufacturer, &-10, &60);

        // Heat excursion: 12.0°C (120 scaled)
        custody_client.log_telemetry(&batch_id, &manufacturer, &120, &70);
    }

    #[test]
    #[should_panic(expected = "Cannot transfer: batch is in quarantine")]
    fn test_quarantine_blocks_transfers() {
        let env = Env::default();
        env.mock_all_auths();
        let (_registry_id, custody_id, registry_client, custody_client) = setup_test_env(&env);

        let manufacturer = Address::generate(&env);
        let distributor = Address::generate(&env);

        let batch_id = Symbol::new(&env, "BATCH_Q_BLOCK");
        let drug_name = String::from_str(&env, "Antibiotic");

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

        let reason = String::from_str(&env, "Suspected breach");
        registry_client.flag_quarantine(&batch_id, &manufacturer, &reason);

        // Should panic due to active quarantine
        custody_client.transfer_custody(&batch_id, &manufacturer, &distributor, &100, &Role::Distributor);
    }
}


