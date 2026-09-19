# Security notes

ReportFlow is a static client-side demo. Uploaded CSV files are processed in the browser and are not sent to an application backend.

## Current protections

- CSV-controlled values are rendered through DOM text nodes rather than HTML injection sinks.
- A restrictive Content Security Policy allows scripts only from the same origin and blocks plugins/objects.
- CSV exports neutralize spreadsheet-formula prefixes such as =, +, - and @ and safely restore them on re-import.
- CSV parsing is limited to 5 MB, 10,000 rows, 100 columns and 10,000 characters per field.
- Numeric parsing rejects non-finite values.
- No eval, new Function or server-side execution is used.

## Important limitations

The CSP is delivered through a meta tag because this demo is hosted on GitHub Pages. A production deployment should enforce CSP and other security headers at the HTTP layer.

This project is a portfolio demo, not a security-audited reporting platform.
