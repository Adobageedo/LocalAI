# Templates Directory

Place your Word document templates (`.docx` files) in this directory.

## Template Syntax

Templates use Docxtemplater syntax for placeholders.

### Simple Variables: `{variableName}`

### Arrays (Loops):
```
{#arrayName}
Item: {itemProperty}
{/arrayName}
```

### Nested Objects: `{object.property}`

## Default Template

Default template: `pdp_template.docx`

## Creating Templates

1. Create Word document
2. Add `{placeholder}` syntax
3. Save as `.docx`
4. Place in this directory
5. Reference by filename

## Testing

Use `list_templates` tool to verify templates are detected.
