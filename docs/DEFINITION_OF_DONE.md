# Definition of Done

A feature is done only when it works in the local environment and has evidence behind it.

## Code
- typed/validated
- clear boundaries
- no unnecessary duplication

## Tests
- business logic covered by unit tests
- critical flows covered by integration/E2E tests

## Reliability
- meaningful error handling
- timeouts/retries where appropriate
- health/readiness behavior where appropriate

## Security
- secrets via environment/configuration
- server-authoritative scoring
- input validation
- least-privilege infrastructure principles

## Operations
- structured logs
- useful diagnostics
- documentation of how to run and troubleshoot

## Delivery
- CI passes
- Docker workflow remains valid
- architecture docs updated if architecture changed
- focused commit(s)
