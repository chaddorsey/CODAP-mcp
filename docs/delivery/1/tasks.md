# Tasks for PBI 1: Vercel Relay for Browser-LLM Sessions

This document lists all tasks associated with PBI 1.

**Parent PBI**: [PBI 1: Vercel Relay for Browser-LLM Sessions](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| :------ | :--------------------------------------- | :------- | :--------------------------------- |
| 1-1 | [Draft relay architecture & API design](./1-1.md) | Done | Create design doc and endpoint spec |
| 1-2 | [Implement session creation endpoint](./1-2.md) | Done | Edge Function `POST /api/sessions` with KV storage |
| 1-3 | [Implement SSE stream endpoint](./1-3.md) | Done | `GET /stream` SSE delivering tool requests |
| 1-4 | [Implement request/response endpoints & KV](./1-4.md) | Proposed | `POST /request`, `POST /response` with storage & rate limit |
| 1-5 | [Integration tests for relay happy path](./1-5.md) | Proposed | Jest + supertest tests covering full round-trip | 