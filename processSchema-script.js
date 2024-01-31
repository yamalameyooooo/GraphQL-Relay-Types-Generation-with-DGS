const fs = require('fs');
const path = require('path');

const schemaPath = 'schemaPath/schema.graphqls';
const schemaProcessedPath = 'schemaPath/processedSchema.graphqls';

// Read the schema file
const schema = fs.readFileSync(schemaPath, 'utf8');
console.log('Generating Relay Pagination Types for type having @connection directive...');

// Define the directive to be added
// Get this value if @connection directive is present in any type in the schema file from UI
const PageInfoCustomDirective = '@cacheControl(maxAge: 30) @shareable @tag(name: "public")';

// Function to generate PageInfo with PageInfoCustomDirective
function generatePageInfo(PageInfoCustomDirective) {
  return `
type PageInfo ${PageInfoCustomDirective}{
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}`;
}

// Function to generate Connection types for a type with @connection
function generateConnectionTypes(typeName, connectionTypeCustomDirective) {
  return `
type ${typeName}Connection ${connectionTypeCustomDirective}{
  edges: [${typeName}Edge]
  pageInfo: PageInfo!
}

type ${typeName}Edge ${connectionTypeCustomDirective}{
  node: ${typeName}
  cursor: String!
}`;
}

// Function to return an array of lines containing line which has @connection directive
function extractConnectionDirectiveLines(schemaString) {
  const lines = schemaString.split('\n');
  const connectionDirectiveLines = [];

  lines.forEach((line, lineNumber) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('type') && trimmedLine.includes('@connection')) {
      connectionDirectiveLines.push({ lineNumber, content: trimmedLine });
    }
  });

  return connectionDirectiveLines;
}

// Function to extract typeName and connectionTypeCustomDirective
function extractTypeNameAndDirectives(line) {
  const typeRegex = /^type\s+([A-Za-z_][A-Za-z0-9_]*)/;
  const openingBraceIndex = line.indexOf('{');

  const typeMatch = line.match(typeRegex);

  if (typeMatch && typeMatch[1] && openingBraceIndex !== -1) {
    const typeName = typeMatch[1].trim();
    let connectionTypeCustomDirective = line.substring(typeMatch[0].length, openingBraceIndex).trim();

    // Remove '@connection' from connectionTypeCustomDirective
    connectionTypeCustomDirective = connectionTypeCustomDirective.replace(/@connection/g, '').trim();

    return { typeName, connectionTypeCustomDirective };
  }

  return null;
}

// Function to generate All Relay pagination types present in the original schema file
function generateAllConnectionTypes(){
    var generatedAllConnectionTypes = '';
    //extract lines which starts with 'type' and has '@connection' in the line and save it an array
    const connectionDirectiveLines = extractConnectionDirectiveLines(schema);

    connectionDirectiveLines.forEach(({ lineNumber, content }) => {
      console.log(`Found @connection types defined at Line ${lineNumber + 1}: `+content)
      const extractedTypeAndDirectives = extractTypeNameAndDirectives(content);
      generatedAllConnectionTypes = generatedAllConnectionTypes + generateConnectionTypes(extractedTypeAndDirectives.typeName, extractedTypeAndDirectives.connectionTypeCustomDirective)+ '\n';
    });

    // If @connection directive exists in any type then only PageInfo with PageInfoCustomDirective
    if(connectionDirectiveLines.length > 0){
        generatedAllConnectionTypes = generatedAllConnectionTypes + generatePageInfo(PageInfoCustomDirective);
        console.log(`Generated Relay connection types: ${generatedAllConnectionTypes}`)
        console.log('\nGenerated Connection types and custom directives to the schema file');
        const modifiedSchema = schema + '\n' + generatedAllConnectionTypes;
    } else {
        console.log('No Connection type found in the schema');
    }


    return generatedAllConnectionTypes;
}

// Creation of modified schema
const modifiedSchema = schema + '\n' + generateAllConnectionTypes();

// Write the updated schema to the processedSchema.graphqls file
fs.writeFileSync(schemaProcessedPath, modifiedSchema, 'utf8');