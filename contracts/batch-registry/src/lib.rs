#![no_std]
#![allow(deprecated)]
#![allow(clippy::too_many_arguments)]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, Symbol, String};
use pharma_types::Batch;

#[contracttype]
pub enum DataKey {
    /// The admin/regulator address authorized to flag recalls.
    Admin,
    /// Batch metadata indexed by its Batch ID (Symbol).
    Batch(Symbol),
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
    }

    /// Registers a new pharmaceutical batch. Requires manufacturer authorization.
    /// Calls the custody chain contract to initialize the manufacturer's custody balance.
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
        // Authenticate the manufacturer
        manufacturer.require_auth();

        // Check if batch is already registered
        let key = DataKey::Batch(batch_id.clone());
        if env.storage().persistent().has(&key) {
            panic!("Batch already registered");
        }

        // Validate dates and quantities
        if quantity == 0 {
            panic!("Quantity must be greater than zero");
        }
        if expiry_date <= manufacture_date {
            panic!("Expiry date must be after manufacture date");
        }

        // Create the batch metadata
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
        };

        // Save batch metadata
        env.storage().persistent().set(&key, &batch);

        // Perform cross-contract call to initialize custody in the custody-chain contract
        let init_func = Symbol::new(&env, "initialize_custody");
        let init_args = (env.current_contract_address(), batch_id.clone(), manufacturer.clone(), quantity).into_val(&env);
        env.invoke_contract::<()>(&custody_chain, &init_func, init_args);

        // Emit registration event
        env.events().publish(
            (Symbol::new(&env, "batch_registered"), batch_id),
            (drug_name, manufacturer, quantity, manufacture_date, expiry_date, direct_ship),
        );
    }

    /// Recalls a batch. Restricts to the manufacturer or the authorized regulator (admin).
    pub fn flag_recalled(env: Env, batch_id: Symbol, caller: Address) {
        caller.require_auth();

        let key = DataKey::Batch(batch_id.clone());
        let mut batch: Batch = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Batch not found");

        if batch.is_recalled {
            panic!("Batch is already recalled");
        }

        // Verify if caller is manufacturer or admin
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");

        if caller != batch.manufacturer && caller != admin {
            panic!("Not authorized to recall this batch");
        }

        // Mark as recalled
        batch.is_recalled = true;
        batch.recalled_by = Some(caller.clone());

        env.storage().persistent().set(&key, &batch);

        // Emit recall event
        env.events().publish(
            (Symbol::new(&env, "batch_recalled"), batch_id),
            (caller,),
        );
    }

    /// Read-only method to fetch batch metadata.
    pub fn get_batch(env: Env, batch_id: Symbol) -> Option<Batch> {
        let key = DataKey::Batch(batch_id);
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

        // Check registry values
        let batch = registry_client.get_batch(&batch_id).unwrap();
        assert_eq!(batch.batch_id, batch_id);
        assert_eq!(batch.drug_name, drug_name);
        assert_eq!(batch.manufacturer, manufacturer);
        assert_eq!(batch.quantity, quantity);
        assert_eq!(batch.is_recalled, false);

        // Check initial custody
        let custody_state = custody_client.get_custodian_state(&batch_id, &manufacturer).unwrap();
        assert_eq!(custody_state.quantity, 1000);
        assert_eq!(custody_state.role as u32, Role::Manufacturer as u32);

        // Flag recalled by manufacturer
        registry_client.flag_recalled(&batch_id, &manufacturer);
        let batch_recalled = registry_client.get_batch(&batch_id).unwrap();
        assert_eq!(batch_recalled.is_recalled, true);
        assert_eq!(batch_recalled.recalled_by.unwrap(), manufacturer);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_fails() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let registry_id = env.register(BatchRegistry, ());
        let registry_client = BatchRegistryClient::new(&env, &registry_id);
        registry_client.initialize(&admin);
        registry_client.initialize(&admin);
    }
}

