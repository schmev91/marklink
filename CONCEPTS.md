# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Delimiter

The character or sequence that separates fields in structured text data. In MarkLink, the active delimiter drives parsing, validation, keyboard behavior (Tab key), file I/O, and persistence. Per-document setting, not global. Default: comma (`,`) for CSV format; tab (`\t`) for TSV format.

## Registry Pattern

Architectural approach of creating a single, immutable source of truth for configuration that multiple modules reference. In MarkLink, the `CsvDelimiters` registry provides all delimiter metadata (character, label, file extension, MIME type) so that parsing, toolbar UI, file download, and persistence remain synchronized without scattered magic strings.

## CSV (Comma-Separated Values)

Text format where fields are separated by commas. Default format in MarkLink's CSV editor. Persisted as `.csv` files with MIME type `text/csv`.

## TSV (Tab-Separated Values)

Text format where fields are separated by tab characters. Supported in MarkLink's CSV editor via the delimiter registry and parameterized parsers. Persisted as `.tsv` files with MIME type `text/tab-separated-values`.

## Per-Document Persistence

Scope of configuration that is stored and restored for each individual saved document or autosave slot. In MarkLink, delimiter choice is per-document, not a global user preference — reopening a saved TSV file restores its TSV delimiter even if the toolbar was last left on CSV.

## Parsing

Process of reading structured text (CSV/TSV/other delimited formats) and converting it into a 2D array of rows and columns. In MarkLink, parsing is parameterized to accept a delimiter character, enabling the same parser logic to handle both CSV and TSV with different delimiters.
