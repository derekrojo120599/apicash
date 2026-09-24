# Transaction Management Specification

## Purpose

Defines the lifecycle and relationship rules for user financial transactions, specifically focusing on atomic operations and parent-child dependencies.

## Requirements

### Requirement: Atomic Parent/Child Insertion

The system MUST guarantee that inserting a main transaction (parent) and its associated commission (child) happens as an atomic database operation via RPC.

#### Scenario: Successful dual-insert
- GIVEN a user submits a transfer that incurs a commission
- WHEN the payload is sent to the backend RPC
- THEN the system MUST create both the parent transaction and the commission transaction simultaneously.

#### Scenario: Failed commission insert
- GIVEN a user submits a transfer that incurs a commission
- WHEN the parent transaction succeeds but the commission insertion fails due to a constraint
- THEN the system MUST rollback the entire operation and the parent transaction MUST NOT be saved.

### Requirement: Cascading Child Deletion

The system MUST automatically delete any associated child commission transactions if their parent transaction is removed.

#### Scenario: Deleting a transaction with a fee
- GIVEN a parent transaction has a linked commission transaction (`transaccion_padre_id`)
- WHEN the user deletes the parent transaction
- THEN the system MUST automatically delete the child commission transaction.

### Requirement: Commission Identification

The system MUST differentiate standard transactions from automated commission transactions.

#### Scenario: Fetching transaction lists
- GIVEN a mix of standard and commission transactions
- WHEN the system fetches the list
- THEN it MUST be able to identify which transactions are purely fees (e.g., via `es_comision` flag) and which are the source transactions.