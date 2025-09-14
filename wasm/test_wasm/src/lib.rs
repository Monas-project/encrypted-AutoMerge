use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn decorate_message(input: &str) -> String {
	format!("[wasm]: {}", input)
}

