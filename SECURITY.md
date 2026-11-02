# Security Policy

## Scope

This project is an experimental browser extension that modifies a specific response from Google Flow. It is not a security product and cannot guarantee the safety or availability of Google's service.

## Reporting a vulnerability

Please report security issues privately to the repository maintainer rather than posting exploit details publicly. If the repository does not provide a private reporting channel, open a minimal issue asking for a secure contact method.

Never include passwords, cookies, authorization headers, tokens, personal data, or unredacted network captures in an issue.

## Security design

- Host access is limited to `https://flow.google.com/*`.
- No external server or remote script is required.
- The extension does not ask for Google credentials.
- The extension's source code is available for inspection.
