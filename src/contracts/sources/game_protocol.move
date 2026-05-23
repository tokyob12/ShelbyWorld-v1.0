module game_addr::game_protocol {
    use std::signer;
    use std::string::{Self, String};
    use std::option;
    use std::bcs;
    use aptos_token_objects::collection;
    use aptos_token_objects::token;
    use aptos_token_objects::property_map;

    const EALREADY_INITIALIZED: u64 = 1;
    const EMINIMUM_SCORE_NOT_MET: u64 = 2;

    struct TokenController has key {
        admin: address,
    }

    /// Initializes the unified game passport collection.
    /// This is called once by the contract deployer (Admin).
    public entry fun initialize_collection(creator: &signer) {
        let creator_addr = signer::address_of(creator);
        assert!(!exists<TokenController>(creator_addr), EALREADY_INITIALIZED);

        let collection_name = string::utf8(b"Shelbyworld Quest Passport");
        let description = string::utf8(b"The official Shelbyworld Quest dynamic passport representing verified player credit scores.");
        let uri = string::utf8(b"https://shelby.shelbynet.staging.shelby.xyz/shelby/v1/blobs/collection.json");
        let max_supply = 100000;

        // Create the collection
        collection::create_fixed_collection(
            creator,
            description,
            max_supply,
            collection_name,
            option::none(),
            uri,
        );

        move_to(creator, TokenController {
            admin: creator_addr,
        });
    }

    /// Player mints their unique passport NFT, saving their final score directly to the on-chain property map.
    public entry fun mint_passport(
        player: &signer,
        score: u64
    ) {
        // Assert player met the 100 points minimum score to prevent fraud
        assert!(score >= 100, EMINIMUM_SCORE_NOT_MET);

        let collection_name = string::utf8(b"Shelbyworld Quest Passport");
        let token_name = string::utf8(b"Shelby Quest Passport");
        let description = string::utf8(b"An on-chain verifiable Shelbyworld passport containing your scavenger hunt score.");
        let token_uri = string::utf8(b"https://shelby.shelbynet.staging.shelby.xyz/shelby/v1/blobs/passport_art.json");

        // Mint the unnamed token (this is the recommended Token v2 standard)
        let constructor_ref = token::create_from_account(
            player,
            collection_name,
            description,
            token_name,
            option::none(),
            token_uri,
        );

        // Prepare the credits metadata score
        let property_keys = vector[string::utf8(b"credits")];
        let property_types = vector[string::utf8(b"u64")];
        let property_values = vector[bcs::to_bytes(&score)];

        // Initialize the metadata map inside the token constructor
        let properties = property_map::prepare_input(property_keys, property_types, property_values);
        property_map::init(&constructor_ref, properties);
    }
}