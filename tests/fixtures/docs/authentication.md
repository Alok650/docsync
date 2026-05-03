# Authentication

This document describes the authentication system.

## Login Flow

The `processLogin` function accepts a username and password and returns a boolean indicating success.
Call `validateToken` to verify an existing session token before making authenticated requests.

## Error Handling

`AuthError` is thrown when authentication fails. Catch it to handle invalid credentials gracefully.

## Configuration

Use `AuthConfig` to control token expiry and retry limits.
