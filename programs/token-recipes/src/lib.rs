pub mod assertions;
pub mod entrypoint;
pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;
pub mod utils;

pub use solana_program;

#[cfg(feature = "localnet")]
solana_program::declare_id!("C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T");

#[cfg(not(feature = "localnet"))]
solana_program::declare_id!("6EgVKvZu2V6cpZzarvDHuyeJwa1NB2ujj8hXY98pQpLE");
