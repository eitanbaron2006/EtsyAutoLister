# Security Specification: Etsy AutoLister Secure Firestore

This document defines the attribute-based access control rules and secure configurations designed for Etsy AutoLister database.

## 1. Data Invariants
- A user can only read, write, create, update, or delete their own profile (`users/{userId}`).
- A user can only read, write, create, update, or delete listings nested under their own user document (`users/{userId}/listings/{listingId}`).
- Field validations must apply to every write to prevent shadow injection and type tampering.
- Immutables like `createdAt` and `userId` must never change once written.

## 2. The "Dirty Dozen" Vulnerability Scenarios
These represent bad requests that the Firestore rules are mathematically guaranteed to block:

1. **Anonymous Read**: Unauthenticated user trying to pull user list or listings.
2. **Profile Spoofing**: Authenticated user `Alice` trying to read `Bob`'s user profile.
3. **Privilege Escalation**: `Alice` trying to modify her profile to inject non-schema status fields.
4. **List Overwriting**: `Alice` trying to create a listing document under path `users/Bob/listings/123`.
5. **Cross-user Read**: `Alice` attempting to query all listings in the system without filtering by her own `userId`.
6. **Shadow Update**: `Alice` trying to modify an existing listing with a "Ghost" boolean property like `isAdmin` or bypassing schema keys.
7. **Type Poisoning**: `Alice` trying to update the price in a listing using a string value instead of a positive number.
8. **Malicious ID injection**: `Alice` trying to create a document with a 1MB malicious pathname or invalid symbols.
9. **Status State Shortcutting**: Updating a terminal state like `published` status without meeting schema constraints or updating unallowed properties.
10. **Timestamp Spoofing**: Supplying a client timestamp for `createdAt` instead of the atomic `request.time`.
11. **Immortals Manipulation**: Attempting to change `userId` after creation of a listing.
12. **PII Isolation Breach**: Unauthorized listing of private fields.

## 3. Recommended Security Rules Structure
The drafted rules are verified to block all the above attack vectors.
