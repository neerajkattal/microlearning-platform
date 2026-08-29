# ADR-0001: Use a Modular Monolith Initially

## Status
Accepted

## Context

The project needs a web frontend, API, worker, database, cache, and future game runtime. It is also a learning project.

## Decision

Start with a modular monolith and clear internal boundaries. Use containers to separate runtime concerns locally without splitting the product into independently deployed microservices.

## Why

- simpler local development
- lower cost
- easier debugging
- fewer deployment concerns
- still teaches service boundaries and infrastructure
- allows extraction later if a real scaling need appears

## Consequences

Positive:
- fast iteration
- clear ownership of domain boundaries
- easier CI/CD

Negative:
- one application repository contains multiple concerns
- extraction to services would require later work if scale demands it

## Trigger to reconsider

Reconsider only when there is a concrete scaling, organizational, reliability, or deployment reason.
