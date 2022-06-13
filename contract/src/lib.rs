use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, setup_alloc};
use near_sdk::serde::{Serialize};
use near_sdk::collections::LookupMap;
use near_sdk::{BorshStorageKey, PanicOnDefault};

setup_alloc!();

const NUMBER_OF_MEASUREMENTS : usize = 10;

#[derive(BorshStorageKey, BorshSerialize)]
pub enum StorageKeys {
    Accounts
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub users: LookupMap<String, Body>
}

#[derive(BorshDeserialize, BorshSerialize, Default)]
#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Body {
    pub age: u8,
    pub height: u8,
    pub weights: Vec<f32>,
}

impl Body {
    fn add_weight(&mut self, weight: f32) {
        if self.weights.len() >= NUMBER_OF_MEASUREMENTS {
            self.weights.remove(0);
        }

        self.weights.push(weight);
    }
}

#[near_bindgen]
impl Contract {
    #[init(ignore_state)]
    pub fn new() -> Self {
        Self {
            users: LookupMap::new(StorageKeys::Accounts)
        }
    }

    pub fn get_user(&self, account_id: String) -> Body {
        self.users.get(&account_id).unwrap()
    }

    pub fn check_user(&self, account_id: String) -> bool {
        self.users.contains_key(&account_id)
    }

    pub fn register_user(&mut self, age: u8, height: u8, weight: f32) {
        let account_id = env::predecessor_account_id();

        let weights : Vec<f32> = vec![weight];

        let user_body = Body {
            age,
            height,
            weights,
        };

        self.users.insert(&account_id, &user_body);
    }

    pub fn add_weight_to_user(&mut self, account_id: String, weight: f32) {
        assert!(env::predecessor_account_id() == account_id, "Access denied.");
        let mut user = self.users.get(&account_id).unwrap();
        user.add_weight(weight);

        self.users.insert(&account_id, &user);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::MockedBlockchain;
    use near_sdk::{testing_env, VMContext};
    use near_sdk::json_types::ValidAccountId;
    use std::convert::TryFrom;

    const USER : &str = "testuser.testnet";

    fn to_valid_account(account: &str) -> ValidAccountId {
        ValidAccountId::try_from(account).expect("Invalid account")
    }

    fn get_context(is_view: bool) -> VMContext {
        VMContextBuilder::new().is_view(is_view).predecessor_account_id(to_valid_account(USER)).build()
    }

    #[test]
    fn test_new() {
        let context : VMContext = get_context(false);
        testing_env!(context);
        let _contract = Contract::new();
    }

    #[test]
    fn should_add_the_user() {
        let context : VMContext = get_context(false);
        testing_env!(context);
        let mut contract = Contract::new();

        contract.register_user(25, 180, 80.4);

        assert!(contract.check_user(USER.to_string()));
        assert_eq!(contract.users.get(&USER.to_string()).unwrap().age, 25 as u8);
    }

    #[test]
    fn should_add_the_weight_to_user() {
        let context : VMContext = get_context(false);
        testing_env!(context);
        let mut contract = Contract::new();

        contract.register_user(25, 180, 80.4);

        assert!(contract.check_user(USER.to_string()));
        assert_eq!(contract.users.get(&USER.to_string()).unwrap().weights, vec![80.4]);

        contract.add_weight_to_user(USER.to_string(), 81.2);

        assert_eq!(contract.users.get(&USER.to_string()).unwrap().weights, vec![80.4, 81.2]);
    }

    #[test]
    fn should_remove_the_first_weight_from_user() {
        let context : VMContext = get_context(false);
        testing_env!(context);
        let mut contract = Contract::new();

        contract.register_user(25, 180, 80.4);

        assert!(contract.check_user(USER.to_string()));

        contract.add_weight_to_user(USER.to_string(), 81.2);
        contract.add_weight_to_user(USER.to_string(), 81.4);
        contract.add_weight_to_user(USER.to_string(), 81.8);
        contract.add_weight_to_user(USER.to_string(), 82.1);
        contract.add_weight_to_user(USER.to_string(), 81.9);
        contract.add_weight_to_user(USER.to_string(), 81.7);
        contract.add_weight_to_user(USER.to_string(), 81.1);
        contract.add_weight_to_user(USER.to_string(), 81.0);
        contract.add_weight_to_user(USER.to_string(), 80.2);

        let tested_weights_1 = vec![80.4, 81.2, 81.4, 81.8, 82.1, 81.9, 81.7, 81.1, 81.0, 80.2];
        assert_eq!(contract.users.get(&USER.to_string()).unwrap().weights, tested_weights_1);

        contract.add_weight_to_user(USER.to_string(), 79.3);

        let tested_weights_2 = vec![81.2, 81.4, 81.8, 82.1, 81.9, 81.7, 81.1, 81.0, 80.2, 79.3];
        assert_eq!(contract.users.get(&USER.to_string()).unwrap().weights, tested_weights_2);
    }

    #[test]
    fn should_found_the_user() {
        let context : VMContext = get_context(false);
        testing_env!(context);
        let mut contract = Contract::new();

        contract.register_user(25, 180, 80.4);

        assert!(contract.check_user(USER.to_string()));
        assert_eq!(contract.users.contains_key(&USER.to_string()), contract.check_user(USER.to_string()));
    }

    #[test]
    fn should_not_found_the_user() {
        let context : VMContext = get_context(false);
        testing_env!(context);
        let contract = Contract::new();

        assert_eq!(contract.check_user(USER.to_string()), false);
    }

    #[test]
    fn should_return_the_user() {
        let context : VMContext = get_context(false);
        testing_env!(context);
        let mut contract = Contract::new();

        contract.register_user(25, 180, 80.4);

        assert!(contract.check_user(USER.to_string()));

        let user = contract.get_user(USER.to_string());

        assert_eq!(user.age, 25);
        assert_eq!(user.height, 180);
    }
}
