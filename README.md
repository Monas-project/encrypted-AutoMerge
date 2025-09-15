# encrypted-AutoMerge

A prototype implementation of an encrypted auto-merge system that combines **Fully Homomorphic Encryption (FHE)** with **CRDT (Conflict-free Replicated Data Type)** for automatic content integration while maintaining end-to-end encryption.

## Overview

encrypted-AutoMerge is a research and implementation project that enables automatic state convergence while keeping content confidential in distributed systems with **End-to-End Encryption (E2EE)** as a fundamental requirement.

### Key Features

- 🔐 **Full Encryption**: TFHE (Fast Fully Homomorphic Encryption over the Torus) based encryption
- 🔄 **Auto-Merge**: LWW (Last-Write-Wins) policy for conflict resolution
- 🌐 **Distributed**: Real-time synchronization between multiple users
- 🔑 **E2EE**: Content remains inaccessible to anyone except authorized users

## Documentation

- [Prototype Documentation](frontend/docs/prototype.md)
- [Technical Specification](frontend/docs/document.md)
